export type Network = "mainnet-beta" | "devnet";

export type InputType = "signature" | "base64" | "invalid";

export type DecodedInstruction = {
  index: number;
  programId: string;
  programName: string | null;
  name: string | null;
  data: string;
  decoded: Record<string, unknown> | null;
  logs: string[];
};

export type AccountDiff = {
  pubkey: string;
  preLamports: number;
  postLamports: number;
  lamportDelta: number;
  isTokenAccount: boolean;
  preTokenAmount?: string;
  postTokenAmount?: string;
  tokenDelta?: string;
  mint?: string;
};

export type CallNode = {
  programId: string;
  programName: string | null;
  depth: number;
  status: "success" | "failed" | "unknown";
  failReason?: string;
  computeUnits?: number;
  logs: string[];
  children: CallNode[];
};

export type TxMeta = {
  slot: number;
  blockTime: number | null;
  fee: number;
  version: "legacy" | 0;
};

export type SimulateResponse = {
  status: "success" | "failed" | "error";
  error?: {
    raw: string;
    plainEnglish: string;
  };
  computeUnits: {
    used: number;
    limit: number;
  };
  instructions: DecodedInstruction[];
  logs: string[];
  accountDiffs: AccountDiff[];
  callTrace: CallNode[];
  txMeta?: TxMeta;
};

export type SimulateRequest = {
  input: string;
  network: Network;
  mode?: "debug" | "simulate";
};
