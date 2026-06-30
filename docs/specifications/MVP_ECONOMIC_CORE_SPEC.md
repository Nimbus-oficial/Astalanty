# Astalanty MVP Economic Core Specification

## Status

Frozen for MVP implementation.

## Objective

Define the minimum technical core required to demonstrate Astalanty's economic innovation in a technical MVP.

The MVP demonstrates a user submitting an operation through the Front-End and TypeScript SDK, executed by a Smart Account through an Account Abstraction Paymaster, with Mock USDC collected from the user, converted by policy into AUSD, settled through the Fee Manager and used to pay gas.

This document intentionally excludes all non-essential platform modules.

## Source of Truth

This specification follows the approved ADRs:

- ADR-0001: Arbitrum Orbit.
- ADR-0002: AnyTrust.
- ADR-0003: Modular Architecture.
- ADR-0004: TypeScript SDK as canonical client.
- ADR-0005: Self-custody.
- ADR-0006: Official APIs as high-level public service boundary.
- ADR-0007: AI-assisted implementation under documentation constraints.

## MVP Simplification

For the MVP, the economic core may temporarily combine operational responsibilities that are separate in the final architecture, as long as public interfaces remain compatible with v1.0.

Approved MVP simplifications:

- AUSD is an ERC-20 testnet token, not the native Orbit gas token.
- Mock USDC is an ERC-20 testnet token used only to demonstrate user-facing payment.
- Fee Manager performs deterministic Mock USDC to AUSD conversion using an admin-configured fixed rate.
- Paymaster is the only component allowed to call Fee Manager settlement during user operation validation.
- Treasury may be represented by a configured treasury address.
- Recovery is implemented as owner replacement through an authorized recovery guardian for MVP demonstration.
- For MVP safety, the Paymaster only accepts operations where `payer == account`.

These simplifications preserve the final architecture because AUSD, Fee Manager, Paymaster and Smart Account remain modular and can be extended without changing the MVP public flow.

---

# Components

## 1. AUSD

### Responsibility

AUSD is the MVP fee settlement token.

It represents the internal technical asset used by Fee Manager and Paymaster to settle gas-related value.

### Contract

`AUSDToken`

### Standard

ERC-20 compatible.

### Decimals

18 decimals.

### States

The contract has no complex lifecycle state.

Token balances represent settlement state.

Administrative state:

- `owner`: administrative owner.
- `minters`: addresses allowed to mint.
- `burners`: addresses allowed to burn, if enabled.
- `paused`: whether transfers and minting are paused.

### Permissions

Owner may:

- add minter;
- remove minter;
- add burner;
- remove burner;
- pause;
- unpause;
- transfer ownership.

Minter may:

- mint AUSD to an address.

Burner may:

- burn AUSD from an address, if allowance or role permits.

Users may:

- transfer;
- approve;
- transferFrom.

### Public Functions

```solidity
function mint(address to, uint256 amount) external;
function burn(address from, uint256 amount) external;
function pause() external;
function unpause() external;
function setMinter(address account, bool enabled) external;
function setBurner(address account, bool enabled) external;
function isMinter(address account) external view returns (bool);
function isBurner(address account) external view returns (bool);
```

ERC-20 functions are inherited:

```solidity
function name() external view returns (string memory);
function symbol() external view returns (string memory);
function decimals() external view returns (uint8);
function totalSupply() external view returns (uint256);
function balanceOf(address account) external view returns (uint256);
function transfer(address to, uint256 amount) external returns (bool);
function approve(address spender, uint256 amount) external returns (bool);
function allowance(address owner, address spender) external view returns (uint256);
function transferFrom(address from, address to, uint256 amount) external returns (bool);
```

### Events

ERC-20:

```solidity
event Transfer(address indexed from, address indexed to, uint256 value);
event Approval(address indexed owner, address indexed spender, uint256 value);
```

Astalanty-specific:

```solidity
event MinterUpdated(address indexed account, bool enabled);
event BurnerUpdated(address indexed account, bool enabled);
event AUSDPaused(address indexed operator);
event AUSDUnpaused(address indexed operator);
event AUSDMinted(address indexed to, uint256 amount, address indexed operator);
event AUSDBurned(address indexed from, uint256 amount, address indexed operator);
```

### Errors

```solidity
error Unauthorized();
error TokenPaused();
error InvalidAddress();
error InvalidAmount();
```

### Emission Flow

