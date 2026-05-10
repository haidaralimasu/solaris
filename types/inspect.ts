import type { Network } from "./simulate";

export type InspectTx = {
  signature: string;
  slot: number;
  blockTime: number | null;
  status: "success" | "failed";
  fee: number;
  feePayer: string | null;
  computeUnitsConsumed: number | null;
  instructionCount: number;
  logCount: number;
  errorCode: string | null;
};

export type TopCaller = {
  address: string;
  count: number;
  successCount: number;
};

export type InspectStats = {
  totalFetched: number;
  successCount: number;
  failedCount: number;
  successRate: number;
  avgComputeUnits: number;
  medianComputeUnits: number;
  maxComputeUnits: number;
  avgFeeSOL: number;
  txLast24h: number;
  txLast1h: number;
  topCallers: TopCaller[];
};

// /api/inspect request
export type InspectRequest = {
  programId: string;
  network: Network;
  limit?: number;
  before?: string;
};

// /api/inspect response
export type InspectResponse = {
  programId: string;
  network: Network;
  transactions: InspectTx[];
  stats: InspectStats;
  oldestSignature: string | null;
  newestSignature: string | null;
};
