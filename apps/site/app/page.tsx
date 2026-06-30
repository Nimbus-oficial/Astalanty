const architectureSteps = [
  "Application",
  "Astalanty SDK",
  "Smart Account",
  "Paymaster",
  "Fee Manager",
  "AUSD settlement",
  "Transaction confirmation"
];

const technologies = [
  ["Smart Accounts", "A basic MVP account contract that can execute authorized calls and interact with the Paymaster flow."],
  ["Paymaster", "A testnet contract that receives Mock USDC and coordinates sponsored demo operations."],
  ["Fee Manager", "A small policy engine that quotes fees, records settlement, and mints technical AUSD to the treasury."],
  ["AUSD", "A technical MVP/testnet ERC-20 used for internal settlement accounting. It is not a production stablecoin."],
  ["SDK", "A typed TypeScript package that applications use instead of calling Solidity contracts directly."],
  ["Demo App", "A local technical demo that uses only the SDK to exercise the MVP flow."]
];

const whyItems = [
  "The MVP makes the payment abstraction flow inspectable through contracts, tests, SDK code, and a demo app.",
  "Developers integrate through a canonical SDK instead of manually coordinating contract calls.",
  "The implementation is intentionally small, auditable, and suitable for local reproduction.",
  "The roadmap remains compatible with future Arbitrum Orbit exploration without claiming a production L3 today."
];

const mvpItems = [
  { label: "Architecture", status: "Public docs", progress: 100 },
  { label: "Contracts", status: "Implemented", progress: 88 },
  { label: "SDK", status: "Implemented", progress: 82 },
  { label: "Demo App", status: "Local", progress: 74 },
  { label: "Tests", status: "Passing", progress: 78 },
  { label: "Testnet deploy", status: "Pending", progress: 24 },
  { label: "External audit", status: "Not published", progress: 8 }
];

const roadmap = [
  ["01", "MVP", "Core contracts, SDK flows, demo experience, and local validation."],
  ["02", "Public Testnet", "Arbitrum Sepolia deployment, contract verification, and public transaction evidence."],
  ["03", "Security Validation", "Expanded test coverage, review cycles, and independent audit planning."],
  ["04", "ERC-4337 Expansion", "Move from the simplified MVP flow toward fuller EntryPoint and bundler compatibility."],
  ["05", "Orbit Research", "Evaluate the future Layer 3 path after the MVP has public testnet evidence."]
];

const docs = [
  ["GitHub", "https://github.com/Nimbus-oficial/Astalanty"],
  ["SDK", "https://github.com/Nimbus-oficial/Astalanty/tree/main/packages/sdk"],
  ["Demo App", "https://github.com/Nimbus-oficial/Astalanty/tree/main/apps/demo"],
  ["Architecture", "https://github.com/Nimbus-oficial/Astalanty/blob/main/docs/public/QUICK_ARCHITECTURE.md"],
  ["MVP Flow", "https://github.com/Nimbus-oficial/Astalanty/blob/main/docs/public/MVP_FLOW.md"],
  ["Contracts", "https://github.com/Nimbus-oficial/Astalanty/tree/main/packages/contracts"]
];

const assetPath = (path: string) => `/Astalanty${path}`;

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <ArchitectureFlow />
        <CoreTechnologies />
        <WhyAstalanty />
        <MvpStatus />
        <Ecosystem />
        <Roadmap />
        <Documentation />
      </main>
      <Footer />
    </>
  );
}

function Header() {
  return (
    <header className="site-header">
      <a className="brand-link" href="#top" aria-label="Astalanty home">
        <img src={assetPath("/brand/astalanty-logo-horizontal.svg")} alt="Astalanty" width="160" height="70" />
      </a>
      <nav className="desktop-nav" aria-label="Primary navigation">
        <a href="#architecture">Architecture</a>
        <a href="#technologies">Core</a>
        <a href="#mvp">MVP</a>
        <a href="#roadmap">Roadmap</a>
        <a href="#docs">Docs</a>
      </nav>
      <a className="header-cta" href="#docs">
        View docs
      </a>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero section-shell" id="top">
      <div className="hero-copy">
        <p className="eyebrow">Technical MVP for payment abstraction</p>
        <h1>Smart Account payment flows, reduced to a reproducible MVP.</h1>
        <p className="hero-lede">
          Astalanty is an open source technical MVP that demonstrates a Smart Account,
          Paymaster, Fee Manager, AUSD testnet settlement token, TypeScript SDK, and local
          Demo App for sponsored transaction flows.
        </p>
        <div className="hero-actions" aria-label="Primary calls to action">
          <a className="button button-primary" href="#architecture">
            Explore architecture
          </a>
          <a className="button button-secondary" href="https://github.com/Nimbus-oficial/Astalanty">
            View GitHub
          </a>
        </div>
      </div>
      <div className="hero-system" aria-label="Astalanty infrastructure summary">
        <div className="system-topline">
          <span>Current state</span>
          <strong>Local MVP</strong>
        </div>
        <div className="system-grid">
          <Metric label="Settlement token" value="AUSD testnet" />
          <Metric label="Public testnet" value="Pending" />
          <Metric label="Compatibility" value="EVM" />
          <Metric label="External audit" value="Not published" />
        </div>
        <div className="signal-card">
          <span className="signal-dot" />
          Flow: application to SDK to Smart Account to Paymaster to Fee Manager to AUSD settlement.
        </div>
      </div>
    </section>
  );
}

