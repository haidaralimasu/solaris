import { NextRequest, NextResponse } from "next/server";
import { Transaction, TransactionInstruction, PublicKey } from "@solana/web3.js";
import { runSimulation } from "@/lib/simulate";
import type { Network } from "@/types/simulate";

export type BuildSimulateRequest = {
  payer: string;
  programId: string;
  accounts: { pubkey: string; isWritable: boolean; isSigner: boolean }[];
  dataHex: string;
  network: Network;
};

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
let lastPrune = 0;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  if (now - lastPrune >= 60_000) {
    lastPrune = now;
    for (const [k, v] of rateLimitMap) {
      if (now > v.resetAt) rateLimitMap.delete(k);
    }
  }
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded — max 10 requests per minute" },
      { status: 429 }
    );
  }

  let body: BuildSimulateRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { payer, programId, accounts = [], dataHex = "", network } = body;

  if (!payer || !programId) {
    return NextResponse.json(
      { error: "payer and programId are required" },
      { status: 400 }
    );
  }

  if (network !== "mainnet-beta" && network !== "devnet") {
    return NextResponse.json(
      { error: "network must be mainnet-beta or devnet" },
      { status: 400 }
    );
  }

  let payerKey: PublicKey;
  let programKey: PublicKey;
  try {
    payerKey = new PublicKey(payer);
    programKey = new PublicKey(programId);
  } catch {
    return NextResponse.json(
      { error: "Invalid payer or programId — must be valid base58 public keys" },
      { status: 400 }
    );
  }

  let dataBuffer = Buffer.alloc(0);
  if (dataHex.trim()) {
    const hex = dataHex.replace(/[\s,]/g, "");
    if (!/^[0-9a-fA-F]*$/.test(hex)) {
      return NextResponse.json(
        { error: "dataHex must be a valid hex string (e.g. 08000000)" },
        { status: 400 }
      );
    }
    if (hex.length % 2 !== 0) {
      return NextResponse.json(
        { error: "dataHex must have an even number of hex characters" },
        { status: 400 }
      );
    }
    dataBuffer = Buffer.from(hex, "hex");
  }

  const accountMetas: { pubkey: PublicKey; isWritable: boolean; isSigner: boolean }[] = [];
  for (let i = 0; i < accounts.length; i++) {
    const a = accounts[i];
    try {
      accountMetas.push({
        pubkey: new PublicKey(a.pubkey),
        isWritable: !!a.isWritable,
        isSigner: !!a.isSigner,
      });
    } catch {
      return NextResponse.json(
        { error: `Invalid pubkey for account ${i}: "${a.pubkey}"` },
        { status: 400 }
      );
    }
  }

  try {
    const instruction = new TransactionInstruction({
      programId: programKey,
      keys: accountMetas,
      data: dataBuffer,
    });

    const tx = new Transaction();
    tx.feePayer = payerKey;
    // Dummy blockhash — replaced by replaceRecentBlockhash: true during simulation
    tx.recentBlockhash = "11111111111111111111111111111111";
    tx.add(instruction);

    const serialized = tx.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });
    const base64 = serialized.toString("base64");

    const result = await runSimulation(base64, network);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    if (message === "HELIUS_API_KEY is not set") {
      return NextResponse.json({ error: "RPC not configured" }, { status: 500 });
    }

    console.error("[build-simulate]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
