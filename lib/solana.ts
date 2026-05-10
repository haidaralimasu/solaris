import {
  Connection,
  VersionedTransaction,
  Transaction,
} from "@solana/web3.js";
import type { Network, InputType } from "@/types/simulate";

const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;

export function detectInputType(input: string): InputType {
  const trimmed = input.trim();
  if (BASE58_REGEX.test(trimmed)) return "signature";
  try {
    const buf = Buffer.from(trimmed, "base64");
    if (buf.length > 32) return "base64";
  } catch {}
  return "invalid";
}

export function buildConnection(network: Network): Connection {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) throw new Error("HELIUS_API_KEY is not set");
  const rpcUrl =
    network === "mainnet-beta"
      ? `https://mainnet.helius-rpc.com/?api-key=${apiKey}`
      : `https://devnet.helius-rpc.com/?api-key=${apiKey}`;
  return new Connection(rpcUrl, "confirmed");
}

export async function fetchTransaction(
  input: string,
  connection: Connection
): Promise<VersionedTransaction | Transaction> {
  const trimmed = input.trim();
  const type = detectInputType(trimmed);

  if (type === "signature") {
    const tx = await connection.getTransaction(trimmed, {
      maxSupportedTransactionVersion: 0,
    });
    if (!tx) throw new Error("TRANSACTION_NOT_FOUND");
    // signatures aren't verified during simulation, so omitting them is safe
    return new VersionedTransaction(tx.transaction.message);
  }

  if (type === "base64") {
    const buf = Buffer.from(trimmed, "base64");
    try {
      return VersionedTransaction.deserialize(buf);
    } catch {
      return Transaction.from(buf);
    }
  }

  throw new Error("INVALID_INPUT");
}
