"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { Network, SimulateResponse } from "@/types/simulate";
import { TransactionResult } from "@/components/TransactionResult";
import { HistorySidebar, notifyHistoryUpdated } from "@/components/HistorySidebar";
import { saveToHistory, type SimulationRecord } from "@/lib/history";

const EXAMPLES = [
  {
    label: "Jupiter + Raydium swap",
    detail: "Token swap routed via Jupiter v6 through Raydium AMM",
    badge: "complex",
    network: "mainnet-beta" as Network,
    sig: "4xxEePdTsQZNn2xzb1u3FsBW3qJQAQZwZrV5Xe5tvFnFdLeckYuNYQnCJ8RbVCmBkfhdpD9Zt4kFVwdGXKfBNMYA",
  },
  {
    label: "Jupiter + Orca + Serum",
    detail: "Multi-venue swap: Jupiter routes across Orca, Serum, and Phoenix",
    badge: "complex",
    network: "mainnet-beta" as Network,
    sig: "55Q876rULxVxnQnsA5FRpkeN3dypSEv4Pboe2spZDBCLeQECyhz12r3vc8yumEMERB4peX8S4Fy6iMdGZpiJ9baT",
  },
  {
    label: "Failed: slippage exceeded",
    detail: "Jupiter swap that failed — SlippageToleranceExceeded error",
    badge: "failed",
    network: "mainnet-beta" as Network,
    sig: "5G2zRZ7z21mVkv8jCz52JipuCzWB9RuwigXQ1eE9wsHeDqPWWxgPrbYTrpwn2bsuSsEwz7QSe8tXZUErzVvwGvdN",
  },
  {
    label: "Jupiter + Orca Whirlpool",
    detail: "USDC → USDT swap via Jupiter v6 routing through Orca Whirlpool",
    badge: "simple",
    network: "mainnet-beta" as Network,
    sig: "2weWhhYyGA9xPqFaXVfR9FdBDAjM3AEbebYzEER2bLQn6JJ7tJ8wwtncbvD9qi2xFJuDxHdDGQWQWQ7m1cUCg74S",
  },
];

