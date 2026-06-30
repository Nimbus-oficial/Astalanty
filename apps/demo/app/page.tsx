"use client";

import { useMemo, useState } from "react";
import {
  AstalantySDK,
  AstalantySDKError,
  type AstalantyEvent,
  type AstalantyWallet,
  type FeeManagerParameters,
  type FeeQuote,
  type TokenBalance
} from "@astalanty/sdk";

declare global {
  interface Window {
    ethereum?: AstalantyWallet;
  }
}

const DEFAULT_ADDRESSES = {
  mockUsdc: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  ausdToken: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  feeManager: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  paymaster: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  smartAccountFactory: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
  smartAccount: "0xe5DA8f0a953543bcea8b0eF593C14DEB85967855"
};

const demoConfig = {
  network: {
    name: process.env.NEXT_PUBLIC_ASTALANTY_NETWORK_NAME ?? "hardhat",
    chainId: BigInt(process.env.NEXT_PUBLIC_ASTALANTY_CHAIN_ID ?? "31337"),
    rpcUrl: process.env.NEXT_PUBLIC_ASTALANTY_RPC_URL || undefined
  },
  contracts: {
    mockUsdc: process.env.NEXT_PUBLIC_ASTALANTY_MOCK_USDC ?? DEFAULT_ADDRESSES.mockUsdc,
    ausdToken: process.env.NEXT_PUBLIC_ASTALANTY_AUSD_TOKEN ?? DEFAULT_ADDRESSES.ausdToken,
    feeManager: process.env.NEXT_PUBLIC_ASTALANTY_FEE_MANAGER ?? DEFAULT_ADDRESSES.feeManager,
    paymaster: process.env.NEXT_PUBLIC_ASTALANTY_PAYMASTER ?? DEFAULT_ADDRESSES.paymaster,
    smartAccountFactory:
      process.env.NEXT_PUBLIC_ASTALANTY_SMART_ACCOUNT_FACTORY ?? DEFAULT_ADDRESSES.smartAccountFactory,
    smartAccount: process.env.NEXT_PUBLIC_ASTALANTY_SMART_ACCOUNT ?? DEFAULT_ADDRESSES.smartAccount
  }
};

type LogLine = {
  id: number;
  level: "info" | "success" | "error";
  message: string;
};