1. Owner authorizes Fee Manager or deployer as minter.
2. Minter mints initial testnet liquidity to treasury, Paymaster or demo accounts.
3. Fee Manager may mint or transfer AUSD according to MVP conversion policy.
4. Paymaster uses AUSD balance or settlement record to pay gas-related costs.

### Utilization Flow

1. User pays Mock USDC.
2. Fee Manager calculates AUSD equivalent.
3. Fee Manager settles AUSD to Paymaster or Treasury.
4. Paymaster sponsors the user operation.

---

## 2. Fee Manager

### Responsibility

Fee Manager is the deterministic policy engine for MVP gas charging and Mock USDC to AUSD conversion.

It must not execute user operations.

It must not own Smart Accounts.

It must not authenticate users.

### Contract

`AstalantyFeeManager`

### Dependencies

- `AUSDToken`.
- `MockUSDC`.
- Treasury address.
- Authorized Paymaster address.

### State

```solidity
address public owner;
address public ausd;
address public mockUsdc;
address public treasury;
address public authorizedPaymaster;
uint256 public usdcToAusdRate;
uint256 public baseGasMarkupBps;
uint256 public minAusdFee;
uint256 public maxAusdFee;
bool public paused;
mapping(bytes32 => bool) public settledOperations;
```

### Rate Policy

`usdcToAusdRate` is expressed with 18 decimals.

For MVP:

```text
ausdAmount = mockUsdcAmount * usdcToAusdRate / 1e18
```

Default demo rate:

```text
1 Mock USDC = 1 AUSD
```

### Gas Calculation

Inputs:

- `verificationGasLimit`.
- `callGasLimit`.
- `preVerificationGas`.
- `maxFeePerGas`.
- `baseGasMarkupBps`.

Formula:

```text
gasLimit = verificationGasLimit + callGasLimit + preVerificationGas
rawFee = gasLimit * maxFeePerGas
markedUpFee = rawFee + (rawFee * baseGasMarkupBps / 10000)
ausdFee = clamp(markedUpFee, minAusdFee, maxAusdFee)
```

For MVP demonstration, `maxFeePerGas` may be passed from the UserOperation and bounded by the Paymaster.

### Policy

The MVP uses prepaid user charging:

1. User approves Mock USDC to Paymaster.
2. Paymaster transfers Mock USDC from user or Smart Account owner.
3. Paymaster calls Fee Manager to calculate and settle AUSD.
4. Fee Manager records the operation as settled.
5. Paymaster sponsors the gas.

### Public Functions

```solidity
struct FeeQuoteRequest {
    address account;
    address payer;
    uint256 verificationGasLimit;
    uint256 callGasLimit;
    uint256 preVerificationGas;
    uint256 maxFeePerGas;
}

struct FeeQuote {
    uint256 gasLimit;
    uint256 gasFeeWei;
    uint256 ausdFee;
    uint256 mockUsdcRequired;
    uint256 rate;
}

function quoteFee(FeeQuoteRequest calldata request) external view returns (FeeQuote memory);

function settleFee(
    bytes32 operationId,
    address payer,
    uint256 mockUsdcAmount,
    FeeQuote calldata quote
) external returns (uint256 ausdSettled);

function setRate(uint256 newRate) external;
function setGasPolicy(uint256 markupBps, uint256 minFee, uint256 maxFee) external;
function setTreasury(address newTreasury) external;
function setAuthorizedPaymaster(address paymaster) external;
function pause() external;
function unpause() external;
```

### Access Control

Owner:

- set rate;
- set gas policy;
- set treasury;
- set authorized paymaster;
- pause;
- unpause.

Authorized Paymaster:

- call `settleFee`.

Anyone:

- call `quoteFee`.

### Events

```solidity
event FeeQuoted(
    address indexed account,
    address indexed payer,
    uint256 gasLimit,
    uint256 ausdFee,
    uint256 mockUsdcRequired
);

event FeeSettled(
    bytes32 indexed operationId,
    address indexed payer,
    uint256 mockUsdcPaid,
    uint256 ausdSettled,
    address indexed paymaster
);

event RateUpdated(uint256 oldRate, uint256 newRate);
event GasPolicyUpdated(uint256 markupBps, uint256 minFee, uint256 maxFee);
event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
event AuthorizedPaymasterUpdated(address indexed oldPaymaster, address indexed newPaymaster);
event FeeManagerPaused(address indexed operator);
event FeeManagerUnpaused(address indexed operator);
```

### Errors

