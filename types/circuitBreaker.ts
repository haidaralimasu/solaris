import type { Network } from "./simulate";

export type CBAccountMeta = {
  address: string;
  writable: boolean;
  signer: boolean;
  label?: string;
};

export type CircuitBreaker = {
  id: string;
  label: string;
  description: string;
  programId: string;
  instructionData: string; // hex-encoded instruction data
  accounts: CBAccountMeta[];
  network: Network;
  createdAt: number;
  lastFiredAt?: number;
  lastSignature?: string;
};

export type CBExecution = {
  id: string;
  breakerId: string;
  breakerLabel: string;
  signature: string;
  status: "success" | "failed" | "pending";
  network: Network;
  timestamp: number;
  error?: string;
};

// Sent from client to /api/circuit-breaker/prepare
export type PrepareRequest = {
  breakerId: string;
  payer: string;
  network: Network;
  programId: string;
  instructionData: string;
  accounts: CBAccountMeta[];
};

// Response from /api/circuit-breaker/prepare
export type PrepareResponse = {
  transactionBase64: string; // unsigned VersionedTransaction, base64
  blockhash: string;
  lastValidBlockHeight: number;
};

// Sent from client to /api/circuit-breaker/execute
export type ExecuteRequest = {
  signedTransactionBase64: string;
  network: Network;
  breakerId: string;
};

// Response from /api/circuit-breaker/execute
export type ExecuteResponse = {
  signature: string;
};
