import { NextRequest, NextResponse } from "next/server";
import { Connection, VersionedTransaction } from "@solana/web3.js";
import { buildConnection } from "@/lib/solana";
import type { ExecuteRequest, ExecuteResponse } from "@/types/circuitBreaker";

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: ExecuteRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { signedTransactionBase64, network } = body;

  if (!signedTransactionBase64 || !network) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (network !== "mainnet-beta" && network !== "devnet") {
    return NextResponse.json({ error: "Invalid network" }, { status: 400 });
  }

  let tx: VersionedTransaction;
  try {
    const buf = Buffer.from(signedTransactionBase64, "base64");
    tx = VersionedTransaction.deserialize(buf);
  } catch {
    return NextResponse.json({ error: "Failed to deserialize transaction" }, { status: 400 });
  }

  if (!tx.signatures.length || tx.signatures.every((s) => s.every((b) => b === 0))) {
    return NextResponse.json({ error: "Transaction is not signed" }, { status: 400 });
  }

  let connection: Connection;
  try {
    connection = buildConnection(network);
  } catch {
    return NextResponse.json({ error: "RPC not configured" }, { status: 500 });
  }

  try {
    const signature = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
      maxRetries: 3,
    });

    await connection.confirmTransaction(
      { signature, ...(await connection.getLatestBlockhash("confirmed")) },
      "confirmed"
    );

    const resp: ExecuteResponse = { signature };
    return NextResponse.json(resp);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Broadcast failed";
    console.error("[circuit-breaker/execute]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
