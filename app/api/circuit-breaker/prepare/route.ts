import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { buildConnection } from "@/lib/solana";
import type { PrepareRequest, PrepareResponse } from "@/types/circuitBreaker";

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: PrepareRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { payer, network, programId, instructionData, accounts } = body;

  if (!payer || !programId || !instructionData || !accounts || !network) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (network !== "mainnet-beta" && network !== "devnet") {
    return NextResponse.json({ error: "Invalid network" }, { status: 400 });
  }

  let payerKey: PublicKey;
  let programKey: PublicKey;
  try {
    payerKey = new PublicKey(payer);
    programKey = new PublicKey(programId);
  } catch {
    return NextResponse.json({ error: "Invalid public key in payer or programId" }, { status: 400 });
  }

  const hexData = instructionData.replace(/\s/g, "");
  if (!/^[0-9a-fA-F]*$/.test(hexData)) {
    return NextResponse.json({ error: "instructionData must be valid hex" }, { status: 400 });
  }

  const keyMetas: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[] = [];
  for (const acc of accounts) {
    try {
      keyMetas.push({
        pubkey: new PublicKey(acc.address),
        isSigner: acc.signer,
        isWritable: acc.writable,
      });
    } catch {
      return NextResponse.json(
        { error: `Invalid account address: ${acc.address}` },
        { status: 400 }
      );
    }
  }

  let connection: Connection;
  try {
    connection = buildConnection(network);
  } catch {
    return NextResponse.json({ error: "RPC not configured" }, { status: 500 });
  }

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const ix = new TransactionInstruction({
    programId: programKey,
    data: hexData.length > 0 ? Buffer.from(hexData, "hex") : Buffer.alloc(0),
    keys: keyMetas,
  });

  const message = new TransactionMessage({
    payerKey,
    recentBlockhash: blockhash,
    instructions: [ix],
  }).compileToV0Message();

  const tx = new VersionedTransaction(message);
  const transactionBase64 = Buffer.from(tx.serialize()).toString("base64");

  const resp: PrepareResponse = { transactionBase64, blockhash, lastValidBlockHeight };
  return NextResponse.json(resp);
}
