"use client";

import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { LedgerWalletAdapter } from "@solana/wallet-adapter-wallets";

import "@solana/wallet-adapter-react-ui/styles.css";

interface SolarisWalletProviderProps {
  children: React.ReactNode;
  endpoint: string;
}

export function SolarisWalletProvider({ children, endpoint }: SolarisWalletProviderProps) {
  // Phantom, Solflare, and Coinbase support Wallet Standard and self-register.
  // Passing their adapters explicitly causes double-registration and breaks connect.
  const wallets = useMemo(() => [new LedgerWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
