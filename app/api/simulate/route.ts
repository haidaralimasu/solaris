import { NextRequest, NextResponse } from "next/server";
import { runSimulation, runDebug } from "@/lib/simulate";
import { detectInputType } from "@/lib/solana";
import type { SimulateRequest } from "@/types/simulate";

// Simple in-memory rate limit: 10 req/min per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

// Prune stale entries once per minute
let lastPrune = 0;
function pruneRateLimit() {
  const now = Date.now();
  if (now - lastPrune < 60_000) return;
  lastPrune = now;
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}

export async function POST(request: NextRequest) {
  pruneRateLimit();

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

  let body: SimulateRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { input, network, mode } = body;

  if (!input || typeof input !== "string") {
    return NextResponse.json({ error: "input is required" }, { status: 400 });
  }

  if (network !== "mainnet-beta" && network !== "devnet") {
    return NextResponse.json(
      { error: "network must be mainnet-beta or devnet" },
      { status: 400 }
    );
  }

  const inputType = detectInputType(input.trim());
  if (inputType === "invalid") {
    return NextResponse.json(
      { error: "input must be a transaction signature or base64-encoded transaction" },
      { status: 400 }
    );
  }

  try {
    const useDebug = mode === "debug" && inputType === "signature";
    const result = useDebug
      ? await runDebug(input.trim(), network)
      : await runSimulation(input.trim(), network);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    if (message === "TRANSACTION_NOT_FOUND") {
      return NextResponse.json(
        { error: "Transaction not found — it may have been dropped or never landed" },
        { status: 404 }
      );
    }

    if (message === "TRANSACTION_META_NOT_FOUND") {
      return NextResponse.json(
        { error: "Transaction found but has no execution metadata" },
        { status: 422 }
      );
    }

    if (message === "HELIUS_API_KEY is not set") {
      return NextResponse.json({ error: "RPC not configured" }, { status: 500 });
    }

    console.error("[simulate]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
