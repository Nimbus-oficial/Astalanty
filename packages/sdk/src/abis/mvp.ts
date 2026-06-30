import type { InterfaceAbi } from "ethers";

export const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event AUSDMinted(address indexed to, uint256 amount, address indexed operator)",
  "event MockUSDCMinted(address indexed to, uint256 amount, address indexed operator)"
] as const satisfies InterfaceAbi;

export const SMART_ACCOUNT_ABI = [
  "function owner() view returns (address)",
  "function execute(address target, uint256 value, bytes data)",
  "event SmartAccountExecuted(address indexed account, address indexed target, uint256 value, bytes32 callHash)"
] as const satisfies InterfaceAbi;

export const SMART_ACCOUNT_FACTORY_ABI = [
  "function createAccount(address owner, address recoveryGuardian) returns (address)",
  "function getAccount(address owner) view returns (address)",
  "function accountOfOwner(address owner) view returns (address)",
  "event SmartAccountCreated(address indexed account, address indexed owner, bytes32 indexed salt)"
] as const satisfies InterfaceAbi;

export const FEE_MANAGER_ABI = [
  "function usdcToAusdRate() view returns (uint256)",
  "function baseGasMarkupBps() view returns (uint256)",
  "function minAusdFee() view returns (uint256)",
  "function maxAusdFee() view returns (uint256)",
  "function treasury() view returns (address)",
  "function authorizedPaymaster() view returns (address)",
  "function quoteFeeView((address account,address payer,uint256 verificationGasLimit,uint256 callGasLimit,uint256 preVerificationGas,uint256 maxFeePerGas) request) view returns ((uint256 gasLimit,uint256 gasFeeWei,uint256 ausdFee,uint256 mockUsdcRequired,uint256 rate))",
  "event FeeSettled(bytes32 indexed operationId, address indexed payer, uint256 mockUsdcPaid, uint256 ausdSettled, address indexed paymaster)"
] as const satisfies InterfaceAbi;

export const PAYMASTER_ABI = [
  "function sponsorDemoOperation(bytes32 userOpHash,address account,address payer,uint256 verificationGasLimit,uint256 callGasLimit,uint256 preVerificationGas,uint256 maxFeePerGas) returns (uint256 mockUsdcPaid, uint256 ausdSettled)",
  "event PaymasterValidationStarted(bytes32 indexed operationId, address indexed account, address indexed payer)",
  "event PaymasterPaymentReceived(bytes32 indexed operationId, address indexed payer, uint256 mockUsdcAmount)",
  "event PaymasterFeeSettled(bytes32 indexed operationId, uint256 ausdSettled)"
] as const satisfies InterfaceAbi;
