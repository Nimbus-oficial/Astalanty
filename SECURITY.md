# Security Policy

## Supported Scope

Astalanty is currently an MVP. Security reports should focus on:

- Solidity contracts in `packages/contracts/contracts`;
- deployment scripts in `packages/contracts/scripts`;
- TypeScript SDK in `packages/sdk`;
- Demo App integration boundaries in `apps/demo`;
- documentation that could lead to unsafe deployment or key handling.

## Reporting A Vulnerability

Until a dedicated security contact is published, please open a private communication channel with the project Founder before disclosing vulnerabilities publicly.

Do not publish exploitable details in a public issue before maintainers have reviewed the report.

## Secret Handling

Never commit:

- `.env` files;
- private keys;
- seed phrases;
- API keys;
- private RPC URLs;
- credentials;
- local logs or caches.

Use `.env.example` for example values only.

## Current Security Limitations

- The MVP is not production-mainnet-ready.
- The Paymaster demo flow uses `sponsorDemoOperation`, not a full ERC-4337 production flow.
- Admin controls are centralized for testnet simplicity.
- AUSD and Mock USDC are testnet assets only.

These limitations are intentionally documented and should not be removed without corresponding technical changes.
