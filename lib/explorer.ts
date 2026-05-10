import type { Network } from "@/types/simulate";

function cluster(network: Network): string {
  return network === "devnet" ? "?cluster=devnet" : "";
}

export function txUrls(sig: string, network: Network) {
  const c = cluster(network);
  return {
    solscan: `https://solscan.io/tx/${sig}${c}`,
    explorer: `https://explorer.solana.com/tx/${sig}${c}`,
  };
}

export function accountUrl(address: string, network: Network): string {
  return `https://solscan.io/account/${address}${cluster(network)}`;
}

export function tokenUrl(mint: string, network: Network): string {
  return `https://solscan.io/token/${mint}${cluster(network)}`;
}
