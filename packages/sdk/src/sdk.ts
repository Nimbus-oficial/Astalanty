import { ZeroAddress } from "ethers";
import type { Contract, EventLog, Log, Provider, Signer } from "ethers";
import { ERC20_ABI, FEE_MANAGER_ABI, PAYMASTER_ABI, SMART_ACCOUNT_ABI, SMART_ACCOUNT_FACTORY_ABI } from "./abis/mvp.js";
import { AstalantySDKError, toAstalantyError } from "./errors.js";
import {
  computeOperationId,
  contract,
  createDemoUserOpHash,
  createReadProvider,
  formatBalance,
  mapFeeQuote,
  normalizeAddress,
  requireProvider,
  requireSigner,
  resolveSigner,
  toBigIntValue,
  validateConfig
} from "./utils.js";
import type {
  ApprovePaymasterOptions,
  ApprovePaymasterResult,
  AstalantyEvent,
  AstalantyEventName,
  AstalantyProvider,
  AstalantySDKConfig,
  AstalantyWallet,
  CreateSmartAccountOptions,
  EventQueryOptions,
  FeeManagerParameters,
  FeeQuote,
  SmartAccountResult,
  SponsoredTransactionOptions,
  SponsoredTransactionResult,
  TokenBalance
} from "./types.js";

const DEFAULT_APPROVAL = 1_000_000_000n;
const DEFAULT_VERIFICATION_GAS_LIMIT = 80_000n;
const DEFAULT_CALL_GAS_LIMIT = 120_000n;
const DEFAULT_PRE_VERIFICATION_GAS = 25_000n;
const DEFAULT_MAX_FEE_PER_GAS = 1_000_000_000n;

/** Official TypeScript SDK for the Astalanty MVP economic core. */
export class AstalantySDK {
  public readonly config: AstalantySDKConfig;
  private readonly readProvider: Provider | undefined;
  private signer: Signer | undefined;
  private connectedAddress: string | undefined;
  private activeSmartAccount: string | undefined;

  constructor(config: AstalantySDKConfig) {
    validateConfig(config);
    this.config = config;
    this.readProvider = createReadProvider(config);
    this.activeSmartAccount = config.contracts.smartAccount;
  }

  /** Returns the active read provider, if one is configured or available through the wallet. */
  public get provider(): AstalantyProvider | undefined {
    return this.signer?.provider ?? this.readProvider;
  }

  /** Returns the connected externally owned account address. */
  public get account(): string | undefined {
    return this.connectedAddress;
  }

  /** Returns the currently selected Smart Account address. */
  public get smartAccount(): string | undefined {
    return this.activeSmartAccount;
  }

  /** Connects the SDK to an ethers Signer or browser EIP-1193 wallet such as MetaMask. */
  public async connect(wallet: AstalantyWallet): Promise<string> {
    this.signer = await resolveSigner(wallet);
    this.connectedAddress = normalizeAddress(await this.signer.getAddress(), "wallet");
    return this.connectedAddress;
  }

  /** Reads the Smart Account registered for an owner. Returns undefined when none exists. */
  public async getSmartAccount(owner?: string): Promise<string | undefined> {
    const ownerAddress = await this.resolveOwner(owner);
    const factory = this.readContract("smartAccountFactory", SMART_ACCOUNT_FACTORY_ABI);
    const account = normalizeAddress(await callContract(factory, "accountOfOwner", ownerAddress), "smartAccount");

    if (account === ZeroAddress) {
      return undefined;
    }

    this.activeSmartAccount = account;
    return account;
  }

