# Technical Evidence Checklist

## Current Technical Evidence

- [x] Solidity contracts exist for MVP economic core.
- [x] Smart Account and Smart Account Factory exist.
- [x] Paymaster exists with MVP safety rule `payer == account`.
- [x] Fee Manager exists with deterministic quote and settlement.
- [x] AUSD and Mock USDC testnet tokens exist.
- [x] Hardhat compile passes.
- [x] Hardhat tests pass.
- [x] Local deploy and seed script exists.
- [x] Deployment JSON format exists.
- [x] SDK TypeScript package builds.
- [x] Demo App builds.
- [x] Demo App uses SDK only.
- [x] Demo screenshot exists.

## Files To Show Evaluators

| Evidence | Path |
| --- | --- |
| Contracts | `packages/contracts/contracts/` |
| Tests | `packages/contracts/test/mvp-flow.test.cjs` |
| Deploy script | `packages/contracts/scripts/deploy-mvp.cjs` |
| Local deployment JSON | `packages/contracts/deployments/hardhat-31337-latest.json` |
| SDK | `packages/sdk/` |
| Demo App | `apps/demo/` |
| Demo screenshot | `apps/demo/demo-screenshot-viewport.png` |
| MVP spec | `docs/specifications/MVP_ECONOMIC_CORE_SPEC.md` |
| Architecture overview | `docs/public/QUICK_ARCHITECTURE.md` |
| MVP flow | `docs/public/MVP_FLOW.md` |

## Commands To Reproduce Locally

```powershell
git clone https://github.com/Nimbus-oficial/Astalanty.git
cd Astalanty
pnpm install
pnpm --filter @astalanty/contracts build
pnpm --filter @astalanty/contracts test
pnpm --filter @astalanty/contracts deploy:local
pnpm --filter @astalanty/sdk build
pnpm --filter @astalanty/demo build
pnpm --filter @astalanty/demo dev
```

## Evidence Still Needed For Public Testnet Review

- [ ] Arbitrum Sepolia deployment JSON.
- [ ] Arbiscan Sepolia links for all deployed contracts.
- [ ] Arbiscan Sepolia transaction links for:
  - contract deployment;
  - Smart Account creation;
  - Mock USDC mint;
  - Paymaster approval;
  - `sponsorDemoOperation`.
- [ ] Contract verification on Arbiscan Sepolia.
- [ ] Short demo video or GIF.
## Suggested Technical Milestones

1. Public Arbitrum Sepolia deployment and verification.
2. Demo App connected to real Sepolia deployment.
3. SDK documentation polish and example app package.
4. ERC-4337-compatible integration plan.
5. Security review for Paymaster and Fee Manager.
6. Orbit deployment plan for post-MVP phase.
