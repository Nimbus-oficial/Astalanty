# Contributing

Thank you for your interest in Astalanty.

Astalanty is currently in MVP stage. Contributions should stay aligned with the current public scope:

- Solidity contracts for the MVP economic core;
- TypeScript SDK;
- Demo App;
- documentation, tests and deployment tooling.

## Before Opening A Pull Request

1. Read `README.md`.
2. Read `docs/public/QUICK_ARCHITECTURE.md`.
3. Read `docs/public/MVP_FLOW.md`.
4. Confirm the change does not claim or implement out-of-scope modules such as bridge, explorer, production Orbit chain, wallet product or backend APIs.
5. Run the relevant validation commands.

## Validation Commands

```powershell
pnpm --filter @astalanty/contracts build
pnpm --filter @astalanty/contracts test
pnpm --filter @astalanty/sdk build
pnpm --filter @astalanty/demo test
```

## Scope Rules

- Do not introduce new architecture without a documented rationale.
- Do not bypass the SDK from the Demo App.
- Do not commit `.env`, private keys, local logs, build artifacts or generated caches.
- Do not present roadmap items as implemented features.

## Pull Request Expectations

- Explain the purpose of the change.
- Link to the affected package or documentation.
- Include tests or validation output when relevant.
- Keep changes focused.
