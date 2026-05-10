"use client";

import { useState, useCallback, useRef } from "react";
import type { WalletResponse, WalletTx, WalletStats } from "@/types/wallet";
import type { Network } from "@/types/simulate";

const EXPLORERS: Record<Network, string> = {
  "mainnet-beta": "https://solscan.io",
  devnet: "https://solscan.io",
};

function solscanTxUrl(sig: string, network: Network) {
  const cluster = network === "devnet" ? "?cluster=devnet" : "";
  return `${EXPLORERS[network]}/tx/${sig}${cluster}`;
}
function solscanAddrUrl(addr: string, network: Network) {
  const cluster = network === "devnet" ? "?cluster=devnet" : "";
  return `${EXPLORERS[network]}/account/${addr}${cluster}`;
}

function shortAddr(s: string) {
  return s.slice(0, 4) + "…" + s.slice(-4);
}
function lamportsToSol(l: number) {
  return (l / 1e9).toFixed(6);
}
function formatAge(blockTime: number | null): string {
  if (!blockTime) return "–";
  const diffSec = Math.floor(Date.now() / 1000) - blockTime;
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "#0A1628", border: "1px solid #131920" }}>
      <p className="text-xs font-bold uppercase tracking-wider text-[#4A6478] mb-1">{label}</p>
      <p className="font-mono text-xl font-bold" style={{ color: color ?? "#F8FAFC" }}>{value}</p>
      {sub && <p className="text-xs text-[#4A6478] mt-1">{sub}</p>}
    </div>
  );
}

