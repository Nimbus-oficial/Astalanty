import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Astalanty | Technical MVP for Payment Abstraction",
  description:
    "Astalanty is an open source technical MVP for Smart Account payment abstraction, Paymaster settlement, AUSD testnet fees, and a TypeScript SDK.",
  metadataBase: new URL("https://nimbus-oficial.github.io"),
  icons: {
    icon: "/Astalanty/brand/astalanty-logo-square.svg"
  },
  openGraph: {
    title: "Astalanty | Technical MVP for Payment Abstraction",
    description:
      "Open source MVP demonstrating Smart Accounts, Paymaster settlement, AUSD testnet fees, contracts, tests, SDK, and a demo app.",
    type: "website",
    images: ["/Astalanty/brand/astalanty-logo-large.svg"]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