export default function DebugPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [input, setInput] = useState(() => searchParams.get("sig") ?? "");
  const [network, setNetwork] = useState<Network>(
    (searchParams.get("network") as Network) === "devnet" ? "devnet" : "mainnet-beta"
  );
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<SimulationRecord | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const autoRanRef = useRef(false);

  useEffect(() => {
    if (!selectedRecord) textRef.current?.focus();
  }, [selectedRecord]);

  const runDebug = useCallback(async (txInput: string, net: Network) => {
    setLoading(true);
    setApiError(null);
    setSelectedRecord(null);

    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: txInput, network: net, mode: "debug" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApiError(data.error ?? "Unexpected error");
        return;
      }
      const result = data as SimulateResponse;
      const record = saveToHistory(txInput, net, result, "debug");
      notifyHistoryUpdated();
      setSelectedRecord(record);
      // Update URL so this simulation is shareable
      const params = new URLSearchParams({ sig: txInput, network: net });
      router.replace(`/debug?${params.toString()}`, { scroll: false });
    } catch {
      setApiError("Network error — could not reach the API");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-run when ?sig= is in the URL
  useEffect(() => {
    const sig = searchParams.get("sig");
    if (sig && !autoRanRef.current) {
      autoRanRef.current = true;
      const net = (searchParams.get("network") as Network) === "devnet" ? "devnet" : "mainnet-beta";
      runDebug(sig, net);
    }
  }, [searchParams, runDebug]);

  function handleHistorySelect(record: SimulationRecord) {
    setSelectedRecord(record);
    setApiError(null);
  }

  function resetToForm() {
    setSelectedRecord(null);
    setApiError(null);
    router.replace("/debug", { scroll: false });
    setTimeout(() => textRef.current?.focus(), 50);
  }

  return (
    <div className="flex h-screen flex-col bg-[#03060F] overflow-hidden">
      {/* Top bar */}
      <div className="flex h-14 items-center gap-3 border-b border-[#131920] px-6 flex-shrink-0">
        <h1 className="text-[15px] font-bold tracking-tight text-[#F0F4F8]">Transaction Debugger</h1>
        {selectedRecord && (
          <button
            type="button"
            onClick={resetToForm}
            className="ml-auto flex items-center gap-1.5 text-[13px] font-medium text-[#9AAFC2] hover:text-[#F0F4F8] transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
            New debug
          </button>
        )}
      </div>

      {/* Error bar */}
      {apiError && (
        <div className="flex items-center gap-3 border-b border-red-900/40 bg-red-950/20 px-6 py-3 flex-shrink-0">
          <span className="text-red-400 text-sm">✕</span>
          <span className="text-sm text-red-300">{apiError}</span>
          <button onClick={() => setApiError(null)} className="ml-auto text-xs text-red-600 hover:text-red-400 transition-colors">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left: history */}
        <div className="hidden md:flex w-64 flex-shrink-0 border-r border-[#131920] flex-col overflow-hidden">
          <HistorySidebar
            mode="debug"
            selectedId={selectedRecord?.id ?? null}
            onSelect={handleHistorySelect}
          />
        </div>

        {/* Right: toolbar + content */}
        <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar bar */}
        <div className="flex items-center border-b border-[#131920] px-6 flex-shrink-0">
          {selectedRecord && (
            <button
              type="button"
              onClick={resetToForm}
              className="flex items-center gap-1.5 px-4 py-3 text-[14px] font-semibold text-[#6B8299] hover:text-[#9AAFC2] transition-colors"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
              </svg>
              Back
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={resetToForm}
            className="flex items-center gap-1.5 rounded-lg bg-[#F5A623] px-3.5 py-2 my-2 text-[13px] font-bold text-[#080B14] transition-all hover:bg-[#F5A623]/85"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            New debug
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-5 relative h-10 w-10">
                  <div className="absolute inset-0 rounded-full border-2 border-[#131920]" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#F5A623] animate-spin" />
                </div>
                <p className="text-base font-semibold text-[#C5D3DF]">Replaying transaction…</p>
                <p className="mt-1.5 text-sm text-[#6B8299]">Fetching chain state and building call trace</p>
                <div className="mt-5 mx-auto w-48 h-0.5 rounded-full amber-loader" />
              </div>
            </div>
          ) : selectedRecord ? (
            <div className="p-6">
              <TransactionResult
                result={selectedRecord.result}
                input={selectedRecord.input}
                network={selectedRecord.network}
              />
            </div>
          ) : (
            /* Input form */
            <div className="mx-auto w-full max-w-2xl py-10 px-6">
              <div className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight text-[#F0F4F8]">Debug a transaction</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-[#9AAFC2]">
                  Paste a transaction signature or base64-encoded payload. Solaris replays it
                  against the current chain state and shows the full CPI call trace — including
                  the exact instruction where it failed.
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-[13px] font-semibold text-[#9AAFC2]">
                    Transaction signature <span className="font-normal text-[#6B8299]">(base58) or raw payload (base64)</span>
                  </label>
                  <textarea
                    ref={textRef}
                    rows={5}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && input.trim() && !loading) {
                        e.preventDefault();
                        runDebug(input.trim(), network);
                      }
                    }}
                    disabled={loading}
                    placeholder="5dPcV7… or AQAAAAA…"
                    className="input-premium resize-none"
                    style={{ minHeight: "100px" }}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={network}
                    onChange={(e) => setNetwork(e.target.value as Network)}
                    disabled={loading}
                    className="select-field"
                  >
                    <option value="mainnet-beta">Mainnet Beta</option>
                    <option value="devnet">Devnet</option>
                  </select>
                  <div className="flex-1" />
                  <button
                    type="button"
                    onClick={() => input.trim() && runDebug(input.trim(), network)}
                    disabled={loading || !input.trim()}
                    className="flex items-center gap-2 rounded-xl bg-[#F5A623] px-7 py-2.5 text-[14px] font-bold text-[#080B14] transition-all hover:bg-[#F5A623]/90 disabled:opacity-40"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11V15.89a1.5 1.5 0 0 0 2.3 1.269l9.344-5.89a1.5 1.5 0 0 0 0-2.538L6.3 2.84Z" />
                    </svg>
                    Debug
                  </button>
                </div>

                {/* Examples */}
                <div className="pt-2">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[#6B8299]">
                    Quick examples
                  </p>
                  <div className="space-y-2">
                    {EXAMPLES.map((ex) => (
                      <button
                        key={ex.sig}
                        type="button"
                        onClick={() => { setInput(ex.sig); setNetwork(ex.network); }}
                        className="flex w-full items-center gap-4 rounded-xl border border-[#1B2433] bg-[#0D1117]/60 px-4 py-3.5 text-left transition-all hover:border-[#F5A623]/25 hover:bg-[#0D1117]"
                      >
                        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                          ex.badge === "complex" ? "bg-[#3B82F6]/10" : ex.badge === "failed" ? "bg-red-950/50" : "bg-[#F5A623]/10"
                        }`}>
                          <svg viewBox="0 0 20 20" fill="currentColor" className={`h-3.5 w-3.5 ${
                            ex.badge === "complex" ? "text-[#3B82F6]" : ex.badge === "failed" ? "text-red-400" : "text-[#F5A623]/80"
                          }`}>
                            <path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11V15.89a1.5 1.5 0 0 0 2.3 1.269l9.344-5.89a1.5 1.5 0 0 0 0-2.538L6.3 2.84Z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[14px] font-semibold text-[#F0F4F8]">{ex.label}</p>
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              ex.badge === "complex"
                                ? "bg-[#3B82F6]/10 text-[#3B82F6]"
                                : ex.badge === "failed"
                                ? "bg-red-950/50 text-red-400 border border-red-900/40"
                                : "bg-[#1B2433] text-[#6B8299]"
                            }`}>
                              {ex.badge}
                            </span>
                          </div>
                          <p className="text-[13px] text-[#9AAFC2]">{ex.detail}</p>
                        </div>
                        <span className="font-mono text-xs text-[#6B8299]">
                          {ex.sig.slice(0, 10)}…
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