function TxRow({ tx, network }: { tx: WalletTx; network: Network }) {
  const isSuccess = tx.status === "success";
  const lamDelta = tx.lamportDelta;
  const deltaColor = lamDelta > 0 ? "#22C55E" : lamDelta < 0 ? "#EF4444" : "#94A3B8";
  const deltaSign = lamDelta > 0 ? "+" : "";

  return (
    <tr className="border-b border-[#0E1925] hover:bg-[#0A1628] transition-colors">
      <td className="px-4 py-3">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold"
          style={isSuccess
            ? { background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "#22C55E" }
            : { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }
          }
        >
          {isSuccess ? "✓" : "✗"}
        </span>
      </td>
      <td className="px-4 py-3">
        <a
          href={solscanTxUrl(tx.signature, network)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-[#F5A623] hover:underline"
        >
          {shortAddr(tx.signature)}
        </a>
      </td>
      <td className="px-4 py-3 font-mono text-xs text-[#6B8299]">
        {formatAge(tx.blockTime)}
      </td>
      <td className="px-4 py-3 font-mono text-xs" style={{ color: deltaColor }}>
        {deltaSign}{lamportsToSol(lamDelta)} SOL
      </td>
      <td className="px-4 py-3 font-mono text-xs text-[#6B8299]">
        {tx.computeUnitsConsumed != null ? tx.computeUnitsConsumed.toLocaleString() : "–"}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-[#4A6478]">
        {tx.programIds.slice(0, 2).map(shortAddr).join(", ")}
        {tx.programIds.length > 2 && ` +${tx.programIds.length - 2}`}
      </td>
      {tx.errorCode && (
        <td className="px-4 py-3 text-xs text-[#EF4444] max-w-xs truncate" title={tx.errorCode}>
          {tx.errorCode}
        </td>
      )}
    </tr>
  );
}

const EXAMPLE_WALLETS = [
  { label: "Phantom Treasury", addr: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM" },
  { label: "Binance Hot Wallet", addr: "5tzFkiKscXHK5ZXCGbGuygQFpqSkvdQETXqMVrCTSoNN" },
];

export function WalletTracker() {
  const [address, setAddress] = useState("");
  const [network, setNetwork] = useState<Network>("mainnet-beta");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WalletResponse | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchWallet = useCallback(async (addr: string, net: Network, before?: string) => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    if (!before) {
      setLoading(true);
      setError(null);
      setData(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr, network: net, limit: 25, ...(before ? { before } : {}) }),
        signal: ctrl.signal,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to fetch wallet data");

      if (before) {
        setData((prev) => prev ? {
          ...prev,
          transactions: [...prev.transactions, ...json.transactions],
          oldestSignature: json.oldestSignature,
        } : json);
      } else {
        setData(json);
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;
    fetchWallet(address.trim(), network);
  };

  const handleLoadMore = () => {
    if (!data?.oldestSignature || !data) return;
    fetchWallet(data.address, data.network, data.oldestSignature);
  };

  const stats = data?.stats;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#F8FAFC]">Wallet Tracker</h1>
        <p className="text-sm text-[#6B8299] mt-1">
          Monitor any Solana wallet — balances, token holdings, transaction history, and activity stats.
        </p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Wallet address (base58)"
          className="flex-1 rounded-xl px-4 py-3 font-mono text-sm outline-none placeholder-[#2A3E52]"
          style={{
            background: "#0A1628",
            border: "1px solid #1B2C3E",
            color: "#F8FAFC",
          }}
          spellCheck={false}
          autoComplete="off"
        />
        <select
          value={network}
          onChange={(e) => setNetwork(e.target.value as Network)}
          className="rounded-xl px-4 py-3 text-sm font-semibold outline-none cursor-pointer"
          style={{ background: "#0A1628", border: "1px solid #1B2C3E", color: "#9AAFC2" }}
        >
          <option value="mainnet-beta">Mainnet</option>
          <option value="devnet">Devnet</option>
        </select>
        <button
          type="submit"
          disabled={loading || !address.trim()}
          className="rounded-xl px-6 py-3 text-sm font-bold transition-all disabled:opacity-40"
          style={{ background: "#F5A623", color: "#03060F" }}
        >
          {loading ? "Loading…" : "Track"}
        </button>
      </form>

      {/* Example wallets */}
      {!data && !loading && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_WALLETS.map((w) => (
            <button
              key={w.addr}
              type="button"
              onClick={() => { setAddress(w.addr); fetchWallet(w.addr, network); }}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
              style={{ background: "#0A1628", border: "1px solid #1B2C3E", color: "#9AAFC2" }}
            >
              {w.label}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl px-4 py-3 text-sm font-semibold" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 py-8">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#F5A623] border-t-transparent" />
          <span className="text-sm text-[#6B8299]">Fetching wallet data…</span>
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="flex flex-col gap-6">
          {/* Wallet header */}
          <div className="flex items-start justify-between rounded-xl p-4" style={{ background: "#0A1628", border: "1px solid #131920" }}>
            <div>
              <a
                href={solscanAddrUrl(data.address, data.network)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sm text-[#F5A623] hover:underline"
              >
                {data.address}
              </a>
              <div className="flex items-center gap-2 mt-1">
                <span className="rounded px-1.5 py-0.5 text-xs font-bold" style={{ background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.15)", color: "rgba(245,166,35,0.7)" }}>
                  {data.network}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-2xl font-bold text-[#F8FAFC]">{(data.solBalance / 1e9).toFixed(4)} SOL</p>
              <p className="text-xs text-[#4A6478] mt-0.5">{(data.solBalance / 1e9 * 200).toFixed(2)} USD est.</p>
            </div>
          </div>

          {/* Stats grid */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard label="Txns Fetched" value={stats.totalFetched.toString()} />
              <StatCard label="Success Rate" value={`${stats.totalFetched > 0 ? ((stats.successCount / stats.totalFetched) * 100).toFixed(0) : 0}%`} color={stats.successCount / stats.totalFetched > 0.95 ? "#22C55E" : "#F5A623"} />
              <StatCard label="Total Fees" value={stats.totalFeesSOL.toFixed(6)} sub="SOL" />
              <StatCard label="Total CU" value={stats.totalCUConsumed.toLocaleString()} />
              <StatCard label="Txns 24h" value={stats.totalTxLast24h.toString()} />
              <StatCard
                label="Net Flow"
                value={`${stats.netLamportDelta > 0 ? "+" : ""}${(stats.netLamportDelta / 1e9).toFixed(4)} SOL`}
                color={stats.netLamportDelta >= 0 ? "#22C55E" : "#EF4444"}
              />
            </div>
          )}

          {/* Token balances */}
          {data.tokenBalances.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#4A6478] mb-3">Token Holdings ({data.tokenBalances.length})</p>
              <div className="flex flex-wrap gap-2">
                {data.tokenBalances.map((t) => (
                  <div
                    key={t.mint}
                    className="rounded-lg px-3 py-2"
                    style={{ background: "#0A1628", border: "1px solid #131920" }}
                  >
                    <p className="font-mono text-xs text-[#9AAFC2]">{shortAddr(t.mint)}</p>
                    <p className="font-mono text-sm font-bold text-[#F8FAFC]">
                      {t.uiAmount?.toLocaleString(undefined, { maximumFractionDigits: 4 }) ?? "–"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transaction history */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#4A6478] mb-3">
              Transaction History ({data.transactions.length})
            </p>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #131920" }}>
              <table className="w-full text-left">
                <thead>
                  <tr style={{ background: "#070D17", borderBottom: "1px solid #131920" }}>
                    {["Status", "Signature", "Age", "SOL Delta", "CU", "Programs"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#2A3E52]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((tx) => (
                    <TxRow key={tx.signature} tx={tx} network={data.network} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Load more */}
            {data.oldestSignature && (
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="mt-3 w-full rounded-xl py-2.5 text-sm font-semibold transition-all disabled:opacity-40"
                style={{ background: "#0A1628", border: "1px solid #1B2C3E", color: "#9AAFC2" }}
              >
                {loadingMore ? "Loading…" : "Load 25 More"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