  /** Creates a Smart Account for the connected owner, or returns the existing account if already created. */
  public async createSmartAccount(options: CreateSmartAccountOptions = {}): Promise<SmartAccountResult> {
    const signer = requireSigner(this.signer);
    const owner = normalizeAddress(options.owner ?? (await signer.getAddress()), "owner");
    const recoveryGuardian = normalizeAddress(options.recoveryGuardian ?? owner, "recoveryGuardian");
    const existing = await this.getSmartAccount(owner);

    if (existing) {
      return {
        owner,
        smartAccount: existing,
        alreadyExisted: true
      };
    }

    try {
      const factory = this.writeContract("smartAccountFactory", SMART_ACCOUNT_FACTORY_ABI);
      const tx = await callContract(factory, "createAccount", owner, recoveryGuardian);
      const receipt = await tx.wait();
      const event = receipt?.logs
        .map((log: Log | EventLog) => parseContractLog(factory, log))
        .find((parsed: ReturnType<typeof parseContractLog>) => parsed?.name === "SmartAccountCreated");

      if (!event) {
        throw new AstalantySDKError("TRANSACTION_FAILED", "SmartAccountCreated event was not found.");
      }

      const smartAccount = normalizeAddress(String(event.args.account), "smartAccount");
      this.activeSmartAccount = smartAccount;

      return {
        owner,
        smartAccount,
        transactionHash: receipt?.hash,
        alreadyExisted: false
      };
    } catch (error) {
      throw toAstalantyError("TRANSACTION_FAILED", "Failed to create Smart Account.", error);
    }
  }

  /** Reads Mock USDC balance for an address or the active Smart Account. */
  public async getMockUSDCBalance(owner?: string): Promise<TokenBalance> {
    return this.getTokenBalance("MockUSDC", this.config.contracts.mockUsdc, owner, 6);
  }

  /** Reads AUSD balance for an address or the active Smart Account. */
  public async getAUSDBalance(owner?: string): Promise<TokenBalance> {
    return this.getTokenBalance("AUSD", this.config.contracts.ausdToken, owner, 18);
  }

  /** Approves the Paymaster to spend Mock USDC held by the Smart Account. */
  public async approvePaymaster(options: ApprovePaymasterOptions = {}): Promise<ApprovePaymasterResult> {
    const smartAccountAddress = await this.resolveSmartAccount(options.smartAccount);
    const amount = toBigIntValue(options.amount, DEFAULT_APPROVAL);
    const smartAccount = this.writeArbitraryContract(smartAccountAddress, SMART_ACCOUNT_ABI);
    const mockUsdc = this.readContract("mockUsdc", ERC20_ABI);
    const approveCalldata = mockUsdc.interface.encodeFunctionData("approve", [this.config.contracts.paymaster, amount]);

    try {
      const tx = await callContract(smartAccount, "execute", this.config.contracts.mockUsdc, 0, approveCalldata);
      const receipt = await tx.wait();

      return {
        smartAccount: smartAccountAddress,
        paymaster: this.config.contracts.paymaster,
        amount,
        transactionHash: receipt?.hash ?? tx.hash,
        receipt
      };
    } catch (error) {
      throw toAstalantyError("TRANSACTION_FAILED", "Failed to approve Paymaster.", error);
    }
  }

  /** Gets the current Fee Manager quote for a demo sponsored transaction. */
  public async quoteSponsoredTransaction(options: SponsoredTransactionOptions = {}): Promise<FeeQuote> {
    const smartAccountAddress = await this.resolveSmartAccount(options.smartAccount);
    const request = this.buildFeeRequest(smartAccountAddress, options);
    const feeManager = this.readContract("feeManager", FEE_MANAGER_ABI);
    return mapFeeQuote(await callContract(feeManager, "quoteFeeView", request));
  }

  /** Reads the Fee Manager parameters used by the MVP economic policy. */
  public async getFeeManagerParameters(): Promise<FeeManagerParameters> {
    const feeManager = this.readContract("feeManager", FEE_MANAGER_ABI);

    return {
      usdcToAusdRate: BigInt(await callContract(feeManager, "usdcToAusdRate")),
      baseGasMarkupBps: BigInt(await callContract(feeManager, "baseGasMarkupBps")),
      minAusdFee: BigInt(await callContract(feeManager, "minAusdFee")),
      maxAusdFee: BigInt(await callContract(feeManager, "maxAusdFee")),
      treasury: normalizeAddress(await callContract(feeManager, "treasury"), "treasury"),
      authorizedPaymaster: normalizeAddress(
        await callContract(feeManager, "authorizedPaymaster"),
        "authorizedPaymaster"
      )
    };
  }

