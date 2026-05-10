"use client";

import { useState } from "react";
import type { DecodedInstruction } from "@/types/simulate";

function shortAddr(id: string): string {
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

function InstructionRow({ ix }: { ix: DecodedInstruction }) {
  const [open, setOpen] = useState(false);
  const hasDetail =
    (ix.decoded && Object.keys(ix.decoded).length > 0) || ix.logs.length > 0;

  return (
    <div className="border-b border-[#131920] last:border-0">
      <button
        type="button"
        onClick={() => hasDetail && setOpen((o) => !o)}
        className={`flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors
          ${hasDetail ? "cursor-pointer hover:bg-white/[0.018]" : "cursor-default"}`}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[#1E2632] bg-[#131920] font-mono text-[10px] font-bold text-[#475569]">
          {ix.index + 1}
        </span>

        <span className="font-mono text-sm font-semibold text-[#F8FAFC]">
          {ix.programName ?? shortAddr(ix.programId)}
        </span>

        {ix.name && (
          <span className="rounded border border-[#1E2632] bg-[#131920] px-2 py-0.5 font-mono text-xs text-[#94A3B8]">
            {ix.name}
          </span>
        )}

        <span className="ml-auto flex items-center gap-2">
          {hasDetail && (
            <span className="text-[10px] text-[#2A3441]">{open ? "▲" : "▼"}</span>
          )}
        </span>
      </button>

      {open && (
        <div className="border-t border-[#131920] bg-[#080B14]/50 px-5 py-4">
          {ix.decoded && Object.keys(ix.decoded).length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#2A3441]">
                Arguments
              </p>
              <dl className="space-y-1.5">
                {Object.entries(ix.decoded).map(([k, v]) => (
                  <div key={k} className="flex gap-4">
                    <dt className="w-28 shrink-0 font-mono text-xs text-[#475569]">{k}</dt>
                    <dd className="flex-1 break-all font-mono text-xs text-[#94A3B8]">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {ix.logs.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#2A3441]">
                Logs
              </p>
              <ul className="space-y-1">
                {ix.logs.map((line, i) => (
                  <li key={i} className="font-mono text-xs text-[#475569]">{line}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface InstructionListProps {
  instructions: DecodedInstruction[];
}

export function InstructionList({ instructions }: InstructionListProps) {
  if (instructions.length === 0) {
    return (
      <div className="rounded-xl border border-[#1E2632] bg-[#0D1117] px-5 py-8 text-center">
        <p className="text-sm text-[#475569]">No instructions found.</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-[#1E2632] bg-[#0D1117] overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[#131920] px-5 py-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
          Instructions
        </span>
        <span className="rounded bg-[#131920] px-1.5 py-0.5 text-[10px] text-[#475569]">
          {instructions.length}
        </span>
      </div>
      <div className="divide-y divide-[#131920]">
        {instructions.map((ix) => (
          <InstructionRow key={ix.index} ix={ix} />
        ))}
      </div>
    </div>
  );
}