```solidity
error Unauthorized();
error FeeManagerIsPaused();
error InvalidAddress();
error InvalidAmount();
error InvalidRate();
error FeeTooLow();
error FeeTooHigh();
error OperationAlreadySettled(bytes32 operationId);
error InvalidPaymaster();
error SettlementFailed();
```

---

## 3. Paymaster

### Responsibility

Paymaster sponsors gas for Account Abstraction user operations after validating payment through Mock USDC and settlement through Fee Manager.

### Contract

`AstalantyPaymaster`

### Account Abstraction Model

MVP uses ERC-4337-compatible flow.

Chosen implementation:

- Smart Account compatible with EntryPoint.
- Paymaster compatible with EntryPoint validation and post-operation hooks.

Justification:

- simplest way to demonstrate Account Abstraction;
- compatible with future Web3 tooling;
- auditable and modular;
- aligns with self-custody and SDK canonicity.

### Dependencies

- EntryPoint.
- Fee Manager.
- Mock USDC.
- AUSD.

### State

```solidity
address public owner;
address public entryPoint;
address public feeManager;
address public mockUsdc;
uint256 public maxCostPerOperation;
bool public paused;
mapping(bytes32 => PaymasterOperation) public operations;
```

```solidity
enum PaymasterOperationState {
    None,
    Validated,
    Settled,
    PostOpSucceeded,
    PostOpReverted,
    Refunded
}

struct PaymasterOperation {
    address account;
    address payer;
    uint256 mockUsdcPaid;
    uint256 ausdSettled;
    PaymasterOperationState state;
}
```

### Validation Flow

Inputs:

- UserOperation.
- Paymaster data containing payer, fee quote and signature/authorization if required.

Steps:

1. EntryPoint calls Paymaster validation.
2. Paymaster verifies caller is EntryPoint.
3. Paymaster verifies not paused.
4. Paymaster decodes paymaster data.
5. Paymaster computes `operationId`.
6. Paymaster verifies `payer == account`.
7. Paymaster asks Fee Manager quote or validates supplied quote.
8. Paymaster transfers Mock USDC from payer.
9. Paymaster calls Fee Manager `settleFee`.
10. Paymaster stores operation state as `Settled`.
11. Paymaster returns validation success to EntryPoint.

### Post-Operation Flow

On success:

1. EntryPoint calls Paymaster postOp.
2. Paymaster marks operation `PostOpSucceeded`.
3. Paymaster emits final event.

On reverted operation:

1. EntryPoint calls Paymaster postOp with reverted mode.
2. Paymaster marks operation `PostOpReverted`.
3. Fee remains settled because validation and gas sponsorship were consumed.
4. Event records reverted execution.

### Rollback Policy

If validation fails before Mock USDC transfer:

- no state change remains;
- operation reverts.

If Mock USDC transfer succeeds but Fee Manager settlement fails:

- entire validation transaction reverts;
- Mock USDC transfer rolls back automatically.

If user execution reverts after validation:

- gas was consumed;
- payment remains settled;
- state is `PostOpReverted`;
- no automatic refund in MVP.

### Public Functions

```solidity
function validatePaymasterUserOp(
    UserOperation calldata userOp,
    bytes32 userOpHash,
    uint256 maxCost
) external returns (bytes memory context, uint256 validationData);

function postOp(
    PostOpMode mode,
    bytes calldata context,
    uint256 actualGasCost
) external;

function depositToEntryPoint() external payable;
function withdrawFromEntryPoint(address payable to, uint256 amount) external;
function setFeeManager(address newFeeManager) external;
function setMaxCostPerOperation(uint256 maxCost) external;
function pause() external;
function unpause() external;
```

### Events

```solidity
event PaymasterValidationStarted(bytes32 indexed operationId, address indexed account, address indexed payer);
event PaymasterPaymentReceived(bytes32 indexed operationId, address indexed payer, uint256 mockUsdcAmount);
event PaymasterFeeSettled(bytes32 indexed operationId, uint256 ausdSettled);
event PaymasterPostOpSucceeded(bytes32 indexed operationId, uint256 actualGasCost);
event PaymasterPostOpReverted(bytes32 indexed operationId, uint256 actualGasCost);
event PaymasterPaused(address indexed operator);
event PaymasterUnpaused(address indexed operator);
```

### Errors

```solidity
error Unauthorized();
error PaymasterIsPaused();
error InvalidEntryPoint();
error InvalidPaymasterData();
error MaxCostExceeded();
error MockUsdcTransferFailed();
error FeeSettlementFailed();
error OperationNotFound(bytes32 operationId);
error InvalidPostOpCaller();
error InvalidPayer();
```