  /** Executes the MVP demo sponsored transaction through Paymaster.sponsorDemoOperation. */
  public async executeSponsoredTransaction(
    options: SponsoredTransactionOptions = {}
  ): Promise<SponsoredTransactionResult> {
    const smartAccountAddress = await this.resolveSmartAccount(options.smartAccount);
    const userOpHash = options.userOpHash ?? createDemoUserOpHash(this.config.network.chainId, smartAccountAddress);
    const request = this.buildFeeRequest(smartAccountAddress, options);
    const quote = await this.quoteSponsoredTransaction({ ...options, smartAccount: smartAccountAddress, userOpHash });
    const operationId = computeOperationId(
      this.config.contracts.paymaster,
      this.config.network.chainId,
      userOpHash,
      smartAccountAddress
    );

    try {
      const paymaster = this.writeContract("paymaster", PAYMASTER_ABI);
      const tx = await callContract(
        paymaster,
        "sponsorDemoOperation",
        userOpHash,
        smartAccountAddress,
        smartAccountAddress,
        request.verificationGasLimit,
        request.callGasLimit,
        request.preVerificationGas,
        request.maxFeePerGas
      );
      const receipt = await tx.wait();

      return {
        smartAccount: smartAccountAddress,
        payer: smartAccountAddress,
        userOpHash,
        operationId,
        quote,
        transactionHash: receipt?.hash ?? tx.hash,
        receipt
      };
    } catch (error) {
      throw toAstalantyError("TRANSACTION_FAILED", "Failed to execute sponsored transaction.", error);
    }
  }

  /** Queries the principal MVP events and normalizes them for UI use. */
  public async getEvents(options: EventQueryOptions): Promise<AstalantyEvent[]> {
    const eventTarget = this.eventTarget(options.event);
    const instance = this.readArbitraryContract(eventTarget.address, eventTarget.abi);
    const filterFactory = instance.filters[options.event];
    if (!filterFactory) {
      throw new AstalantySDKError("UNSUPPORTED_OPERATION", `Unsupported event: ${options.event}`);
    }

    const logs = await instance.queryFilter(
      filterFactory(),
      options.fromBlock ?? 0,
      options.toBlock ?? "latest"
    );

    return logs.map((log) => {
      const eventLog = log as EventLog;
      return {
        event: options.event,
        contract: eventTarget.contract,
        address: eventTarget.address,
        blockNumber: eventLog.blockNumber,
        transactionHash: eventLog.transactionHash,
        args: { ...eventLog.args.toObject() }
      };
    });
  }

  private async getTokenBalance(
    token: "MockUSDC" | "AUSD",
    tokenAddress: string,
    owner: string | undefined,
    fallbackDecimals: number
  ): Promise<TokenBalance> {
    const ownerAddress = owner ? normalizeAddress(owner, "owner") : await this.resolveSmartAccount();
    const instance = this.readArbitraryContract(tokenAddress, ERC20_ABI);
    const raw = BigInt(await callContract(instance, "balanceOf", ownerAddress));
    const decimals = Number(await callContract(instance, "decimals").catch(() => fallbackDecimals));

    return {
      token,
      owner: ownerAddress,
      raw,
      decimals,
      formatted: formatBalance(raw, decimals)
    };
  }

