import type { BigNumberish, ContractTransactionReceipt, Eip1193Provider, Provider, Signer } from "ethers";

/** Contract addresses required by the MVP SDK. */
export interface AstalantyContractAddresses {
  readonly mockUsdc: string;
  readonly ausdToken: string;
  readonly feeManager: string;
  readonly paymaster: string;
  readonly smartAccountFactory: string;
  readonly smartAccount?: string;
}

/** Network metadata used by dapps and logs. */
export interface AstalantyNetworkConfig {
  readonly name: string;
  readonly chainId: bigint;
  readonly rpcUrl?: string;
}

/** SDK initialization config. */
export interface AstalantySDKConfig {
  readonly network: AstalantyNetworkConfig;
  readonly contracts: AstalantyContractAddresses;
}

/** Supported wallet input. */
export type AstalantyWallet = Signer | Eip1193Provider;

/** Balance result in raw units and formatted decimal string. */
export interface TokenBalance {
  readonly token: "MockUSDC" | "AUSD";
  readonly owner: string;
  readonly raw: bigint;
  readonly decimals: number;
  readonly formatted: string;
}

/** Parameters for creating a Smart Account. */
export interface CreateSmartAccountOptions {
  readonly owner?: string;
  readonly recoveryGuardian?: string;
}

/** Smart Account creation result. */
export interface SmartAccountResult {
  readonly owner: string;
  readonly smartAccount: string;
  readonly transactionHash?: string;
  readonly alreadyExisted: boolean;
}

/** Parameters for approving the Paymaster to spend Mock USDC from the Smart Account. */
export interface ApprovePaymasterOptions {
  readonly amount?: BigNumberish;
  readonly smartAccount?: string;
}

/** Result of a token approval performed through Smart Account execution. */
export interface ApprovePaymasterResult {
  readonly smartAccount: string;
  readonly paymaster: string;
  readonly amount: bigint;
  readonly transactionHash: string;
  readonly receipt: ContractTransactionReceipt | null;
}

/** Parameters for a demo sponsored transaction. */
export interface SponsoredTransactionOptions {
  readonly userOpHash?: string;
  readonly smartAccount?: string;
  readonly verificationGasLimit?: BigNumberish;
  readonly callGasLimit?: BigNumberish;
  readonly preVerificationGas?: BigNumberish;
  readonly maxFeePerGas?: BigNumberish;
}

/** Fee quote returned by Fee Manager. */
export interface FeeQuote {
  readonly gasLimit: bigint;
  readonly gasFeeWei: bigint;
  readonly ausdFee: bigint;
  readonly mockUsdcRequired: bigint;
  readonly rate: bigint;
}

/** Current Fee Manager policy and treasury wiring. */
export interface FeeManagerParameters {
  readonly usdcToAusdRate: bigint;
  readonly baseGasMarkupBps: bigint;
  readonly minAusdFee: bigint;
  readonly maxAusdFee: bigint;
  readonly treasury: string;
  readonly authorizedPaymaster: string;
}

/** Result of Paymaster sponsorDemoOperation. */
export interface SponsoredTransactionResult {
  readonly smartAccount: string;
  readonly payer: string;
  readonly userOpHash: string;
  readonly operationId: string;
  readonly quote: FeeQuote;
  readonly transactionHash: string;
  readonly receipt: ContractTransactionReceipt | null;
}

/** Supported event groups exposed by the SDK. */
export type AstalantyEventName =
  | "SmartAccountCreated"
  | "SmartAccountExecuted"
  | "PaymasterValidationStarted"
  | "PaymasterPaymentReceived"
  | "PaymasterFeeSettled"
  | "FeeSettled"
  | "AUSDMinted"
  | "MockUSDCMinted";

/** Event query options. */
export interface EventQueryOptions {
  readonly event: AstalantyEventName;
  readonly fromBlock?: number;
  readonly toBlock?: number | "latest";
}

/** Normalized event shape for front-end consumption. */
export interface AstalantyEvent {
  readonly event: AstalantyEventName;
  readonly contract: keyof AstalantyContractAddresses | "smartAccount";
  readonly address: string;
  readonly blockNumber: number;
  readonly transactionHash: string;
  readonly args: Record<string, unknown>;
}

/** Minimal deployment JSON shape accepted by fromDeployment. */
export interface AstalantyDeploymentFile {
  readonly network: string;
  readonly chainId: string | number | bigint;
  readonly contracts: {
    readonly MockUSDC: string;
    readonly AUSDToken: string;
    readonly AstalantyFeeManager: string;
    readonly AstalantyPaymaster: string;
    readonly AstalantySmartAccountFactory: string;
    readonly AstalantySmartAccount?: string;
  };
}

export type AstalantyProvider = Provider;
