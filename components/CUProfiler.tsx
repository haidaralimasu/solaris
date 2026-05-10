"use client";

import type { CallNode, SimulateResponse } from "@/types/simulate";

interface ProgramCU {
  programId: string;
  programName: string | null;
  totalCU: number;
  callCount: number;
  pct: number;
}

function flattenTrace(nodes: CallNode[]): ProgramCU[] {
  const map = new Map<string, { programName: string | null; totalCU: number; callCount: number }>();

  function walk(node: CallNode) {
    const cu = node.computeUnits ?? 0;
    if (cu > 0) {
      const existing = map.get(node.programId) ?? { programName: node.programName, totalCU: 0, callCount: 0 };
      existing.totalCU += cu;
      existing.callCount += 1;
      map.set(node.programId, existing);
    }
    for (const child of node.children) walk(child);
  }

  for (const node of nodes) walk(node);

  const entries = Array.from(map.entries()).map(([programId, v]) => ({
    programId,
    programName: v.programName,
    totalCU: v.totalCU,
    callCount: v.callCount,
    pct: 0,
  }));

  entries.sort((a, b) => b.totalCU - a.totalCU);

  const total = entries.reduce((s, e) => s + e.totalCU, 0);
  if (total > 0) {
    for (const e of entries) e.pct = (e.totalCU / total) * 100;
  }

  return entries;
}

function barColor(pctOfLimit: number): string {
  if (pctOfLimit >= 80) return "#EF4444";
  if (pctOfLimit >= 50) return "#F5A623";
  return "#22C55E";
}

function shortAddr(addr: string): string {
  return addr.slice(0, 4) + "…" + addr.slice(-4);
}

interface CUProfilerProps {
  result: SimulateResponse;
}

export function CUProfiler({ result }: CUProfilerProps) {
  const programs = flattenTrace(result.callTrace);
  const { used, limit } = result.computeUnits;
  const usedPctOfLimit = limit > 0 ? (used / limit) * 100 : 0;
  const limitColor = barColor(usedPctOfLimit);

  if (programs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-10 w-10 text-[#2A3E52] mb-3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
        </svg>
        <p className="text-sm text-[#4A6478]">No compute unit data available</p>
        <p className="text-xs text-[#2A3E52] mt-1">CU data is extracted from call trace nodes</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Global CU usage bar */}
      <div
        className="rounded-xl p-4"
        style={{ background: "#0A1628", border: "1px solid #131920" }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#4A6478]">Total CU Usage</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold" style={{ color: limitColor }}>
              {used.toLocaleString()}
            </span>
            <span className="text-xs text-[#4A6478]">/ {limit.toLocaleString()}</span>
            <span
              className="ml-1 rounded px-1.5 py-0.5 font-mono text-xs font-bold"
              style={{ background: `${limitColor}15`, color: limitColor }}
            >
              {usedPctOfLimit.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ background: "#131920" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(usedPctOfLimit, 100)}%`,
              background: limitColor,
              boxShadow: `0 0 8px ${limitColor}66`,
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs text-[#2A3E52]">0</span>
          <span className="text-xs text-[#2A3E52]">{limit.toLocaleString()} max</span>
        </div>
      </div>

      {/* Per-program breakdown */}
      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#4A6478]">
          Per-Program Breakdown
        </p>
        <div className="space-y-2">
          {programs.map((prog) => {
            const progPctOfLimit = limit > 0 ? (prog.totalCU / limit) * 100 : 0;
            const color = barColor(progPctOfLimit);
            return (
              <div
                key={prog.programId}
                className="rounded-xl p-3"
                style={{ background: "#0A1628", border: "1px solid #131920" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="font-mono text-xs text-[#9AAFC2] truncate">
                      {prog.programName ?? shortAddr(prog.programId)}
                    </span>
                    {prog.programName && (
                      <span className="font-mono text-xs text-[#4A6478] hidden sm:block">
                        {shortAddr(prog.programId)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <span className="text-xs text-[#4A6478]">
                      {prog.callCount}×
                    </span>
                    <span className="font-mono text-sm font-bold" style={{ color }}>
                      {prog.totalCU.toLocaleString()}
                    </span>
                    <span
                      className="rounded px-1.5 py-0.5 font-mono text-xs font-semibold w-14 text-right"
                      style={{ background: `${color}15`, color }}
                    >
                      {prog.pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "#131920" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${prog.pct}%`,
                      background: color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CU efficiency notes */}
      <div
        className="rounded-xl p-3"
        style={{ background: "#0A1628", border: "1px solid #131920" }}
      >
        <p className="text-xs font-bold uppercase tracking-wider text-[#4A6478] mb-2">Efficiency Notes</p>
        <div className="space-y-1.5">
          {usedPctOfLimit >= 80 && (
            <div className="flex items-start gap-2">
              <span className="text-xs" style={{ color: "#EF4444" }}>●</span>
              <p className="text-xs" style={{ color: "#EF4444" }}>
                CU usage is over 80% of limit — transaction may fail under different conditions or with added instructions.
              </p>
            </div>
          )}
          {usedPctOfLimit >= 50 && usedPctOfLimit < 80 && (
            <div className="flex items-start gap-2">
              <span className="text-xs" style={{ color: "#F5A623" }}>●</span>
              <p className="text-xs" style={{ color: "#F5A623" }}>
                Moderate CU usage. Consider requesting a lower compute unit limit to reduce priority fees.
              </p>
            </div>
          )}
          {usedPctOfLimit < 50 && (
            <div className="flex items-start gap-2">
              <span className="text-xs" style={{ color: "#22C55E" }}>●</span>
              <p className="text-xs text-[#6B8299]">
                CU usage is under 50% of limit. Reduce the requested compute unit limit to save on fees.
              </p>
            </div>
          )}
          {programs.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-xs text-[#4A6478]">●</span>
              <p className="text-xs text-[#4A6478]">
                Heaviest program: <span className="font-mono text-[#9AAFC2]">
                  {programs[0].programName ?? shortAddr(programs[0].programId)}
                </span> — {programs[0].totalCU.toLocaleString()} CU ({programs[0].pct.toFixed(1)}% of total)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