---

## 4. Smart Account

### Responsibility

Smart Account is the user's self-custodial programmable account for MVP execution.

### Contract

`AstalantySmartAccount`

### Factory

`AstalantySmartAccountFactory`

### Account Abstraction Model

ERC-4337-compatible minimal account.

### State

```solidity
address public owner;
address public recoveryGuardian;
address public entryPoint;
uint256 public nonce;
bool public initialized;
```

### Creation Flow

1. Front-End requests account creation through SDK.
2. SDK computes deterministic salt.
3. Factory deploys Smart Account.
4. Factory initializes owner, recovery guardian and EntryPoint.
5. Factory emits `SmartAccountCreated`.

### Initialization

Initialization is allowed exactly once.

Inputs:

- owner;
- recovery guardian;
- EntryPoint.

Validation:

- owner not zero;
- EntryPoint not zero;
- not initialized.

### Authentication

MVP authentication uses ECDSA owner signature.

Future authentication methods remain compatible through modular validation.

### Execution

Execution is called by EntryPoint after validation.

The Smart Account must support:

```solidity
function execute(address target, uint256 value, bytes calldata data) external;
function executeBatch(address[] calldata targets, uint256[] calldata values, bytes[] calldata data) external;
```

### Signature Validation

Smart Account validates UserOperation signatures using:

```text
ECDSA.recover(userOpHash, signature) == owner
```

### Recovery

MVP recovery allows a configured guardian to replace owner.

Function:

```solidity
function recoverOwner(address newOwner) external;
```

Validation:

- caller is recovery guardian;
- new owner is not zero;
- emits recovery event.

### Public Functions

```solidity
function initialize(address owner, address recoveryGuardian, address entryPoint) external;
function validateUserOp(UserOperation calldata userOp, bytes32 userOpHash, uint256 missingAccountFunds) external returns (uint256 validationData);
function execute(address target, uint256 value, bytes calldata data) external;
function executeBatch(address[] calldata targets, uint256[] calldata values, bytes[] calldata data) external;
function recoverOwner(address newOwner) external;
function setRecoveryGuardian(address newGuardian) external;
function getOwner() external view returns (address);
function getEntryPoint() external view returns (address);
```

### Events

```solidity
event SmartAccountInitialized(address indexed account, address indexed owner, address indexed entryPoint);
event SmartAccountCreated(address indexed account, address indexed owner, bytes32 indexed salt);
event SmartAccountExecuted(address indexed account, address indexed target, uint256 value, bytes32 callHash);
event SmartAccountBatchExecuted(address indexed account, uint256 calls);
event OwnerRecovered(address indexed oldOwner, address indexed newOwner, address indexed guardian);
event RecoveryGuardianUpdated(address indexed oldGuardian, address indexed newGuardian);
```

### Errors

```solidity
error AlreadyInitialized();
error Unauthorized();
error InvalidOwner();
error InvalidGuardian();
error InvalidEntryPoint();
error InvalidSignature();
error ExecutionFailed();
error InvalidBatch();
```

---

# 5. SDK TypeScript

## Responsibility

The TypeScript SDK is the canonical client used by the MVP Front-End.

It must hide Account Abstraction complexity while exposing deterministic, auditable methods.

## Package

`@astalanty/sdk`

## Public API

### Client Creation

```ts
const client = createAstalantyClient({
  chainId: 412346,
  rpcUrl: "https://testnet-rpc.astalanty.example",
  bundlerUrl: "https://testnet-bundler.astalanty.example",
  entryPoint: "0xEntryPoint",
  paymaster: "0xPaymaster",
  feeManager: "0xFeeManager",
  smartAccountFactory: "0xFactory",
  ausd: "0xAUSD",
  mockUsdc: "0xMockUSDC"
});
```

Parameters:

```ts
type AstalantyClientConfig = {
  chainId: number;
  rpcUrl: string;
  bundlerUrl: string;
  entryPoint: `0x${string}`;
  paymaster: `0x${string}`;
  feeManager: `0x${string}`;
  smartAccountFactory: `0x${string}`;
  ausd: `0x${string}`;
  mockUsdc: `0x${string}`;
};
```

### Create Smart Account

```ts
const account = await client.createSmartAccount({
  owner,
  recoveryGuardian,
  salt
});
```

Request:

