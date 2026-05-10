import {
  Connection,
  PublicKey,
  VersionedTransaction,
  Transaction,
  MessageV0,
  AddressLookupTableAccount,
} from "@solana/web3.js";
import type { SimulateResponse, DecodedInstruction, AccountDiff, TxMeta, Network } from "@/types/simulate";
import { buildConnection, fetchTransaction } from "./solana";
import { computeAccountDiff } from "./accounts";
import { translateError } from "./errors";
import { getProgramName, decodeInstruction } from "./programs";
import { buildCallTrace } from "./callTrace";

const COMPUTE_BUDGET_PROGRAM_ID = "ComputeBudget111111111111111111111111111111";
const DEFAULT_COMPUTE_LIMIT = 200_000;

function extractComputeLimit(
  instructions: Array<{ programId: string; data: Buffer }>
): number {
  for (const ix of instructions) {
    if (ix.programId !== COMPUTE_BUDGET_PROGRAM_ID) continue;
    if (ix.data.length >= 5 && ix.data[0] === 2) {
      return ix.data.readUInt32LE(1);
    }
  }
  return DEFAULT_COMPUTE_LIMIT;
}

function distributeLogsToInstructions(logs: string[], count: number): string[][] {
  const result: string[][] = Array.from({ length: count }, () => []);
  let current = -1;
  for (const line of logs) {
    const invokeMatch = line.match(/^Program \S+ invoke \[(\d+)\]/);
    if (invokeMatch && parseInt(invokeMatch[1]) === 1) {
      current++;
      if (current >= count) break;
    }
    if (current >= 0 && current < count) result[current].push(line);
  }
  return result;
}

interface RawInstruction {
  programId: string;
  data: Buffer;
  accountKeys: string[];
}

// Resolve all account keys, including those behind Address Lookup Tables (v0 txs)
async function resolveAccountKeys(
  tx: VersionedTransaction | Transaction,
  connection: Connection
): Promise<string[]> {
  if (tx instanceof Transaction) {
    const keys = new Set<string>();
    for (const ix of tx.instructions) {
      ix.keys.forEach((k) => keys.add(k.pubkey.toBase58()));
      keys.add(ix.programId.toBase58());
    }
    return Array.from(keys);
  }

  const message = tx.message;

  // V0 message with address lookup tables
  if (
    message instanceof MessageV0 &&
    message.addressTableLookups.length > 0
  ) {
    const lutPubkeys = message.addressTableLookups.map((lut) => lut.accountKey);
    const lutInfos = await connection.getMultipleAccountsInfo(lutPubkeys);

    const resolvedLuts = lutInfos
      .map((info, i) => {
        if (!info) return null;
        try {
          return new AddressLookupTableAccount({
            key: lutPubkeys[i],
            state: AddressLookupTableAccount.deserialize(info.data),
          });
        } catch {
          return null;
        }
      })
      .filter((x): x is AddressLookupTableAccount => x !== null);

    const accountKeys = message.getAccountKeys({
      addressLookupTableAccounts: resolvedLuts,
    });

    const keys: string[] = [];
    accountKeys.staticAccountKeys.forEach((k) => keys.push(k.toBase58()));
    accountKeys.accountKeysFromLookups?.writable.forEach((k) => keys.push(k.toBase58()));
    accountKeys.accountKeysFromLookups?.readonly.forEach((k) => keys.push(k.toBase58()));
    return keys;
  }

  // V0 without LUTs or legacy
  return message.staticAccountKeys.map((k) => k.toBase58());
}

function extractInstructions(
  tx: VersionedTransaction | Transaction,
  allAccountKeys: string[]
): RawInstruction[] {
  if (tx instanceof VersionedTransaction) {
    return tx.message.compiledInstructions.map((ix) => ({
      programId: allAccountKeys[ix.programIdIndex] ?? "unknown",
      data: Buffer.from(ix.data),
      accountKeys: ix.accountKeyIndexes.map((i) => allAccountKeys[i] ?? "unknown"),
    }));
  }
  return tx.instructions.map((ix) => ({
    programId: ix.programId.toBase58(),
    data: Buffer.from(ix.data),
    accountKeys: ix.keys.map((k) => k.pubkey.toBase58()),
  }));
}

export async function runSimulation(
  input: string,
  network: Network
): Promise<SimulateResponse> {
  const connection = buildConnection(network);
  const tx = await fetchTransaction(input, connection);

  // Resolve all account keys (including LUT-resolved ones for v0 txs)
  const allAccountKeys = await resolveAccountKeys(tx, connection);
  const rawInstructions = extractInstructions(tx, allAccountKeys);
  const computeLimit = extractComputeLimit(rawInstructions);

  // Parallel: pre-account state + simulation
  const accountPubkeys = allAccountKeys.map((k) => new PublicKey(k));
  const [preAccounts, simResult] = await Promise.all([
    connection.getMultipleAccountsInfo(accountPubkeys),
    connection.simulateTransaction(tx as VersionedTransaction, {
      replaceRecentBlockhash: true,
      commitment: "confirmed",
      accounts: {
        encoding: "base64",
        addresses: allAccountKeys,
      },
    }),
  ]);

  const simValue = simResult.value;
  const logs = simValue.logs ?? [];
  const failed = !!simValue.err;

  // Account diffs
  const postAccountData = simValue.accounts ?? [];
  const accountDiffs = allAccountKeys.map((pubkey, i) => {
    const pre = preAccounts[i];
    const post = postAccountData[i];

    const preEntry = pre
      ? { lamports: pre.lamports, data: Buffer.from(pre.data) }
      : null;

    let postEntry: { lamports: number; data: Buffer } | null = null;
    if (post && post.data) {
      const rawData = Array.isArray(post.data)
        ? Buffer.from(post.data[0], post.data[1] as BufferEncoding)
        : Buffer.from(post.data as unknown as string, "base64");
      postEntry = { lamports: post.lamports, data: rawData };
    }

    return computeAccountDiff(pubkey, preEntry, postEntry);
  });

  const logsByInstruction = distributeLogsToInstructions(logs, rawInstructions.length);

  const instructions: DecodedInstruction[] = rawInstructions.map((raw, i) => {
    const decoded = decodeInstruction(raw.programId, raw.data, raw.accountKeys);
    return {
      index: i,
      programId: raw.programId,
      programName: getProgramName(raw.programId),
      name: decoded?.name ?? null,
      data: raw.data.toString("hex"),
      decoded: decoded?.args ?? null,
      logs: logsByInstruction[i] ?? [],
    };
  });

  const computeUsed = simValue.unitsConsumed ?? 0;
  const callTrace = buildCallTrace(logs, getProgramName);

  if (failed) {
    const rawErr =
      typeof simValue.err === "string"
        ? simValue.err
        : JSON.stringify(simValue.err);
    return {
      status: "failed",
      error: { raw: rawErr, plainEnglish: translateError(rawErr) },
      computeUnits: { used: computeUsed, limit: computeLimit },
      instructions,
      logs,
      accountDiffs,
      callTrace,
    };
  }

  return {
    status: "success",
    computeUnits: { used: computeUsed, limit: computeLimit },
    instructions,
    logs,
    accountDiffs,
    callTrace,
  };
}

