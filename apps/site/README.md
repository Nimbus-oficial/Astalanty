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

## DNS Records

Configure the apex domain with GitHub Pages A records:

```text
astalanty.com    A      185.199.108.153
astalanty.com    A      185.199.109.153
astalanty.com    A      185.199.110.153
astalanty.com    A      185.199.111.153
```

Configure the `www` subdomain as:

```text
www.astalanty.com    CNAME    Nimbus-oficial.github.io
```

In GitHub, open `Settings > Pages`, select `GitHub Actions` as the source, set the custom domain to `astalanty.com`, then enable HTTPS after DNS validation completes.
