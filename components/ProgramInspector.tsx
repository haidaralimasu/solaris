"use client";

import { useState, useCallback, useRef } from "react";
import type { InspectResponse, InspectTx, TopCaller } from "@/types/inspect";
import type { Network } from "@/types/simulate";
import { accountUrl } from "@/lib/explorer";
import { getProgramName } from "@/lib/programs";

const NETWORKS: Network[] = ["mainnet-beta", "devnet"];

// ─── Utility helpers ──────────────────────────────────────────────────────────

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatCU(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function timeAgo(ts: number): string {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function formatPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "amber" | "green" | "red" | "blue";
}) {
  const colors = {
    amber: "text-[#F5A623]",
    green: "text-emerald-400",
    red: "text-red-400",
    blue: "text-blue-400",
  };
  return (
    <div className="rounded-xl border border-[#1E2632] bg-[#0D1117] p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#475569] mb-1">{label}</p>
      <p className={`text-[22px] font-bold tabular-nums ${accent ? colors[accent] : "text-[#F0F4F8]"}`}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-[#2A3441] mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── CU bar ───────────────────────────────────────────────────────────────────

function CUBar({ value, max }: { value: number; max: number }) {
  if (!max || !value) return <span className="font-mono text-[11px] text-[#2A3441]">—</span>;
  const pct = (value / max) * 100;
  const color =
    pct >= 80 ? "#EF4444" : pct >= 50 ? "#F5A623" : "#22C55E";
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1 rounded-full bg-[#131920]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(pct, 100)}%`, background: color }}
        />
      </div>
      <span className="font-mono text-[11px] text-[#6B8299] w-12 text-right tabular-nums">
        {formatCU(value)}
      </span>
    </div>
  );
}

// ─── Transaction row ──────────────────────────────────────────────────────────

function TxRow({
  tx,
  network,
  maxCU,
  onDebug,
}: {
  tx: InspectTx;
  network: Network;
  maxCU: number;
  onDebug: (sig: string) => void;
}) {
  const explorerUrl =
    network === "mainnet-beta"
      ? `https://solscan.io/tx/${tx.signature}`
      : `https://solscan.io/tx/${tx.signature}?cluster=devnet`;

  const callerUrl = tx.feePayer ? accountUrl(tx.feePayer, network) : null;

  return (
    <tr className="group border-b border-[#0D1117] hover:bg-white/[0.015] transition-colors">
      {/* Status dot */}
      <td className="py-2.5 pl-5 pr-3">
        <span className={`inline-block h-2 w-2 rounded-full ${tx.status === "success" ? "bg-emerald-500" : "bg-red-500"}`} />
      </td>

      {/* Signature */}
      <td className="py-2.5 pr-4">
        <div className="flex items-center gap-1.5">
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[12px] text-[#6B8299] hover:text-[#F5A623] transition-colors"
            title={tx.signature}
          >
            {shortAddr(tx.signature)}
          </a>
          <button
            onClick={() => onDebug(tx.signature)}
            className="opacity-0 group-hover:opacity-100 rounded px-1 py-0.5 text-[10px] text-[#475569] hover:text-[#F5A623] border border-[#1B2433] transition-all"
            title="Open in Debugger"
          >
            Debug
          </button>
        </div>
        {tx.errorCode && (
          <p className="font-mono text-[10px] text-red-400/70 truncate max-w-[200px] mt-0.5">{tx.errorCode}</p>
        )}
      </td>

      {/* Age */}
      <td className="py-2.5 pr-4 text-[12px] text-[#475569] whitespace-nowrap">
        {tx.blockTime ? timeAgo(tx.blockTime * 1000) : "—"}
      </td>

      {/* Fee payer */}
      <td className="py-2.5 pr-4">
        {tx.feePayer && callerUrl ? (
          <a
            href={callerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[12px] text-[#6B8299] hover:text-[#F5A623] transition-colors"
          >
            {shortAddr(tx.feePayer)}
          </a>
        ) : (
          <span className="text-[12px] text-[#2A3441]">—</span>
        )}
      </td>

      {/* Instructions */}
      <td className="py-2.5 pr-4 text-center">
        <span className="font-mono text-[12px] text-[#6B8299]">{tx.instructionCount || "—"}</span>
      </td>

      {/* CU bar */}
      <td className="py-2.5 pr-5">
        <CUBar value={tx.computeUnitsConsumed ?? 0} max={maxCU} />
      </td>
    </tr>
  );
}

// ─── Top callers table ────────────────────────────────────────────────────────

function TopCallersTable({ callers, network }: { callers: TopCaller[]; network: Network }) {
  if (callers.length === 0) {
    return <p className="text-[12px] text-[#2A3441] py-4 text-center">No caller data</p>;
  }
  const maxCount = callers[0]?.count ?? 1;

  return (
    <div className="space-y-1.5">
      {callers.map((caller) => (
        <div key={caller.address} className="flex items-center gap-3">
          <a
            href={accountUrl(caller.address, network)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[12px] text-[#6B8299] hover:text-[#F5A623] transition-colors w-28 shrink-0"
            title={caller.address}
          >
            {shortAddr(caller.address)}
          </a>
          <div className="flex-1 h-1.5 rounded-full bg-[#131920]">
            <div
              className="h-full rounded-full bg-[#F5A623]/60"
              style={{ width: `${(caller.count / maxCount) * 100}%` }}
            />
          </div>
          <span className="font-mono text-[11px] text-[#475569] w-8 text-right tabular-nums">{caller.count}</span>
          <span className={`text-[10px] font-semibold w-10 text-right tabular-nums ${
            caller.successCount === caller.count ? "text-emerald-400/60" : "text-red-400/60"
          }`}>
            {formatPercent(caller.successCount / caller.count)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProgramInspector() {
  const [programId, setProgramId] = useState("");
  const [network, setNetwork] = useState<Network>("mainnet-beta");
  const [data, setData] = useState<InspectResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [copiedSig, setCopiedSig] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const inspect = useCallback(
    async (pid: string, net: Network, before?: string) => {
      if (!pid.trim()) return;

      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const isLoadMore = !!before;
      if (!isLoadMore) {
        setLoading(true);
        setData(null);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const res = await fetch("/api/inspect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ programId: pid.trim(), network: net, before }),
          signal: ctrl.signal,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Inspect failed");
        }

        const result: InspectResponse = await res.json();

        if (isLoadMore) {
          setData((prev) =>
            prev
              ? {
                  ...result,
                  transactions: [...prev.transactions, ...result.transactions],
                  stats: result.stats,
                }
              : result
          );
        } else {
          setData(result);
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    inspect(programId, network);
  }

  function handleDebug(sig: string) {
    const url = `/debug?sig=${encodeURIComponent(sig)}&network=${network}`;
    window.open(url, "_blank");
  }

  function handleExport() {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `solaris-inspect-${data.programId.slice(0, 8)}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyAddress(addr: string) {
    navigator.clipboard.writeText(addr).then(() => {
      setCopiedSig(addr);
      setTimeout(() => setCopiedSig(null), 1500);
    });
  }

  const maxCU = data
    ? Math.max(...data.transactions.map((t) => t.computeUnitsConsumed ?? 0), 1)
    : 1;

  const programName = data ? getProgramName(data.programId) : null;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Page header */}
      <div className="border-b border-[#131920] px-6 py-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[20px] font-bold text-[#F0F4F8]">Program Inspector</h1>
            <p className="mt-0.5 text-[13px] text-[#475569]">
              Inspect any on-chain program — recent transactions, success rates, callers, compute unit patterns.
            </p>
          </div>
          {data && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 rounded-xl border border-[#1B2433] px-4 py-2 text-[12px] font-semibold text-[#475569] hover:text-[#9AAFC2] hover:border-[#2A3441] transition-colors"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path fillRule="evenodd" d="M10 3a.75.75 0 0 1 .75.75v8.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3.75A.75.75 0 0 1 10 3ZM3.75 16.5a.75.75 0 0 0 0 1.5h12.5a.75.75 0 0 0 0-1.5H3.75Z" clipRule="evenodd" />
              </svg>
              Export JSON
            </button>
          )}
        </div>

        {/* Search bar */}
        <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-3 flex-wrap">
          <input
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
            placeholder="Program address (base58)"
            className="flex-1 min-w-[300px] rounded-xl border border-[#1B2433] bg-[#080B14] px-4 py-2.5 font-mono text-[13px] text-[#F0F4F8] placeholder-[#2A3441] outline-none focus:border-[#F5A623]/40 transition-colors"
          />
          <select
            value={network}
            onChange={(e) => setNetwork(e.target.value as Network)}
            className="rounded-xl border border-[#1B2433] bg-[#080B14] px-3 py-2.5 text-[13px] text-[#9AAFC2] outline-none focus:border-[#F5A623]/40 transition-colors"
          >
            {NETWORKS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <button
            type="submit"
            disabled={loading || !programId.trim()}
            className="rounded-xl bg-[#F5A623] px-5 py-2.5 text-[13px] font-bold text-[#080B14] hover:bg-[#F5A623]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Loading…" : "Inspect"}
          </button>
        </form>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-700/40 bg-red-950/15 px-5 py-4 mb-6">
            <p className="text-[13px] font-semibold text-red-300">{error}</p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-xl border border-[#1E2632] bg-[#0D1117] p-4 h-20 animate-pulse" />
              ))}
            </div>
            <div className="rounded-xl border border-[#1E2632] bg-[#0D1117] h-64 animate-pulse" />
          </div>
        )}

        {/* Results */}
        {data && !loading && (
          <div className="space-y-6">
            {/* Program identity */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[#F5A623]/10 border border-[#F5A623]/20 flex items-center justify-center">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-[#F5A623]">
                    <path fillRule="evenodd" d="M6.28 5.22a.75.75 0 0 1 0 1.06L2.56 10l3.72 3.72a.75.75 0 0 1-1.06 1.06L.97 10.53a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Zm7.44 0a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L19.44 10l-3.72-3.72a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[15px] font-bold text-[#F0F4F8]">
                      {programName ?? "Unknown Program"}
                    </p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      data.network === "mainnet-beta" ? "bg-[#F5A623]/10 text-[#F5A623]" : "bg-emerald-900/30 text-emerald-400"
                    }`}>
                      {data.network === "mainnet-beta" ? "mainnet" : "devnet"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <a
                      href={accountUrl(data.programId, data.network)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[12px] text-[#475569] hover:text-[#F5A623] transition-colors"
                    >
                      {data.programId}
                    </a>
                    <button
                      onClick={() => copyAddress(data.programId)}
                      className="text-[11px] text-[#2A3441] hover:text-[#9AAFC2] transition-colors"
                    >
                      {copiedSig === data.programId ? "✓" : "⎘"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Success Rate"
                value={formatPercent(data.stats.successRate)}
                sub={`${data.stats.successCount} success / ${data.stats.failedCount} failed`}
                accent={data.stats.successRate >= 0.95 ? "green" : data.stats.successRate >= 0.7 ? "amber" : "red"}
              />
              <StatCard
                label="Avg Compute Units"
                value={formatCU(data.stats.avgComputeUnits)}
                sub={`Median ${formatCU(data.stats.medianComputeUnits)} · Max ${formatCU(data.stats.maxComputeUnits)}`}
                accent="amber"
              />
              <StatCard
                label="Txs (Last 24h)"
                value={String(data.stats.txLast24h)}
                sub={`${data.stats.txLast1h} in last hour`}
              />
              <StatCard
                label="Avg Fee"
                value={data.stats.avgFeeSOL ? `${data.stats.avgFeeSOL.toFixed(6)} SOL` : "—"}
                sub={`${data.stats.totalFetched} txs sampled`}
              />
            </div>

            {/* Main content: tx table + callers */}
            <div className="flex gap-6 flex-col lg:flex-row">
              {/* Transaction table */}
              <div className="flex-1 min-w-0 rounded-xl border border-[#1E2632] bg-[#0D1117] overflow-hidden">
                <div className="flex items-center gap-3 border-b border-[#131920] px-5 py-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                    Recent Transactions
                  </span>
                  <span className="rounded bg-[#131920] px-1.5 py-0.5 text-[10px] text-[#475569]">
                    {data.transactions.length}
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> success
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-red-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> failed
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#0D1117]">
                        <th className="py-2 pl-5 pr-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#2A3441] w-8" />
                        <th className="py-2 pr-4 text-left text-[10px] font-semibold uppercase tracking-wider text-[#2A3441]">Signature</th>
                        <th className="py-2 pr-4 text-left text-[10px] font-semibold uppercase tracking-wider text-[#2A3441]">Age</th>
                        <th className="py-2 pr-4 text-left text-[10px] font-semibold uppercase tracking-wider text-[#2A3441]">Caller</th>
                        <th className="py-2 pr-4 text-center text-[10px] font-semibold uppercase tracking-wider text-[#2A3441]">Ix</th>
                        <th className="py-2 pr-5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#2A3441]">CU</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.transactions.map((tx) => (
                        <TxRow
                          key={tx.signature}
                          tx={tx}
                          network={data.network}
                          maxCU={maxCU}
                          onDebug={handleDebug}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Load more */}
                {data.oldestSignature && data.transactions.length >= 25 && (
                  <div className="border-t border-[#131920] px-5 py-3 text-center">
                    <button
                      onClick={() => inspect(programId, network, data.oldestSignature ?? undefined)}
                      disabled={loadingMore}
                      className="text-[12px] font-semibold text-[#475569] hover:text-[#F5A623] transition-colors disabled:opacity-40"
                    >
                      {loadingMore ? "Loading…" : "Load 25 more"}
                    </button>
                  </div>
                )}
              </div>

              {/* Top callers sidebar */}
              <div className="w-full lg:w-64 shrink-0">
                <div className="rounded-xl border border-[#1E2632] bg-[#0D1117] overflow-hidden">
                  <div className="border-b border-[#131920] px-4 py-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                      Top Callers
                    </span>
                  </div>
                  <div className="p-4">
                    <TopCallersTable callers={data.stats.topCallers} network={data.network} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!data && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0D1117] border border-[#1E2632] mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7 text-[#2A3441]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <p className="text-[15px] font-semibold text-[#475569]">Enter a program address</p>
            <p className="mt-1 text-[13px] text-[#2A3441] max-w-sm">
              Paste any Solana program ID above to see its recent transactions, success rate, compute unit patterns, and top callers.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 justify-center">
              {[
                { label: "Jupiter v6", id: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4" },
                { label: "Orca Whirlpool", id: "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3sFKDcc" },
                { label: "Raydium AMM", id: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8" },
              ].map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => { setProgramId(ex.id); inspect(ex.id, network); }}
                  className="rounded-xl border border-[#1B2433] bg-[#080B14] px-3 py-1.5 text-[12px] font-semibold text-[#475569] hover:text-[#F5A623] hover:border-[#F5A623]/20 transition-colors"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
