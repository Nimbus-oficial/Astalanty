# Astalanty Demo App

Official web demo for the Astalanty technical MVP flow.

This application uses only `@astalanty/sdk` for blockchain interactions. It does not import Solidity artifacts, Hardhat artifacts, contract ABIs, or contract clients directly.

## Stack

- Next.js
- React
- TypeScript
- `@astalanty/sdk`

## Run Locally

```powershell
git clone https://github.com/Nimbus-oficial/Astalanty.git
cd Astalanty
pnpm install
pnpm --filter @astalanty/sdk build
pnpm --filter @astalanty/demo dev
```

Open:

```text
http://localhost:3000
```

## Optional Environment

The app defaults to the latest local Hardhat deployment addresses. For Arbitrum Sepolia, create `apps/demo/.env.local`:

```env
NEXT_PUBLIC_ASTALANTY_NETWORK_NAME=arbitrumSepolia
NEXT_PUBLIC_ASTALANTY_CHAIN_ID=421614
NEXT_PUBLIC_ASTALANTY_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
NEXT_PUBLIC_ASTALANTY_MOCK_USDC=0x...
NEXT_PUBLIC_ASTALANTY_AUSD_TOKEN=0x...
NEXT_PUBLIC_ASTALANTY_FEE_MANAGER=0x...
NEXT_PUBLIC_ASTALANTY_PAYMASTER=0x...
NEXT_PUBLIC_ASTALANTY_SMART_ACCOUNT_FACTORY=0x...
NEXT_PUBLIC_ASTALANTY_SMART_ACCOUNT=0x...
```

## Demo Flow

1. Connect Wallet.
2. Create Smart Account.
3. Review Mock USDC and AUSD balances.
4. Review Fee Manager and Paymaster data.
5. Approve Paymaster.
6. Execute Sponsored Transaction.
7. Review logs and recent events.

## MVP Limitations

- The demo depends on MetaMask or another browser EVM wallet for transactions.
- The current sponsored operation uses the MVP `sponsorDemoOperation` flow.
- A Smart Account must hold Mock USDC before the Paymaster approval can settle successfully.
- The app has no backend, persistence, authentication, or production account abstraction bundler.