```ts
type CreateSmartAccountRequest = {
  owner: `0x${string}`;
  recoveryGuardian: `0x${string}`;
  salt?: `0x${string}`;
};
```

Response:

```ts
type SmartAccountResult = {
  account: `0x${string}`;
  owner: `0x${string}`;
  recoveryGuardian: `0x${string}`;
  deployed: boolean;
  transactionHash?: `0x${string}`;
};
```

### Quote Fee

```ts
const quote = await client.quoteFee({
  account,
  payer,
  target,
  value: 0n,
  data
});
```

Response:

```ts
type FeeQuoteResult = {
  gasLimit: bigint;
  gasFeeWei: bigint;
  ausdFee: bigint;
  mockUsdcRequired: bigint;
  rate: bigint;
  expiresAt: number;
};
```

### Approve Mock USDC

```ts
await client.approveMockUsdc({
  signer,
  amount: quote.mockUsdcRequired
});
```

### Execute With Paymaster

```ts
const result = await client.executeWithPaymaster({
  smartAccount: account,
  ownerSigner,
  payer,
  target,
  value: 0n,
  data,
  quote
});
```

Request:

```ts
type ExecuteWithPaymasterRequest = {
  smartAccount: `0x${string}`;
  ownerSigner: Signer;
  payer: `0x${string}`;
  target: `0x${string}`;
  value: bigint;
  data: `0x${string}`;
  quote?: FeeQuoteResult;
};
```

Response:

```ts
type ExecuteWithPaymasterResult = {
  userOperationHash: `0x${string}`;
  transactionHash?: `0x${string}`;
  status: "submitted" | "confirmed" | "failed";
  smartAccount: `0x${string}`;
  fee: {
    mockUsdcPaid: bigint;
    ausdSettled: bigint;
  };
};
```

### Wait For Confirmation

```ts
const receipt = await client.waitForUserOperation({
  userOperationHash
});
```

Response:

```ts
type UserOperationReceipt = {
  userOperationHash: `0x${string}`;
  transactionHash: `0x${string}`;
  success: boolean;
  blockNumber: bigint;
  events: AstalantyMvpEvent[];
};
```

### Recover Owner

```ts
await client.recoverOwner({
  smartAccount,
  guardianSigner,
  newOwner
});
```

## SDK Exceptions

```ts
class AstalantySdkError extends Error {
  code: string;
  details?: unknown;
}
```

Codes:

- `INVALID_CONFIG`
- `INVALID_ADDRESS`
- `ACCOUNT_NOT_DEPLOYED`
- `INSUFFICIENT_MOCK_USDC`
- `MOCK_USDC_APPROVAL_REQUIRED`
- `FEE_QUOTE_EXPIRED`
- `PAYMASTER_REJECTED`
- `USER_OPERATION_FAILED`
- `TRANSACTION_TIMEOUT`
- `RPC_ERROR`
- `BUNDLER_ERROR`

## Complete Example

```ts
import { createAstalantyClient } from "@astalanty/sdk";

const client = createAstalantyClient(config);

const account = await client.createSmartAccount({
  owner: owner.address,
  recoveryGuardian: guardian.address
});

const quote = await client.quoteFee({
  account: account.account,
  payer: owner.address,
  target: demoContract,
  value: 0n,
  data: demoCallData
});

await client.approveMockUsdc({
  signer: owner,
  amount: quote.mockUsdcRequired
});

const operation = await client.executeWithPaymaster({
  smartAccount: account.account,
  ownerSigner: owner,
  payer: owner.address,
  target: demoContract,
  value: 0n,
  data: demoCallData,
  quote
});

const receipt = await client.waitForUserOperation({
  userOperationHash: operation.userOperationHash
});

console.log(receipt.success);
```

---

# End-to-End MVP Flow

## Step 1: User

Inputs:

- owner signer;
- Mock USDC balance;
- target transaction intent.

Outputs:

- signed UserOperation.

Validations:

- owner controls Smart Account;
- user has enough Mock USDC;
- user approved Paymaster.

Events:

- ERC-20 `Approval`.

Errors:

- insufficient balance;
- approval rejected;
- invalid signature.

## Step 2: Front-End

Inputs:

- user action;
- connected wallet;
- target contract data.

Outputs:

- SDK request.

Validations:

- chain ID;
- wallet connected;
- known contract addresses.

Errors:

- wrong network;
- missing wallet;
- invalid input.

## Step 3: SDK

Inputs:

- client config;
- owner signer;
- Smart Account address;
- target call.

