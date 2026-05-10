import type { Metadata } from "next";
import { League_Spartan, Geist_Mono } from "next/font/google";
import "./globals.css";
import { RootProviders } from "@/components/RootProviders";

const leagueSpartan = League_Spartan({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Solaris — Solana Transaction Simulator",
  description: "Simulate, debug, and inspect Solana transactions with human-readable output",
};

function getRpcEndpoint(): string {
  const key = process.env.HELIUS_API_KEY;
  if (!key) return "https://api.mainnet-beta.solana.com";
  return `https://mainnet.helius-rpc.com/?api-key=${key}`;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const rpcEndpoint = getRpcEndpoint();

  return (
    <html
      lang="en"
      className={`${leagueSpartan.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <RootProviders rpcEndpoint={rpcEndpoint}>{children}</RootProviders>
      </body>
    </html>
  );
}