// Diagnose a confirmed transaction using its on-chain historical data.
// Unlike runSimulation, this never re-executes: it reads what actually happened.
export async function runDebug(
  sig: string,
  network: Network
): Promise<SimulateResponse> {
  const connection = buildConnection(network);

  const tx = await connection.getTransaction(sig, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });

  if (!tx) throw new Error("TRANSACTION_NOT_FOUND");
  const meta = tx.meta;
  if (!meta) throw new Error("TRANSACTION_META_NOT_FOUND");

  const logs = meta.logMessages ?? [];
  const computeUsed = meta.computeUnitsConsumed ?? 0;
  const failed = !!meta.err;

  // Reconstruct full account key list (static + LUT-resolved)
  const message = tx.transaction.message;
  const staticKeys = message.staticAccountKeys.map((k) => k.toBase58());
  const writableLut = meta.loadedAddresses?.writable?.map((k) => k.toBase58()) ?? [];
  const readonlyLut = meta.loadedAddresses?.readonly?.map((k) => k.toBase58()) ?? [];
  const allAccountKeys = [...staticKeys, ...writableLut, ...readonlyLut];

  // compiledInstructions works for both legacy and v0 VersionedMessage
  const rawInstructions: RawInstruction[] = message.compiledInstructions.map((ix) => ({
    programId: allAccountKeys[ix.programIdIndex] ?? "unknown",
    data: Buffer.from(ix.data),
    accountKeys: ix.accountKeyIndexes.map((i) => allAccountKeys[i] ?? "unknown"),
  }));

  const computeLimit = extractComputeLimit(rawInstructions);
  const logsByInstruction = distributeLogsToInstructions(logs, rawInstructions.length);

  const instructions: DecodedInstruction[] = rawInstructions.map((raw, i) => {
    const decoded = decodeInstruction(raw.programId, raw.data, raw.accountKeys);
    return {
      index: i,
      programId: raw.programId,
      programName: getProgramName(raw.programId),
      name: decoded?.name ?? null,
      data: raw.data.toString("hex"),
      decoded: decoded?.args ?? null,
      logs: logsByInstruction[i] ?? [],
    };
  });

  // Build account diffs from pre/post balances
  const accountDiffs: AccountDiff[] = allAccountKeys.map((pubkey, i) => {
    const preLamports = meta.preBalances[i] ?? 0;
    const postLamports = meta.postBalances[i] ?? 0;
    const preToken = meta.preTokenBalances?.find((b) => b.accountIndex === i);
    const postToken = meta.postTokenBalances?.find((b) => b.accountIndex === i);

    if (preToken || postToken) {
      const preAmt = preToken?.uiTokenAmount.uiAmountString ?? "0";
      const postAmt = postToken?.uiTokenAmount.uiAmountString ?? "0";
      const preDec = parseFloat(preAmt);
      const postDec = parseFloat(postAmt);
      const delta = isNaN(preDec) || isNaN(postDec) ? undefined : String(postDec - preDec);
      return {
        pubkey,
        preLamports,
        postLamports,
        lamportDelta: postLamports - preLamports,
        isTokenAccount: true,
        preTokenAmount: preAmt,
        postTokenAmount: postAmt,
        tokenDelta: delta,
        mint: (preToken ?? postToken)?.mint,
      };
    }

    return {
      pubkey,
      preLamports,
      postLamports,
      lamportDelta: postLamports - preLamports,
      isTokenAccount: false,
    };
  });

  const callTrace = buildCallTrace(logs, getProgramName);

  const txMeta: TxMeta = {
    slot: tx.slot,
    blockTime: tx.blockTime ?? null,
    fee: meta.fee,
    version: tx.version === "legacy" ? "legacy" : 0,
  };

  if (failed) {
    const rawErr =
      typeof meta.err === "string" ? meta.err : JSON.stringify(meta.err);
    return {
      status: "failed",
      error: { raw: rawErr, plainEnglish: translateError(rawErr) },
      computeUnits: { used: computeUsed, limit: computeLimit },
      instructions,
      logs,
      accountDiffs,
      callTrace,
      txMeta,
    };
  }

  return {
    status: "success",
    computeUnits: { used: computeUsed, limit: computeLimit },
    instructions,
    logs,
    accountDiffs,
    callTrace,
    txMeta,
  };
}
