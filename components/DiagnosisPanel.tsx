"use client";

import type { SimulateResponse } from "@/types/simulate";
import { extractLogError, parseFailedInstructionIndex, getErrorTip } from "@/lib/errors";

interface DiagnosisPanelProps {
  result: SimulateResponse;
}

export function DiagnosisPanel({ result }: DiagnosisPanelProps) {
  if (result.status !== "failed" || !result.error) return null;

  const { error, logs, instructions } = result;

  // Best error message: try logs first, then translated code
  const message = extractLogError(logs) ?? error.plainEnglish;
  const tip = getErrorTip(error.plainEnglish, error.raw);

  // Find which instruction failed
  const failedIdx = parseFailedInstructionIndex(error.raw);
  const failedIx = failedIdx !== null ? instructions[failedIdx] : null;
  const programName = failedIx?.programName ?? null;
  const programId = failedIx?.programId ?? null;

  return (
    <div className="rounded-xl border border-red-700/40 bg-red-950/15 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-red-900/30 px-5 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-900/40">
          <span className="text-red-400 text-sm font-bold">✕</span>
        </div>
        <div>
          <p className="text-[13px] font-bold text-red-300">Transaction Failed</p>
          {failedIx && (
            <p className="text-[11px] text-red-500/70 font-mono">
              Instruction {failedIdx}
              {programName && <span className="ml-1 text-red-400/80">· {programName}</span>}
              {!programName && programId && <span className="ml-1">· {programId.slice(0, 8)}…</span>}
            </p>
          )}
        </div>
      </div>

      {/* Error message */}
      <div className="px-5 py-4">
        <p className="text-[15px] font-semibold leading-relaxed text-red-200">{message}</p>

        {/* Raw error code — subtle */}
        {error.raw !== message && (
          <p className="mt-1 font-mono text-[11px] text-red-700/60 break-all">{error.raw}</p>
        )}

        {/* Actionable tip */}
        {tip && (
          <div className="mt-4 rounded-lg border border-[#1E2632] bg-[#080B14] px-4 py-3">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-[#F5A623] text-xs">→</span>
              <p className="text-[13px] leading-relaxed text-[#9AAFC2]">{tip}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
