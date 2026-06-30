import { AbiCoder, BrowserProvider, Contract, JsonRpcProvider, formatUnits, getAddress, isAddress, keccak256, toBeHex } from "ethers";
import type { Eip1193Provider, Provider, Signer } from "ethers";
import { AstalantySDKError } from "./errors.js";
import type { AstalantySDKConfig, AstalantyWallet, FeeQuote } from "./types.js";

export function normalizeAddress(value: string, fieldName: string): string {
  const resolved = String(value);
  if (!isAddress(resolved)) {
    throw new AstalantySDKError("INVALID_ADDRESS", `${fieldName} is not a valid EVM address.`);
  }

  return getAddress(resolved);
}

export function validateConfig(config: AstalantySDKConfig): void {
  if (!config.network.name) {
    throw new AstalantySDKError("INVALID_CONFIG", "network.name is required.");
  }
  if (config.network.chainId <= 0n) {
    throw new AstalantySDKError("INVALID_CONFIG", "network.chainId must be positive.");
  }

  normalizeAddress(config.contracts.mockUsdc, "contracts.mockUsdc");
  normalizeAddress(config.contracts.ausdToken, "contracts.ausdToken");
  normalizeAddress(config.contracts.feeManager, "contracts.feeManager");
  normalizeAddress(config.contracts.paymaster, "contracts.paymaster");
  normalizeAddress(config.contracts.smartAccountFactory, "contracts.smartAccountFactory");
  if (config.contracts.smartAccount) {
    normalizeAddress(config.contracts.smartAccount, "contracts.smartAccount");
  }
}

export function createReadProvider(config: AstalantySDKConfig): Provider | undefined {
  if (!config.network.rpcUrl) {
    return undefined;
  }

  return new JsonRpcProvider(config.network.rpcUrl, Number(config.network.chainId));
}

export async function resolveSigner(wallet: AstalantyWallet): Promise<Signer> {
  const maybeSigner = wallet as Signer;
  if (typeof maybeSigner.getAddress === "function" && maybeSigner.provider) {
    return maybeSigner;
  }

  const browserProvider = new BrowserProvider(wallet as Eip1193Provider);
  await browserProvider.send("eth_requestAccounts", []);
  return browserProvider.getSigner();
}

export function requireSigner(signer: Signer | undefined): Signer {
  if (!signer) {
    throw new AstalantySDKError("WALLET_NOT_CONNECTED", "Call sdk.connect(wallet) before sending transactions.");
  }

  return signer;
}

export function requireProvider(provider: Provider | undefined, signer?: Signer): Provider {
  const activeProvider = signer?.provider ?? provider;
  if (!activeProvider) {
    throw new AstalantySDKError(
      "INVALID_CONFIG",
      "A read provider is required. Set network.rpcUrl or connect a wallet."
    );
  }

  return activeProvider;
}

export function contract(address: string, abi: readonly string[], runner: Provider | Signer): Contract {
  return new Contract(address, abi, runner);
}

export function formatBalance(raw: bigint, decimals: number): string {
  return formatUnits(raw, decimals);
}

export function mapFeeQuote(quote: unknown): FeeQuote {
  const tuple = quote as readonly bigint[];
  return {
    gasLimit: tuple[0] ?? 0n,
    gasFeeWei: tuple[1] ?? 0n,
    ausdFee: tuple[2] ?? 0n,
    mockUsdcRequired: tuple[3] ?? 0n,
    rate: tuple[4] ?? 0n
  };
}

export function computeOperationId(paymaster: string, chainId: bigint, userOpHash: string, account: string): string {
  const encoded = AbiCoder.defaultAbiCoder().encode(
    ["address", "uint256", "bytes32", "address", "address"],
    [paymaster, chainId, userOpHash, account, account]
  );
  return keccak256(encoded);
}

export function createDemoUserOpHash(chainId: bigint, account: string): string {
  return keccak256(
    AbiCoder.defaultAbiCoder().encode(
      ["string", "uint256", "address", "uint256"],
      ["ASTALANTY_SDK_DEMO", chainId, account, BigInt(Date.now())]
    )
  );
}

export function toBigIntValue(value: unknown, fallback: bigint): bigint {
  if (value === undefined || value === null) {
    return fallback;
  }
  return BigInt(value as string | number | bigint);
}

export function toBytes32(value: string): string {
  if (/^0x[0-9a-fA-F]{64}$/.test(value)) {
    return value;
  }
  return toBeHex(BigInt(value), 32);
}
