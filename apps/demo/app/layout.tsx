import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Astalanty Demo",
  description: "Official Astalanty MVP technical demo."
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
