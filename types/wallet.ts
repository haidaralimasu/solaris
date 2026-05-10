import type { Network } from "./simulate";

export type WalletTx = {
  signature: string;
  slot: number;
  blockTime: number | null;
  status: "success" | "failed";
  fee: number;
  computeUnitsConsumed: number | null;
  instructionCount: number;
  programIds: string[];
  lamportDelta: number;
  errorCode: string | null;
};

export type TokenBalance = {
  mint: string;
  symbol: string | null;
  uiAmount: number | null;
  decimals: number;
};

export type WalletStats = {
  totalFetched: number;
  successCount: number;
  failedCount: number;
  totalFeesSOL: number;
  totalCUConsumed: number;
  totalTxLast24h: number;
  netLamportDelta: number;
};

export type WalletRequest = {
  address: string;
  network: Network;
  limit?: number;
  before?: string;
};

export type WalletResponse = {
  address: string;
  network: Network;
  solBalance: number;
  tokenBalances: TokenBalance[];
  transactions: WalletTx[];
  stats: WalletStats;
  oldestSignature: string | null;
  newestSignature: string | null;
};
