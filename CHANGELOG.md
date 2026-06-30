# Changelog

## 0.1.0 - Public MVP Preparation

Initial public MVP package.

### Added

- MVP Solidity contracts:
  - `MockUSDC`;
  - `AUSDToken`;
  - `AstalantyFeeManager`;
  - `AstalantyPaymaster`;
  - `AstalantySmartAccount`;
  - `AstalantySmartAccountFactory`.
- Hardhat tests for the complete MVP flow.
- Deploy and seed script for local Hardhat and Arbitrum Sepolia.
- Official TypeScript SDK.
- Official Demo App using the SDK only.
- Public architecture and MVP flow documentation.
- Grant dossier documentation.
- Open source project files:
  - `LICENSE`;
  - `CONTRIBUTING.md`;
  - `SECURITY.md`;
  - `CODE_OF_CONDUCT.md`;
  - `ROADMAP.md`.

### Known Gaps

- Public Arbitrum Sepolia deployment is pending testnet ETH.
- Full ERC-4337 EntryPoint/Bundler integration is not implemented.
- Bridge, explorer, NOC, backend APIs and production Orbit chain are not part of this MVP.
