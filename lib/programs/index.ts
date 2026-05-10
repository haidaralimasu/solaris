import { ATA_PROGRAM_ID, decodeATAInstruction } from "./ata";
import { SYSTEM_PROGRAM_ID, decodeSystemInstruction } from "./system";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, decodeTokenInstruction } from "./token";
import {
  COMPUTE_BUDGET_PROGRAM_ID,
  decodeComputeBudgetInstruction,
} from "./computeBudget";

type DecoderFn = (
  data: Buffer,
  accountKeys: string[]
) => { name: string; args: Record<string, unknown> } | null;

// Some programs have multiple known deployment addresses
const ATA_PROGRAM_ID_ALT = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";

const PROGRAM_NAMES: Record<string, string> = {
  [SYSTEM_PROGRAM_ID]: "System Program",
  [TOKEN_PROGRAM_ID]: "Token Program",
  [TOKEN_2022_PROGRAM_ID]: "Token-2022 Program",
  [ATA_PROGRAM_ID]: "Associated Token Account Program",
  [ATA_PROGRAM_ID_ALT]: "Associated Token Account Program",
  [COMPUTE_BUDGET_PROGRAM_ID]: "Compute Budget",
  Vote111111111111111111111111111111111111111h: "Vote Program",
  Sysvar1nstructions1111111111111111111111111: "Sysvar: Instructions",
  SysvarRent111111111111111111111111111111111: "Sysvar: Rent",
  SysvarC1ock11111111111111111111111111111111: "Sysvar: Clock",
  SysvarStakeHistory1111111111111111111111111: "Sysvar: Stake History",
  SysvarEpochSchedu1e111111111111111111111111: "Sysvar: Epoch Schedule",
  MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr: "Memo Program",
  // Jupiter aggregator
  JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: "Jupiter v6",
  JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB: "Jupiter v4",
  JUP3c2Uh3WA4Ng34tw6kPd2G4e5Z9n4pSgFV8QvBzJZ: "Jupiter v3",
  jupoNjAxXgZ4rjzxzPMP4QHGaKGZCj12vDQnzZuSQFx: "Jupiter Limit Orders",
  // Orca
  whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3sFKDcc: "Orca Whirlpool",
  DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1: "Orca Legacy AMM",
  // Raydium
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": "Raydium AMM v4",
  CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK: "Raydium CLMM",
  CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C: "Raydium CPMM",
  routeUGWgWzqBWFcrCfv8tritsqukccJPu3q5GPP3xS: "Raydium Router",
  // Meteora
  LBUZKhRxPF3XUpBCjp4YzTKgLe4oCCNSjiaHWkVQpJz: "Meteora DLMM",
  Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB: "Meteora AMM",
  M3mxk5W2tt27WGT7THox7PmgzbfjQBmqwUa2KAQLMia: "Meteora Pools",
  // Kamino
  KLend2g3cP87fffoy8q1mQqGKjrL1AXEkZkVNB4nMdj: "Kamino Lending",
  KVZB9jPHGCh9kF7LvFkfcpLnLiCepFW7XMjJCBqFmuh: "Kamino Farms",
  // Drift
  dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH: "Drift v2",
  // Marginfi
  MFv2hWf31Z9kbCa1snEPdcgp8sNhh9sFqFbbKwzLLSc: "Marginfi v2",
  // Marinade
  MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD: "Marinade Finance",
  mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: "Marinade mSOL",
  // Wormhole
  worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth: "Wormhole Token Bridge",
  WnFt12ZrnzZrFZkt2xsNsaNWoQribnuQ5B5FrDbwDhD: "Wormhole NFT Bridge",
  // OpenBook / Serum
  opnb2LAfJYbRMAHHvqjCwQxanZn7n4M42pERkSfJXcfy: "OpenBook v2",
  srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX: "Serum DEX v3",
  // Solend
  So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo: "Solend",
  // Bonk / Pyth / misc
  pytS9TkG1dQPckMbDKDJiuNqhLVaVbxBBFfmHh1YQZS: "Pyth Oracle",
  FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH: "Pyth V2",
  StakeConfig11111111111111111111111111111111: "Stake Config",
  Stake11111111111111111111111111111111111111: "Stake Program",
};

const DECODERS: Map<string, DecoderFn> = new Map([
  [SYSTEM_PROGRAM_ID, decodeSystemInstruction],
  [TOKEN_PROGRAM_ID, decodeTokenInstruction],
  [TOKEN_2022_PROGRAM_ID, decodeTokenInstruction],
  [ATA_PROGRAM_ID, decodeATAInstruction],
  [ATA_PROGRAM_ID_ALT, decodeATAInstruction],
  [COMPUTE_BUDGET_PROGRAM_ID, decodeComputeBudgetInstruction],
]);

export function getProgramName(programId: string): string | null {
  return PROGRAM_NAMES[programId] ?? null;
}

export function decodeInstruction(
  programId: string,
  data: Buffer,
  accountKeys: string[]
): { name: string; args: Record<string, unknown> } | null {
  const decoder = DECODERS.get(programId);
  if (!decoder) return null;
  return decoder(data, accountKeys);
}
