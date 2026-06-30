# Astalanty Site

Official public landing page for Astalanty.

The site is intentionally conservative: it presents the current MVP, links to the public GitHub repository and documentation, and avoids mainnet, audit or production-stablecoin claims.

## Run Locally

```powershell
pnpm --filter @astalanty/site dev
```

## Build

```powershell
pnpm --filter @astalanty/site build
```

## Deployment

The repository includes a GitHub Pages workflow:

- Workflow: `.github/workflows/deploy-site.yml`
- Build command: `pnpm --filter @astalanty/site build`
- Static output: `apps/site/out`

Custom domains:

- `astalanty.com`
- `www.astalanty.com`, redirected to `astalanty.com`

DNS should point the apex domain to GitHub Pages and configure `www` as a CNAME to the repository Pages host.
