import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { buildConnection } from "@/lib/solana";
import type {
  AlertCheckRequest,
  AlertCheckResponse,
  AlertCondition,
  AlertMatch,
  AlertConditionType,
} from "@/types/alerts";

const MAX_SIGS = 25;

function matchConditions(
  conditions: AlertCondition[],
  status: "success" | "failed",
  logMessages: string[] | null | undefined,
  meta: { fee?: number; preBalances?: number[]; postBalances?: number[] } | null
): { matched: boolean; conditionType: AlertConditionType } {
  for (const cond of conditions) {
    if (cond.type === "any_activity") {
      return { matched: true, conditionType: "any_activity" };
    }

    if (cond.type === "error_events" && status === "failed") {
      return { matched: true, conditionType: "error_events" };
    }

    if (cond.type === "instruction_discriminator" && logMessages) {
      const discHex = cond.discriminator.toLowerCase().replace(/\s/g, "");
      const matches = logMessages.some((line) =>
        line.toLowerCase().includes(discHex)
      );
      if (matches) {
        return { matched: true, conditionType: "instruction_discriminator" };
      }
    }

    if (cond.type === "large_sol_transfer" && meta?.preBalances && meta?.postBalances) {
      const LAMPORTS_PER_SOL = 1_000_000_000;
      for (let i = 0; i < meta.preBalances.length; i++) {
        const delta = Math.abs(
          (meta.postBalances[i] ?? 0) - (meta.preBalances[i] ?? 0)
        );
        if (delta >= cond.thresholdSol * LAMPORTS_PER_SOL) {
          return { matched: true, conditionType: "large_sol_transfer" };
        }
      }
    }
  }
  return { matched: false, conditionType: "any_activity" };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: AlertCheckRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { programId, network, afterSignature, conditions } = body;

  if (!programId || !network || !conditions?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (network !== "mainnet-beta" && network !== "devnet") {
    return NextResponse.json({ error: "Invalid network" }, { status: 400 });
  }

  let programKey: PublicKey;
  try {
    programKey = new PublicKey(programId);
  } catch {
    return NextResponse.json({ error: "Invalid programId" }, { status: 400 });
  }

  let connection: Connection;
  try {
    connection = buildConnection(network);
  } catch {
    return NextResponse.json({ error: "RPC not configured" }, { status: 500 });
  }

  const sigInfos = await connection.getSignaturesForAddress(programKey, {
    limit: MAX_SIGS,
    ...(afterSignature ? { until: afterSignature } : {}),
  });

  if (sigInfos.length === 0) {
    const resp: AlertCheckResponse = { matches: [], latestSignature: afterSignature ?? null };
    return NextResponse.json(resp);
  }

  // For "any_activity" only, skip fetching full tx data
  const allAnyActivity = conditions.every((c) => c.type === "any_activity");

  const matches: AlertMatch[] = [];

  if (allAnyActivity) {
    for (const info of sigInfos) {
      matches.push({
        signature: info.signature,
        slot: info.slot,
        blockTime: info.blockTime ?? null,
        status: info.err ? "failed" : "success",
        conditionMatched: "any_activity",
      });
    }
  } else {
    const signatures = sigInfos.map((s) => s.signature);
    const txs = await Promise.all(
      signatures.map((sig) =>
        connection.getParsedTransaction(sig, {
          maxSupportedTransactionVersion: 0,
          commitment: "confirmed",
        })
      )
    );

    for (let i = 0; i < sigInfos.length; i++) {
      const info = sigInfos[i];
      const tx = txs[i];
      const status = info.err ? "failed" : "success";
      const logs = tx?.meta?.logMessages ?? [];
      const meta = tx?.meta
        ? {
            fee: tx.meta.fee,
            preBalances: tx.meta.preBalances,
            postBalances: tx.meta.postBalances,
          }
        : null;

      const { matched, conditionType } = matchConditions(conditions, status, logs, meta);
      if (matched) {
        matches.push({
          signature: info.signature,
          slot: info.slot,
          blockTime: info.blockTime ?? null,
          status,
          conditionMatched: conditionType,
        });
      }
    }
  }

  const latestSignature = sigInfos[0]?.signature ?? afterSignature ?? null;
  const resp: AlertCheckResponse = { matches, latestSignature };
  return NextResponse.json(resp);
}
