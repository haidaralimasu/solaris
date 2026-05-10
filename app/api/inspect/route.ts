import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { buildConnection } from "@/lib/solana";
import type {
  InspectRequest,
  InspectResponse,
  InspectTx,
  InspectStats,
  TopCaller,
} from "@/types/inspect";

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 25;

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function computeStats(
  txs: InspectTx[],
  now: number
): InspectStats {
  const success = txs.filter((t) => t.status === "success");
  const failed = txs.filter((t) => t.status === "failed");

  const cuValues = txs
    .map((t) => t.computeUnitsConsumed)
    .filter((c): c is number => c !== null && c > 0);

  const feeValues = txs.map((t) => t.fee);
  const avgFee = feeValues.length > 0
    ? feeValues.reduce((a, b) => a + b, 0) / feeValues.length
    : 0;

  const DAY_MS = 86_400_000;
  const HOUR_MS = 3_600_000;
  const txLast24h = txs.filter(
    (t) => t.blockTime !== null && now - t.blockTime * 1000 < DAY_MS
  ).length;
  const txLast1h = txs.filter(
    (t) => t.blockTime !== null && now - t.blockTime * 1000 < HOUR_MS
  ).length;

  // Top callers by tx count
  const callerMap = new Map<string, { count: number; successCount: number }>();
  for (const tx of txs) {
    if (!tx.feePayer) continue;
    const entry = callerMap.get(tx.feePayer) ?? { count: 0, successCount: 0 };
    entry.count++;
    if (tx.status === "success") entry.successCount++;
    callerMap.set(tx.feePayer, entry);
  }
  const topCallers: TopCaller[] = Array.from(callerMap.entries())
    .map(([address, { count, successCount }]) => ({ address, count, successCount }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalFetched: txs.length,
    successCount: success.length,
    failedCount: failed.length,
    successRate: txs.length > 0 ? success.length / txs.length : 0,
    avgComputeUnits: cuValues.length > 0
      ? Math.round(cuValues.reduce((a, b) => a + b, 0) / cuValues.length)
      : 0,
    medianComputeUnits: Math.round(median(cuValues)),
    maxComputeUnits: cuValues.length > 0 ? Math.max(...cuValues) : 0,
    avgFeeSOL: avgFee / 1_000_000_000,
    txLast24h,
    txLast1h,
    topCallers,
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: InspectRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { programId, network, before } = body;
  const limit = Math.min(body.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

  if (!programId || !network) {
    return NextResponse.json({ error: "programId and network are required" }, { status: 400 });
  }

  if (network !== "mainnet-beta" && network !== "devnet") {
    return NextResponse.json({ error: "Invalid network" }, { status: 400 });
  }

  let programKey: PublicKey;
  try {
    programKey = new PublicKey(programId);
  } catch {
    return NextResponse.json({ error: "Invalid program address" }, { status: 400 });
  }

  let connection: Connection;
  try {
    connection = buildConnection(network);
  } catch {
    return NextResponse.json({ error: "RPC not configured" }, { status: 500 });
  }

  let sigInfos: Awaited<ReturnType<typeof connection.getSignaturesForAddress>>;
  try {
    sigInfos = await connection.getSignaturesForAddress(programKey, {
      limit,
      ...(before ? { before } : {}),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "RPC error fetching signatures";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  if (sigInfos.length === 0) {
    const emptyStats = computeStats([], Date.now());
    const resp: InspectResponse = {
      programId,
      network,
      transactions: [],
      stats: emptyStats,
      oldestSignature: null,
      newestSignature: null,
    };
    return NextResponse.json(resp);
  }

  const signatures = sigInfos.map((s) => s.signature);

  let txs: Awaited<ReturnType<typeof connection.getParsedTransactions>>;
  try {
    txs = await connection.getParsedTransactions(signatures, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "RPC error fetching transactions";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const inspectTxs: InspectTx[] = sigInfos.map((info, i) => {
    const tx = txs[i];
    const meta = tx?.meta;
    const msg = tx?.transaction?.message;

    let feePayer: string | null = null;
    if (msg && "accountKeys" in msg) {
      const keys = (msg as { accountKeys: { pubkey: { toBase58: () => string }; signer: boolean }[] }).accountKeys;
      const signerKey = keys.find((k) => k.signer);
      feePayer = signerKey?.pubkey?.toBase58() ?? null;
    }

    let instructionCount = 0;
    if (msg) {
      if ("instructions" in msg) {
        instructionCount = (msg as { instructions: unknown[] }).instructions.length;
      }
    }

    let errorCode: string | null = null;
    if (info.err) {
      errorCode = typeof info.err === "string" ? info.err : JSON.stringify(info.err);
      if (errorCode.length > 80) errorCode = errorCode.slice(0, 80) + "…";
    }

    return {
      signature: info.signature,
      slot: info.slot,
      blockTime: info.blockTime ?? null,
      status: info.err ? "failed" : "success",
      fee: meta?.fee ?? 0,
      feePayer,
      computeUnitsConsumed: meta?.computeUnitsConsumed ?? null,
      instructionCount,
      logCount: meta?.logMessages?.length ?? 0,
      errorCode,
    };
  });

  const stats = computeStats(inspectTxs, Date.now());

  const resp: InspectResponse = {
    programId,
    network,
    transactions: inspectTxs,
    stats,
    oldestSignature: sigInfos[sigInfos.length - 1]?.signature ?? null,
    newestSignature: sigInfos[0]?.signature ?? null,
  };

  return NextResponse.json(resp);
}