Outputs:

- fee quote;
- approval transaction;
- UserOperation hash;
- receipt.

Validations:

- config complete;
- address format;
- fee quote not expired;
- Mock USDC allowance.

Events:

- none directly; SDK reads emitted contract events.

Errors:

- SDK errors listed above.

## Step 4: Smart Account

Inputs:

- UserOperation;
- signature;
- target call.

Outputs:

- validated operation;
- executed call.

Validations:

- EntryPoint caller;
- valid owner signature;
- nonce valid.

Events:

- `SmartAccountExecuted`.

Errors:

- invalid signature;
- unauthorized caller;
- execution failed.

## Step 5: Paymaster

Inputs:

- UserOperation;
- fee quote;
- payer;
- Mock USDC allowance.

Outputs:

- validation data;
- settled operation state.

Validations:

- EntryPoint caller;
- not paused;
- payer equals account;
- max cost not exceeded;
- fee settled.

Events:

- `PaymasterValidationStarted`;
- `PaymasterPaymentReceived`;
- `PaymasterFeeSettled`;
- `PaymasterPostOpSucceeded` or `PaymasterPostOpReverted`.

Errors:

- Paymaster paused;
- invalid paymaster data;
- transfer failed;
- settlement failed.

## Step 6: Fee Manager

Inputs:

- operation ID;
- payer;
- Mock USDC amount;
- fee quote.

Outputs:

- AUSD settled amount;
- operation marked as settled.

Validations:

- caller is Paymaster;
- operation not settled;
- amount valid;
- rate valid.

Events:

- `FeeQuoted`;
- `FeeSettled`.

Errors:

- unauthorized;
- operation already settled;
- invalid rate;
- settlement failed.

## Step 7: AUSD

Inputs:

- mint or transfer instruction from authorized component.

Outputs:

- AUSD balance update.

Validations:

- caller has minter or transfer permission;
- not paused;
- amount valid.

Events:

- `Transfer`;
- `AUSDMinted` when minting is used.

Errors:

- unauthorized;
- paused;
- invalid amount.

## Step 8: Transaction Execution

Inputs:

- validated UserOperation.

Outputs:

- target contract state transition or revert.

Validations:

- EntryPoint execution rules;
- Smart Account execution authorization.

Events:

- target contract events;
- Smart Account execution event.

Errors:

- target call failed;
- postOp reverted.

## Step 9: Confirmation

Inputs:

- UserOperation hash.

Outputs:

- receipt;
- transaction hash;
- status;
- fee information.

Validations:

- operation included;
- receipt available;
- events decoded.

Errors:

- timeout;
- operation failed;
- receipt unavailable.

---

# Implementation Checklist

## Contracts

- [ ] Implement `MockUSDC` test token.
- [ ] Implement `AUSDToken`.
- [ ] Implement `AstalantyFeeManager`.
- [ ] Implement `AstalantyPaymaster`.
- [ ] Implement `AstalantySmartAccount`.
- [ ] Implement `AstalantySmartAccountFactory`.
- [ ] Add Solidity interfaces.
- [ ] Add deployment script for local/testnet.
- [ ] Add event tests.
- [ ] Add access control tests.
- [ ] Add failure path tests.
- [ ] Add full E2E user operation test.

## SDK

- [ ] Implement `createAstalantyClient`.
- [ ] Implement `createSmartAccount`.
- [ ] Implement `quoteFee`.
- [ ] Implement `approveMockUsdc`.
- [ ] Implement `executeWithPaymaster`.
- [ ] Implement `waitForUserOperation`.
- [ ] Implement `recoverOwner`.
- [ ] Implement typed errors.
- [ ] Add full example.

## Demo

- [ ] User can receive Mock USDC.
- [ ] User can create Smart Account.
- [ ] User can quote fee.
- [ ] User can approve Mock USDC.
- [ ] User can execute a transaction through Paymaster.
- [ ] Fee Manager emits settlement event.
- [ ] AUSD balance changes are visible.
- [ ] SDK returns confirmation.

## Public Technical Evidence

- [ ] Architecture summary.
- [ ] Contract addresses on testnet.
- [ ] Demo transaction hash.
- [ ] Event trace.
- [ ] SDK example.
- [ ] README with demo flow.
- [ ] Short technical explanation for public reviewers.

---

# Freeze Statement

This document freezes the Astalanty MVP economic core for implementation.

The next work window may start implementation directly from this specification without additional architectural decisions.
