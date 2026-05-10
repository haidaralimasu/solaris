"use client";

import { SolarisWalletProvider } from "./WalletProvider";

interface RootProvidersProps {
  children: React.ReactNode;
  rpcEndpoint: string;
}

export function RootProviders({ children, rpcEndpoint }: RootProvidersProps) {
  return (
    <SolarisWalletProvider endpoint={rpcEndpoint}>
      {children}
    </SolarisWalletProvider>
  );
}
