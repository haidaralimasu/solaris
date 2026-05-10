"use client";

import { useState, useCallback } from "react";
import type { SimulateResponse, Network } from "@/types/simulate";
import { TransactionHeader } from "./TransactionHeader";
import { CallTrace } from "./CallTrace";
import { CallTreeVisual } from "./CallTreeVisual";
import { InstructionList } from "./InstructionList";
import { ProgramLogViewer } from "./ProgramLogViewer";
import { AccountDiffTable } from "./AccountDiffTable";
import { DiagnosisPanel } from "./DiagnosisPanel";
import { CUProfiler } from "./CUProfiler";

type Tab = "visual" | "trace" | "instructions" | "state" | "logs" | "cu-profile";

interface TransactionResultProps {
  result: SimulateResponse;
  input: string;
  network: Network;
}

export function TransactionResult({ result, input, network }: TransactionResultProps) {
  const [tab, setTab] = useState<Tab>("visual");
  const [exporting, setExporting] = useState(false);

  const changedAccounts = result.accountDiffs.filter(
    (d) => d.lamportDelta !== 0 || d.tokenDelta !== undefined
  );

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "visual", label: "Visual Tree", count: result.callTrace.length || undefined },
    { id: "trace", label: "Call Trace" },
    { id: "instructions", label: "Instructions", count: result.instructions.length },
    { id: "state", label: "State Changes", count: changedAccounts.length || undefined },
    { id: "logs", label: "Logs", count: result.logs.length || undefined },
    { id: "cu-profile", label: "CU Profile" },
  ];

  const handleExportJSON = useCallback(() => {
    setExporting(true);
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        network,
        input,
        result,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const shortInput = input.length > 12 ? input.slice(0, 12) : input;
      a.href = url;
      a.download = `solaris-tx-${shortInput}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [result, input, network]);

  return (
    <div className="flex flex-col gap-4">
      <TransactionHeader result={result} input={input} network={network} />

      {/* Diagnosis panel for failed transactions */}
      {result.status === "failed" && <DiagnosisPanel result={result} />}

      {/* Tab bar with export button */}
      <div className="flex items-center gap-0 border-b border-[#131920]">
        <div className="flex flex-1 items-center gap-0 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`relative flex flex-shrink-0 cursor-pointer items-center gap-1.5 px-4 py-2.5 text-[14px] font-semibold transition-colors focus:outline-none
                ${tab === t.id
                  ? "text-[#F5A623] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-[#F5A623]"
                  : "text-[#6B8299] hover:text-[#9AAFC2]"
                }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={`rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums
                  ${tab === t.id ? "bg-[#F5A623]/10 text-[#F5A623]" : "bg-[#1B2433] text-[#6B8299]"}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Export JSON button */}
        <button
          type="button"
          onClick={handleExportJSON}
          disabled={exporting}
          className="ml-auto flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50"
          style={{
            background: "rgba(245,166,35,0.08)",
            border: "1px solid rgba(245,166,35,0.15)",
            color: "#F5A623",
          }}
          title="Export full transaction data as JSON"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v8m0 0L5 7m3 3 3-3M3 12v1.5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5V12" />
          </svg>
          {exporting ? "Exporting…" : "Export JSON"}
        </button>
      </div>

      {/* Tab content */}
      <div>
        {tab === "visual" && <CallTreeVisual trace={result.callTrace} />}
        {tab === "trace" && <CallTrace trace={result.callTrace} network={network} />}
        {tab === "instructions" && <InstructionList instructions={result.instructions} />}
        {tab === "state" && <AccountDiffTable diffs={result.accountDiffs} network={network} />}
        {tab === "logs" && <ProgramLogViewer logs={result.logs} />}
        {tab === "cu-profile" && <CUProfiler result={result} />}
      </div>
    </div>
  );
}