  private buildFeeRequest(smartAccount: string, options: SponsoredTransactionOptions) {
    return {
      account: smartAccount,
      payer: smartAccount,
      verificationGasLimit: toBigIntValue(options.verificationGasLimit, DEFAULT_VERIFICATION_GAS_LIMIT),
      callGasLimit: toBigIntValue(options.callGasLimit, DEFAULT_CALL_GAS_LIMIT),
      preVerificationGas: toBigIntValue(options.preVerificationGas, DEFAULT_PRE_VERIFICATION_GAS),
      maxFeePerGas: toBigIntValue(options.maxFeePerGas, DEFAULT_MAX_FEE_PER_GAS)
    };
  }

  private async resolveOwner(owner?: string): Promise<string> {
    if (owner) {
      return normalizeAddress(owner, "owner");
    }
    if (this.connectedAddress) {
      return this.connectedAddress;
    }

    const signer = requireSigner(this.signer);
    return normalizeAddress(await signer.getAddress(), "owner");
  }

  private async resolveSmartAccount(address?: string): Promise<string> {
    if (address) {
      return normalizeAddress(address, "smartAccount");
    }
    if (this.activeSmartAccount) {
      return normalizeAddress(this.activeSmartAccount, "smartAccount");
    }

    const discovered = await this.getSmartAccount();
    if (!discovered) {
      throw new AstalantySDKError(
        "SMART_ACCOUNT_NOT_FOUND",
        "No Smart Account configured or registered. Call createSmartAccount first."
      );
    }

    return discovered;
  }

  private readContract(name: keyof AstalantySDKConfig["contracts"], abi: readonly string[]): Contract {
    return this.readArbitraryContract(this.config.contracts[name] as string, abi);
  }

  private readArbitraryContract(address: string, abi: readonly string[]): Contract {
    return contract(address, abi, requireProvider(this.readProvider, this.signer));
  }

  private writeContract(name: keyof AstalantySDKConfig["contracts"], abi: readonly string[]): Contract {
    return this.writeArbitraryContract(this.config.contracts[name] as string, abi);
  }

  private writeArbitraryContract(address: string, abi: readonly string[]): Contract {
    return contract(address, abi, requireSigner(this.signer));
  }

  private eventTarget(event: AstalantyEventName): {
    contract: AstalantyEvent["contract"];
    address: string;
    abi: readonly string[];
  } {
    switch (event) {
      case "SmartAccountCreated":
        return {
          contract: "smartAccountFactory",
          address: this.config.contracts.smartAccountFactory,
          abi: SMART_ACCOUNT_FACTORY_ABI
        };
      case "SmartAccountExecuted":
        if (!this.activeSmartAccount) {
          throw new AstalantySDKError("SMART_ACCOUNT_NOT_FOUND", "Set or create a Smart Account before querying its events.");
        }
        return {
          contract: "smartAccount",
          address: this.activeSmartAccount,
          abi: SMART_ACCOUNT_ABI
        };
      case "PaymasterValidationStarted":
      case "PaymasterPaymentReceived":
      case "PaymasterFeeSettled":
        return {
          contract: "paymaster",
          address: this.config.contracts.paymaster,
          abi: PAYMASTER_ABI
        };
      case "FeeSettled":
        return {
          contract: "feeManager",
          address: this.config.contracts.feeManager,
          abi: FEE_MANAGER_ABI
        };
      case "AUSDMinted":
        return {
          contract: "ausdToken",
          address: this.config.contracts.ausdToken,
          abi: ERC20_ABI
        };
      case "MockUSDCMinted":
        return {
          contract: "mockUsdc",
          address: this.config.contracts.mockUsdc,
          abi: ERC20_ABI
        };
      default:
        throw new AstalantySDKError("UNSUPPORTED_OPERATION", `Unsupported event: ${event satisfies never}`);
    }
  }
}

function parseContractLog(instance: Contract, log: unknown) {
  try {
    return instance.interface.parseLog(log as { topics: string[]; data: string });
  } catch {
    return null;
  }
}

function callContract(instance: Contract, method: string, ...args: unknown[]) {
  const fn = instance.getFunction(method);
  return fn(...args);
}
