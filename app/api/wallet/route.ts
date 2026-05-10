import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { buildConnection } from "@/lib/solana";
import type {
  WalletRequest,
  WalletResponse,
  WalletTx,
  WalletStats,
  TokenBalance,
} from "@/types/wallet";

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 25;

function computeStats(txs: WalletTx[], now: number): WalletStats {
  const DAY_MS = 86_400_000;
  return {
    totalFetched: txs.length,
    successCount: txs.filter((t) => t.status === "success").length,
    failedCount: txs.filter((t) => t.status === "failed").length,
    totalFeesSOL: txs.reduce((s, t) => s + t.fee, 0) / 1_000_000_000,
    totalCUConsumed: txs.reduce((s, t) => s + (t.computeUnitsConsumed ?? 0), 0),
    totalTxLast24h: txs.filter(
      (t) => t.blockTime !== null && now - t.blockTime * 1000 < DAY_MS
    ).length,
    netLamportDelta: txs.reduce((s, t) => s + t.lamportDelta, 0),
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: WalletRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { address, network, before } = body;
  const limit = Math.min(body.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

  if (!address || !network) {
    return NextResponse.json({ error: "address and network are required" }, { status: 400 });
  }

  if (network !== "mainnet-beta" && network !== "devnet") {
    return NextResponse.json({ error: "Invalid network" }, { status: 400 });
  }

  let walletKey: PublicKey;
  try {
    walletKey = new PublicKey(address);
  } catch {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  let connection: Connection;
  try {
    connection = buildConnection(network);
  } catch {
    return NextResponse.json({ error: "RPC not configured" }, { status: 500 });
  }

  // Fetch SOL balance and tx signatures in parallel
  const [balanceResult, sigInfos] = await Promise.all([
    connection.getBalance(walletKey, "confirmed").catch(() => 0),
    connection.getSignaturesForAddress(walletKey, {
      limit,
      ...(before ? { before } : {}),
    }).catch(() => []),
  ]);

  // Fetch token accounts
  let tokenBalances: TokenBalance[] = [];
  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletKey, {
      programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    }, "confirmed");

    const mapped: TokenBalance[] = [];
    for (const acct of tokenAccounts.value) {
      const info = acct.account.data.parsed?.info;
      if (!info) continue;
      const uiAmount: number | null = info.tokenAmount?.uiAmount ?? null;
      if (uiAmount === 0 || uiAmount === null) continue;
      mapped.push({
        mint: info.mint as string,
        symbol: null,
        uiAmount,
        decimals: (info.tokenAmount?.decimals as number) ?? 0,
      });
    }
    tokenBalances = mapped
      .sort((a, b) => (b.uiAmount ?? 0) - (a.uiAmount ?? 0))
      .slice(0, 20);
  } catch {
    // non-fatal
  }

  if (sigInfos.length === 0) {
    const emptyStats = computeStats([], Date.now());
    const resp: WalletResponse = {
      address,
      network,
      solBalance: balanceResult,
      tokenBalances,
      transactions: [],
      stats: emptyStats,
      oldestSignature: null,
      newestSignature: null,
    };
    return NextResponse.json(resp);
  }

  const signatures = sigInfos.map((s) => s.signature);
  const txs = await connection.getParsedTransactions(signatures, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });

  const walletTxs: WalletTx[] = sigInfos.map((info, i) => {
    const tx = txs[i];
    const meta = tx?.meta;
    const msg = tx?.transaction?.message;

    // Find the wallet's index in account keys to compute lamport delta
    let walletIndex = -1;
    let lamportDelta = 0;
    if (msg && "accountKeys" in msg) {
      const keys = (msg as { accountKeys: { pubkey: { toBase58: () => string } }[] }).accountKeys;
      walletIndex = keys.findIndex((k) => k.pubkey.toBase58() === address);
    }
    if (walletIndex >= 0 && meta?.preBalances && meta?.postBalances) {
      lamportDelta = (meta.postBalances[walletIndex] ?? 0) - (meta.preBalances[walletIndex] ?? 0);
    }

    // Extract unique program IDs from instructions
    const programIds: string[] = [];
    if (msg && "instructions" in msg) {
      const ixs = (msg as { instructions: { programId?: { toBase58: () => string }; program?: string }[] }).instructions;
      for (const ix of ixs) {
        const pid = ix.programId?.toBase58();
        if (pid && !programIds.includes(pid)) programIds.push(pid);
      }
    }

    let instructionCount = 0;
    if (msg && "instructions" in msg) {
      instructionCount = (msg as { instructions: unknown[] }).instructions.length;
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
      computeUnitsConsumed: meta?.computeUnitsConsumed ?? null,
      instructionCount,
      programIds,
      lamportDelta,
      errorCode,
    };
  });

  const stats = computeStats(walletTxs, Date.now());

  const resp: WalletResponse = {
    address,
    network,
    solBalance: balanceResult,
    tokenBalances,
    transactions: walletTxs,
    stats,
    oldestSignature: sigInfos[sigInfos.length - 1]?.signature ?? null,
    newestSignature: sigInfos[0]?.signature ?? null,
  };

  return NextResponse.json(resp);
}