export default function DemoPage() {
  const sdk = useMemo(() => new AstalantySDK(demoConfig), []);
  const [wallet, setWallet] = useState<string>();
  const [smartAccount, setSmartAccount] = useState<string | undefined>(demoConfig.contracts.smartAccount);
  const [mockUsdc, setMockUsdc] = useState<TokenBalance>();
  const [ausd, setAusd] = useState<TokenBalance>();
  const [feeParams, setFeeParams] = useState<FeeManagerParameters>();
  const [quote, setQuote] = useState<FeeQuote>();
  const [events, setEvents] = useState<AstalantyEvent[]>([]);
  const [lastOperation, setLastOperation] = useState<{ operationId: string; transactionHash: string }>();
  const [busyAction, setBusyAction] = useState<string>();
  const [logs, setLogs] = useState<LogLine[]>([
    {
      id: 1,
      level: "info",
      message: "Demo ready. Connect a wallet to run the Astalanty MVP flow."
    }
  ]);

  async function runAction(label: string, action: () => Promise<void>) {
    setBusyAction(label);
    pushLog("info", `${label} started.`);
    try {
      await action();
      pushLog("success", `${label} completed.`);
    } catch (error) {
      pushLog("error", readableError(error));
    } finally {
      setBusyAction(undefined);
    }
  }

  async function connectWallet() {
    await runAction("Connect wallet", async () => {
      if (!window.ethereum) {
        throw new AstalantySDKError("WALLET_NOT_CONNECTED", "MetaMask or another EVM wallet was not detected.");
      }

      const address = await sdk.connect(window.ethereum);
      setWallet(address);
      await refreshState();
    });
  }

  async function createSmartAccount() {
    await runAction("Create Smart Account", async () => {
      const result = await sdk.createSmartAccount();
      setSmartAccount(result.smartAccount);
      await refreshState();
    });
  }

  async function approvePaymaster() {
    await runAction("Approve Paymaster", async () => {
      await sdk.approvePaymaster();
      await refreshState();
    });
  }

  async function executeSponsoredTransaction() {
    await runAction("Execute Sponsored Transaction", async () => {
      const result = await sdk.executeSponsoredTransaction();
      setLastOperation({
        operationId: result.operationId,
        transactionHash: result.transactionHash
      });
      setQuote(result.quote);
      await refreshState();
    });
  }

  async function refreshState() {
    const [mockUsdcBalance, ausdBalance, params, sponsoredQuote] = await Promise.all([
      sdk.getMockUSDCBalance(),
      sdk.getAUSDBalance(),
      sdk.getFeeManagerParameters(),
      sdk.quoteSponsoredTransaction()
    ]);

    setSmartAccount(sdk.smartAccount);
    setMockUsdc(mockUsdcBalance);
    setAusd(ausdBalance);
    setFeeParams(params);
    setQuote(sponsoredQuote);
    await refreshEvents();
  }

  async function refreshEvents() {
    const eventGroups = await Promise.allSettled([
      sdk.getEvents({ event: "SmartAccountCreated", fromBlock: 0 }),
      sdk.getEvents({ event: "PaymasterFeeSettled", fromBlock: 0 }),
      sdk.getEvents({ event: "FeeSettled", fromBlock: 0 }),
      sdk.getEvents({ event: "AUSDMinted", fromBlock: 0 })
    ]);

    const merged = eventGroups
      .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
      .sort((a, b) => b.blockNumber - a.blockNumber)
      .slice(0, 8);

    setEvents(merged);
  }

  function pushLog(level: LogLine["level"], message: string) {
    setLogs((current) => [
      {
        id: Date.now(),
        level,
        message
      },
      ...current
    ].slice(0, 10));
  }

  const isBusy = Boolean(busyAction);

  return (
    <main className="shell">
      <section className="topbar" aria-label="Astalanty demo header">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">A</div>
          <div>
            <p className="eyebrow">Astalanty MVP</p>
            <h1>Developer Demo</h1>
          </div>
        </div>
        <div className={wallet ? "status connected" : "status"}>
          <span />
          {wallet ? shortAddress(wallet) : "Wallet disconnected"}
        </div>
      </section>

      <section className="hero-panel">
        <div>
          <p className="eyebrow">Technical MVP flow</p>
          <h2>Smart Account payment sponsorship in one screen.</h2>
          <p className="lede">
            This demo uses the official SDK only. It creates or connects a Smart Account, approves the Paymaster,
            executes the sponsored operation, and reads settlement events.
          </p>
        </div>
        <div className="network-box">
          <span>Network</span>
          <strong>{demoConfig.network.name}</strong>
          <small>Chain ID {demoConfig.network.chainId.toString()}</small>
        </div>
      </section>

      <section className="actions" aria-label="Primary actions">
        <button data-testid="connect-wallet" onClick={connectWallet} disabled={isBusy}>
          Connect Wallet
        </button>
        <button onClick={createSmartAccount} disabled={!wallet || isBusy}>
          Create Smart Account
        </button>
        <button onClick={approvePaymaster} disabled={!wallet || !smartAccount || isBusy}>
          Approve Paymaster
        </button>
        <button className="primary" onClick={executeSponsoredTransaction} disabled={!wallet || !smartAccount || isBusy}>
          Execute Sponsored Transaction
        </button>
      </section>

      <section className="grid">
        <InfoCard title="Smart Account">
          <DataRow label="Owner wallet" value={wallet ? shortAddress(wallet) : "Not connected"} />
          <DataRow label="Smart Account" value={smartAccount ? shortAddress(smartAccount) : "Not created"} />
          <DataRow label="Factory" value={shortAddress(demoConfig.contracts.smartAccountFactory)} />
        </InfoCard>

        <InfoCard title="Balances">
          <DataRow label="Mock USDC" value={mockUsdc ? `${mockUsdc.formatted} mUSDC` : "Not loaded"} />
          <DataRow label="AUSD" value={ausd ? `${ausd.formatted} AUSD` : "Not loaded"} />
          <DataRow label="Balance owner" value={mockUsdc ? shortAddress(mockUsdc.owner) : "Smart Account"} />
        </InfoCard>

        <InfoCard title="Paymaster">
          <DataRow label="Paymaster" value={shortAddress(demoConfig.contracts.paymaster)} />
          <DataRow label="Authorized" value={feeParams ? shortAddress(feeParams.authorizedPaymaster) : "Not loaded"} />
          <DataRow label="Last operation" value={lastOperation ? shortHash(lastOperation.operationId) : "None"} />
        </InfoCard>

        <InfoCard title="Fee Manager">
          <DataRow label="Rate" value={feeParams ? feeParams.usdcToAusdRate.toString() : "Not loaded"} />
          <DataRow label="Markup" value={feeParams ? `${feeParams.baseGasMarkupBps.toString()} bps` : "Not loaded"} />
          <DataRow label="Treasury" value={feeParams ? shortAddress(feeParams.treasury) : "Not loaded"} />
          <DataRow label="Quote AUSD" value={quote ? quote.ausdFee.toString() : "Not loaded"} />
          <DataRow label="Mock USDC required" value={quote ? quote.mockUsdcRequired.toString() : "Not loaded"} />
        </InfoCard>
      </section>

      <section className="activity-grid">
        <InfoCard title="Operation Logs">
          <div className="log-list">
            {logs.map((line) => (
              <p className={`log-line ${line.level}`} key={line.id}>
                {line.message}
              </p>
            ))}
          </div>
        </InfoCard>

        <InfoCard title="Recent Events">
          {events.length === 0 ? (
            <p className="empty">No events loaded yet.</p>
          ) : (
            <div className="event-list">
              {events.map((event) => (
                <div className="event-row" key={`${event.transactionHash}-${event.event}-${event.blockNumber}`}>
                  <strong>{event.event}</strong>
                  <span>Block {event.blockNumber}</span>
                  <small>{shortHash(event.transactionHash)}</small>
                </div>
              ))}
            </div>
          )}
        </InfoCard>
      </section>
    </main>
  );
}

function InfoCard({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <article className="card">
      <h3>{title}</h3>
      {children}
    </article>
  );
}

function DataRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="data-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function shortAddress(value: string) {
  if (value.length < 12) {
    return value;
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function shortHash(value: string) {
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

function readableError(error: unknown) {
  if (error instanceof AstalantySDKError) {
    return `${error.code}: ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unexpected error.";
}