function ArchitectureFlow() {
  return (
    <section className="section-shell split-section" id="architecture">
      <div>
        <p className="eyebrow">Architecture</p>
        <h2>A clear execution path from application interface to MVP settlement.</h2>
        <p className="section-lede">
          The stack is organized around a predictable transaction flow: applications integrate
          through the SDK, users operate through smart accounts, and fees move through dedicated
          MVP contracts before the transaction is confirmed.
        </p>
      </div>
      <div className="flow-card" aria-label="Architecture flow">
        {architectureSteps.map((step, index) => (
          <div className="flow-row" key={step}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{step}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function CoreTechnologies() {
  return (
    <section className="section-shell" id="technologies">
      <div className="section-heading">
        <p className="eyebrow">Core technologies</p>
        <h2>Small, inspectable components for a technical demonstration.</h2>
      </div>
      <div className="technology-grid">
        {technologies.map(([title, body]) => (
          <article className="technology-card" key={title}>
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function WhyAstalanty() {
  return (
    <section className="why-section">
      <div className="section-shell split-section">
        <div>
          <p className="eyebrow">Why Astalanty?</p>
          <h2>A focused way to review payment abstraction mechanics.</h2>
        </div>
        <div className="reason-list">
          {whyItems.map((item) => (
            <div className="reason-item" key={item}>
              <span aria-hidden="true" />
              <p>{item}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MvpStatus() {
  return (
    <section className="section-shell" id="mvp">
      <div className="section-heading">
        <p className="eyebrow">Current MVP</p>
        <h2>What exists today, and what is still pending.</h2>
      </div>
      <div className="mvp-grid">
        {mvpItems.map((item) => (
          <article className="mvp-card" key={item.label}>
            <div>
              <h3>{item.label}</h3>
              <span>{item.status}</span>
            </div>
            <div className="progress-track" aria-label={`${item.label} progress ${item.progress}%`}>
              <span style={{ width: `${item.progress}%` }} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Ecosystem() {
  return (
    <section className="ecosystem-section section-shell">
      <div className="ecosystem-panel">
        <p className="eyebrow">Arbitrum ecosystem</p>
        <h2>Aligned with Arbitrum developer infrastructure, without overclaiming production status.</h2>
        <p>
          Astalanty currently provides a local MVP and public technical repository. The next
          verifiable step is Arbitrum Sepolia deployment. A future Orbit/L3 direction remains
          architectural research, not an implemented production network.
        </p>
      </div>
      <div className="ecosystem-stats" aria-label="Ecosystem focus areas">
        <Metric label="Current layer" value="Local EVM" />
        <Metric label="Parent ecosystem" value="Arbitrum" />
        <Metric label="Focus" value="Developer UX" />
      </div>
    </section>
  );
}

function Roadmap() {
  return (
    <section className="section-shell" id="roadmap">
      <div className="section-heading">
        <p className="eyebrow">Roadmap</p>
        <h2>From MVP validation to ecosystem growth.</h2>
      </div>
      <ol className="roadmap-list">
        {roadmap.map(([phase, title, body]) => (
          <li key={phase}>
            <span>{phase}</span>
            <div>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Documentation() {
  return (
    <section className="docs-section section-shell" id="docs">
      <div>
        <p className="eyebrow">Documentation</p>
        <h2>Everything needed to review, integrate, and validate the stack.</h2>
      </div>
      <div className="doc-links" aria-label="Documentation links">
        {docs.map(([item, href]) => (
          <a href={href} key={item}>
            {item}
          </a>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <img src={assetPath("/brand/astalanty-logo-horizontal.svg")} alt="Astalanty" width="160" height="70" />
        <p>Open source MVP for Smart Account payment abstraction and developer tooling.</p>
      </div>
      <nav aria-label="Footer navigation">
        <a href="#architecture">Architecture</a>
        <a href="#docs">Documentation</a>
        <a href="https://github.com/Nimbus-oficial/Astalanty">GitHub</a>
        <a href="https://github.com/Nimbus-oficial/Astalanty/issues">Contact</a>
        <a href="https://github.com/Nimbus-oficial/Astalanty/blob/main/LICENSE">License</a>
      </nav>
    </footer>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
