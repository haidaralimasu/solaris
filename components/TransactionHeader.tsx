"use client";

import { useState, useEffect } from "react";
import type { SimulateResponse, Network } from "@/types/simulate";
import { txUrls } from "@/lib/explorer";
import { extractLogError } from "@/lib/errors";

interface TransactionHeaderProps {
  result: SimulateResponse;
  input: string;
  network: Network;
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      onClick={copy}
      className="rounded px-2 py-1 text-xs font-medium text-[#9AAFC2] transition-colors hover:bg-[#131920] hover:text-[#F0F4F8]"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

function ExternalLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded px-2 py-1 text-xs font-medium text-[#9AAFC2] transition-colors hover:bg-[#131920] hover:text-[#F0F4F8]"
    >
      {label} ↗
    </a>
  );
}

function formatBlockTime(blockTime: number | null): string {
  if (!blockTime) return "Unknown time";
  const diff = Math.floor(Date.now() / 1000) - blockTime;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(blockTime * 1000).toLocaleDateString();
}

function formatFee(lamports: number): string {
  return `${(lamports / 1e9).toFixed(6)} SOL`;
}

let cachedSolPrice: number | null = null;
let cacheTs = 0;

async function fetchSolPrice(): Promise<number | null> {
  if (cachedSolPrice !== null && Date.now() - cacheTs < 5 * 60 * 1000) return cachedSolPrice;
  try {
    const res = await fetch("https://price.jup.ag/v6/price?ids=SOL", { cache: "no-store" });
    const data = await res.json();
    cachedSolPrice = data?.data?.SOL?.price ?? null;
    cacheTs = Date.now();
    return cachedSolPrice;
  } catch {
    return null;
  }
}

export function TransactionHeader({ result, input, network }: TransactionHeaderProps) {
  const { status, computeUnits, error, txMeta } = result;
  const [solPrice, setSolPrice] = useState<number | null>(null);

  useEffect(() => {
    if (txMeta?.fee) fetchSolPrice().then(setSolPrice);
  }, [txMeta?.fee]);

  const pct = computeUnits.limit > 0 ? (computeUnits.used / computeUnits.limit) * 100 : 0;
  const pctRounded = Math.min(pct, 100);
  const isSuccess = status === "success";
  const shortInput = input.length > 20 ? `${input.slice(0, 12)}…${input.slice(-8)}` : input;
  const cuBarColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-[#F5A623]" : "bg-[#F5A623]/70";

  const urls = txUrls(input, network);

  // Use human-readable error from logs if available, fall back to translated code
  const errorMessage = error
    ? (extractLogError(result.logs) ?? error.plainEnglish)
    : null;

  const feeUsd = solPrice && txMeta?.fee
    ? `~$${((txMeta.fee / 1e9) * solPrice).toFixed(4)}`
    : null;

  return (
    <div className="rounded-xl border border-[#1E2632] bg-[#0D1117] overflow-hidden">
      {/* Top row */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-[#131920]">
        {/* Status */}
        <div className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
          isSuccess
            ? "border-emerald-900/60 bg-emerald-950/40 text-emerald-400"
            : "border-red-900/60 bg-red-950/40 text-red-400"
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isSuccess ? "bg-emerald-400" : "bg-red-400 animate-pulse"}`} />
          {isSuccess ? "Success" : "Failed"}
        </div>

        {/* Hash */}
        <div className="flex items-center gap-1 font-mono text-[14px] text-[#C5D3DF]">
          <span>{shortInput}</span>
          <CopyButton text={input} />
        </div>

        {/* Network + share + explorer links */}
        <div className="ml-auto flex items-center gap-1">
          <span className="rounded-md border border-[#1B2433] bg-[#131920] px-2.5 py-1 text-[13px] font-semibold text-[#9AAFC2]">
            {network === "mainnet-beta" ? "Mainnet" : "Devnet"}
          </span>
          <ExternalLink href={urls.solscan} label="Solscan" />
          <ExternalLink href={urls.explorer} label="Explorer" />
          <CopyButton text={typeof window !== "undefined" ? window.location.href : ""} label="Share" />
        </div>
      </div>

      {/* Tx metadata row (debug mode only — txMeta present) */}
      {txMeta && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-[#131920] px-5 py-2.5 text-[12px] text-[#475569]">
          <span>
            <span className="text-[#6B8299]">Slot</span>{" "}
            <span className="font-mono text-[#9AAFC2]">{txMeta.slot.toLocaleString()}</span>
          </span>
          <span className="text-[#1E2632]">·</span>
          <span className="text-[#9AAFC2]">{formatBlockTime(txMeta.blockTime)}</span>
          <span className="text-[#1E2632]">·</span>
          <span>
            <span className="text-[#6B8299]">Fee</span>{" "}
            <span className="font-mono text-[#9AAFC2]">{formatFee(txMeta.fee)}</span>
            {feeUsd && <span className="text-[#475569] ml-1">({feeUsd})</span>}
          </span>
          <span className="text-[#1E2632]">·</span>
          <span className="rounded border border-[#1B2433] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#475569]">
            {txMeta.version === "legacy" ? "legacy" : "v0"}
          </span>
        </div>
      )}

      {/* Error message */}
      {errorMessage && (
        <div className="border-b border-[#131920] px-5 py-3 text-[14px] text-red-300">
          <span className="mr-2 text-red-400">✕</span>
          {errorMessage}
        </div>
      )}

      {/* CU bar */}
      <div className="px-5 py-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-semibold text-[#9AAFC2] uppercase tracking-wider">
            Compute Units
          </span>
          <span className="font-mono text-[13px] text-[#9AAFC2]">
            <span className="text-[#F0F4F8] font-semibold">{computeUnits.used.toLocaleString()}</span>
            <span className="text-[#6B8299]"> / {computeUnits.limit.toLocaleString()}</span>
            <span className="ml-2 text-[#9AAFC2]">({pctRounded.toFixed(1)}%)</span>
          </span>
        </div>
        <div className="h-1 w-full rounded-full bg-[#131920]">
          <div
            className={`h-full rounded-full transition-all duration-700 ${cuBarColor}`}
            style={{ width: `${pctRounded}%` }}
          />
        </div>
      </div>
    </div>
  );
}
