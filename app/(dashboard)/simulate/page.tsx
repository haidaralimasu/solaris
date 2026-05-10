"use client";

import { useState, useCallback } from "react";
import type { Network, SimulateResponse } from "@/types/simulate";
import { TransactionResult } from "@/components/TransactionResult";
import { HistorySidebar, notifyHistoryUpdated } from "@/components/HistorySidebar";
import { saveToHistory, type SimulationRecord } from "@/lib/history";
import {
  parseIdl,
  getProgramIdFromIdl,
  typeLabel,
  typeInputHint,
  isEncodeable,
  buildInstructionDataHex,
  type AnchorIdl,
  type IdlInstruction,
} from "@/lib/idl";
import type { BuildSimulateRequest } from "@/app/api/build-simulate/route";

type InputMode = "manual" | "idl";

type AccountRow = {
  id: string;
  name: string;
  pubkey: string;
  isWritable: boolean;
  isSigner: boolean;
};

function newId() {
  return Math.random().toString(36).slice(2, 8);
}

// ─── Shared field styles ─────────────────────────────────────────────────────
const inputCls = "input-premium";
const smallInputCls = "w-full rounded-lg border border-[#1B2433] bg-[#0D1117] px-3 py-2 font-mono text-[13px] text-[#F0F4F8] placeholder-[#4A6078] focus:border-[#F5A623]/40 focus:outline-none focus:ring-1 focus:ring-[#F5A623]/15 disabled:opacity-50 transition-colors";
const labelCls = "mb-2 block text-[13px] font-semibold text-[#9AAFC2]";
const submitBtnCls = "flex items-center gap-2 rounded-xl bg-[#F5A623] px-7 py-2.5 text-[14px] font-bold text-[#080B14] hover:bg-[#F5A623]/90 disabled:opacity-40 transition-all";

// ─── Manual form ─────────────────────────────────────────────────────────────
function ManualForm({ onSubmit, loading }: { onSubmit: (req: BuildSimulateRequest) => void; loading: boolean }) {
  const [payer, setPayer] = useState("");
  const [programId, setProgramId] = useState("");
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [dataHex, setDataHex] = useState("");
  const [network, setNetwork] = useState<Network>("mainnet-beta");

  function addAccount() {
    setAccounts((p) => [...p, { id: newId(), name: "", pubkey: "", isWritable: false, isSigner: false }]);
  }

  function removeAccount(id: string) {
    setAccounts((p) => p.filter((a) => a.id !== id));
  }

  function updateAccount(id: string, patch: Partial<AccountRow>) {
    setAccounts((p) => p.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  function handleSubmit() {
    if (!payer.trim() || !programId.trim()) return;
    onSubmit({
      payer: payer.trim(),
      programId: programId.trim(),
      accounts: accounts.map(({ pubkey, isWritable, isSigner }) => ({
        pubkey: pubkey.trim(),
        isWritable,
        isSigner,
      })),
      dataHex: dataHex.trim(),
      network,
    });
  }

  return (
    <div className="space-y-5">
      <select
        value={network}
        onChange={(e) => setNetwork(e.target.value as Network)}
        disabled={loading}
        className="select-field w-fit"
      >
        <option value="mainnet-beta">Mainnet Beta</option>
        <option value="devnet">Devnet</option>
      </select>

      <div>
        <label className={labelCls}>
          Sender / fee payer <span className="text-red-400 font-normal">*</span>
        </label>
        <input
          type="text"
          value={payer}
          onChange={(e) => setPayer(e.target.value)}
          disabled={loading}
          placeholder="Real wallet address with SOL (e.g. your devnet keypair)"
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>
          Program ID <span className="font-normal text-red-400">*</span>
        </label>
        <input
          type="text"
          value={programId}
          onChange={(e) => setProgramId(e.target.value)}
          disabled={loading}
          placeholder="e.g. MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
          className={inputCls}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-[13px] font-semibold text-[#9AAFC2]">
            Accounts <span className="ml-1 font-normal text-[#6B8299]">({accounts.length})</span>
          </label>
          <button
            type="button"
            onClick={addAccount}
            disabled={loading}
            className="flex items-center gap-1.5 text-[13px] font-medium text-[#9AAFC2] hover:text-[#F5A623] transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            Add account
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#1E2632] px-4 py-5 text-center">
            <p className="text-[13px] text-[#6B8299]">
              No accounts —{" "}
              <button type="button" onClick={addAccount} className="text-[#9AAFC2] underline underline-offset-2 hover:text-[#F0F4F8]">
                add one
              </button>
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_56px_56px_28px] gap-2 px-1">
              <span className="text-[11px] uppercase tracking-widest font-semibold text-[#6B8299]">Pubkey</span>
              <span className="text-center text-[11px] uppercase tracking-widest font-semibold text-[#6B8299]">Write</span>
              <span className="text-center text-[11px] uppercase tracking-widest font-semibold text-[#6B8299]">Sign</span>
              <span />
            </div>
            {accounts.map((acct) => (
              <div key={acct.id} className="grid grid-cols-[1fr_56px_56px_28px] items-center gap-2">
                <input
                  type="text"
                  value={acct.pubkey}
                  onChange={(e) => updateAccount(acct.id, { pubkey: e.target.value })}
                  disabled={loading}
                  placeholder="Base58 pubkey…"
                  className={smallInputCls}
                />
                <div className="flex justify-center">
                  <input type="checkbox" checked={acct.isWritable} onChange={(e) => updateAccount(acct.id, { isWritable: e.target.checked })} disabled={loading} className="h-4 w-4 accent-[#F5A623]" />
                </div>
                <div className="flex justify-center">
                  <input type="checkbox" checked={acct.isSigner} onChange={(e) => updateAccount(acct.id, { isSigner: e.target.checked })} disabled={loading} className="h-4 w-4 accent-[#F5A623]" />
                </div>
                <button type="button" onClick={() => removeAccount(acct.id)} className="flex items-center justify-center text-[#2A3441] hover:text-red-500 transition-colors">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className={labelCls}>
          Instruction data{" "}
          <span className="font-normal text-[#6B8299]">(hex — e.g. <code className="font-mono">48656c6c6f</code>)</span>
        </label>
        <input
          type="text"
          value={dataHex}
          onChange={(e) => setDataHex(e.target.value)}
          disabled={loading}
          placeholder="Leave empty for no instruction data"
          className={inputCls}
        />
      </div>

      <div className="pt-1 flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !payer.trim() || !programId.trim()}
          className={submitBtnCls}
        >
          {loading ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#080B14]/20 border-t-[#080B14]" />
              Simulating…
            </>
          ) : (
            <>
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11V15.89a1.5 1.5 0 0 0 2.3 1.269l9.344-5.89a1.5 1.5 0 0 0 0-2.538L6.3 2.84Z" />
              </svg>
              Simulate
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── IDL form ─────────────────────────────────────────────────────────────────
function IdlForm({ onSubmit, loading }: { onSubmit: (req: BuildSimulateRequest) => void; loading: boolean }) {
  const [idlText, setIdlText] = useState("");
  const [idl, setIdl] = useState<AnchorIdl | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [selectedIx, setSelectedIx] = useState<IdlInstruction | null>(null);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [argValues, setArgValues] = useState<Record<string, string>>({});
  const [payer, setPayer] = useState("");
  const [network, setNetwork] = useState<Network>("mainnet-beta");
  const [buildError, setBuildError] = useState<string | null>(null);

  function handleIdlChange(text: string) {
    setIdlText(text);
    setBuildError(null);
    if (!text.trim()) {
      setIdl(null);
      setParseError(null);
      setSelectedIx(null);
      return;
    }
    const parsed = parseIdl(text);
    if (!parsed) {
      setParseError("Not a valid Anchor IDL — expected JSON with an 'instructions' array");
      setIdl(null);
      setSelectedIx(null);
    } else {
      setParseError(null);
      setIdl(parsed);
      if (parsed.instructions.length > 0) {
        selectInstruction(parsed.instructions[0]);
      }
    }
  }

  function selectInstruction(ix: IdlInstruction) {
    setSelectedIx(ix);
    setBuildError(null);
    setAccounts(
      ix.accounts.map((a) => ({
        id: newId(),
        name: a.name,
        pubkey: "",
        isWritable: !!(a.isMut ?? a.isWritable),
        isSigner: !!a.isSigner,
      }))
    );
    setArgValues({});
  }

  function updateAccount(id: string, patch: Partial<AccountRow>) {
    setAccounts((p) => p.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  async function handleSubmit() {
    if (!idl || !selectedIx || !payer.trim()) return;
    setBuildError(null);

    const programId = getProgramIdFromIdl(idl);
    if (!programId) {
      setBuildError(
        "This IDL has no program address. Paste the program ID below manually or use Manual mode."
      );
      return;
    }

    try {
      const dataHex = await buildInstructionDataHex(
        selectedIx.name,
        selectedIx.args,
        argValues
      );
      onSubmit({
        payer: payer.trim(),
        programId,
        accounts: accounts.map(({ pubkey, isWritable, isSigner }) => ({
          pubkey: pubkey.trim(),
          isWritable,
          isSigner,
        })),
        dataHex,
        network,
      });
    } catch (err) {
      setBuildError(err instanceof Error ? err.message : "Failed to encode instruction data");
    }
  }

  const programId = idl ? getProgramIdFromIdl(idl) : null;

  return (
    <div className="space-y-5">
      {/* IDL input */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className={labelCls.replace("mb-2 ", "")}>Anchor IDL (JSON)</label>
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#1B2433] bg-[#0D1117] px-3 py-1.5 text-[13px] font-semibold text-[#9AAFC2] transition-all hover:border-[#F5A623]/30 hover:text-[#F5A623]">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path fillRule="evenodd" d="M9.25 7V2.75a.75.75 0 0 0-1.5 0v4.5H3.5a.75.75 0 0 0 0 1.5h4.25V13a.75.75 0 0 0 1.5 0V8.75H13.5a.75.75 0 0 0 0-1.5H9.25Zm-5.5 9a.75.75 0 0 0 0 1.5h12.5a.75.75 0 0 0 0-1.5H3.75Z" clipRule="evenodd" />
            </svg>
            Upload .json
            <input
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const text = ev.target?.result as string;
                  handleIdlChange(text);
                };
                reader.readAsText(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <textarea
          rows={idl ? 4 : 8}
          value={idlText}
          onChange={(e) => handleIdlChange(e.target.value)}
          placeholder={'Paste your Anchor IDL here…\n\n{"name":"my_program","instructions":[{"name":"initialize","accounts":[…],"args":[…]}]}'}
          className={`w-full resize-none rounded-xl border bg-[#0D1117] px-4 py-3 font-mono text-[13px] text-[#F0F4F8] placeholder-[#4A6078] focus:outline-none focus:ring-1 transition-colors ${
            parseError
              ? "border-red-800/60 focus:border-red-600 focus:ring-red-600/20"
              : idl
                ? "border-emerald-900/50 focus:border-emerald-700/60 focus:ring-emerald-700/10"
                : "border-[#1B2433] focus:border-[#F5A623]/40 focus:ring-[#F5A623]/20"
          }`}
        />
        {parseError && (
          <p className="mt-1.5 text-[13px] text-red-400">{parseError}</p>
        )}
        {idl && (
          <div className="mt-2.5 flex items-center gap-3 rounded-lg border border-emerald-900/30 bg-emerald-950/10 px-3 py-2.5">
            <span className="text-sm text-emerald-500">✓</span>
            <span className="text-[13px] text-[#F0F4F8] font-mono font-semibold">{idl.name}</span>
            {idl.version && <span className="text-xs text-[#9AAFC2]">v{idl.version}</span>}
            <span className="text-xs text-[#9AAFC2]">
              {idl.instructions.length} instruction{idl.instructions.length !== 1 ? "s" : ""}
            </span>
            {programId && (
              <span className="ml-auto font-mono text-xs text-[#6B8299] truncate max-w-[160px]">
                {programId}
              </span>
            )}
          </div>
        )}
      </div>

      {!idl && (
        <p className="text-[13px] text-[#6B8299]">
          Don&apos;t have the IDL? Switch to Manual mode and enter the program ID, accounts, and instruction data as hex directly.
        </p>
      )}

      {idl && (
        <>
          {/* Instruction picker */}
          <div>
            <label className={labelCls}>Instruction</label>
            <select
              value={selectedIx?.name ?? ""}
              onChange={(e) => {
                const ix = idl.instructions.find((i) => i.name === e.target.value);
                if (ix) selectInstruction(ix);
              }}
              className="w-full cursor-pointer rounded-xl border border-[#1B2433] bg-[#0D1117] px-4 py-2.5 font-mono text-[14px] text-[#F0F4F8] focus:border-[#F5A623]/40 focus:outline-none transition-colors"
            >
              {idl.instructions.map((ix) => (
                <option key={ix.name} value={ix.name}>
                  {ix.name}
                </option>
              ))}
            </select>
          </div>

          {/* Accounts from IDL */}
          {selectedIx && accounts.length > 0 && (
            <div>
              <label className={labelCls}>Accounts from IDL</label>
              <div className="space-y-2">
                <div className="grid grid-cols-[120px_1fr_44px_44px] gap-2 px-1">
                  <span className="text-[11px] uppercase tracking-widest font-semibold text-[#6B8299]">Name</span>
                  <span className="text-[11px] uppercase tracking-widest font-semibold text-[#6B8299]">Pubkey</span>
                  <span className="text-center text-[11px] uppercase tracking-widest font-semibold text-[#6B8299]">Mut</span>
                  <span className="text-center text-[11px] uppercase tracking-widest font-semibold text-[#6B8299]">Sign</span>
                </div>
                {accounts.map((acct) => (
                  <div key={acct.id} className="grid grid-cols-[120px_1fr_44px_44px] items-center gap-2">
                    <span className="font-mono text-[13px] text-[#9AAFC2] truncate px-1">{acct.name}</span>
                    <input
                      type="text"
                      value={acct.pubkey}
                      onChange={(e) => updateAccount(acct.id, { pubkey: e.target.value })}
                      disabled={loading}
                      placeholder="base58…"
                      className={smallInputCls}
                    />
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={acct.isWritable}
                        onChange={(e) => updateAccount(acct.id, { isWritable: e.target.checked })}
                        className="h-4 w-4 accent-[#F5A623]"
                      />
                    </div>
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={acct.isSigner}
                        onChange={(e) => updateAccount(acct.id, { isSigner: e.target.checked })}
                        className="h-4 w-4 accent-[#F5A623]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Args */}
          {selectedIx && selectedIx.args.length > 0 && (
            <div>
              <label className={labelCls}>Arguments</label>
              <div className="space-y-3">
                {selectedIx.args.map(({ name, type }) => {
                  const encodeable = isEncodeable(type);
                  return (
                    <div key={name}>
                      <label className="mb-1.5 flex items-center gap-2 text-[13px] text-[#9AAFC2]">
                        <span className="font-mono font-semibold text-[#F0F4F8]">{name}</span>
                        <span className="rounded bg-[#1B2433] px-1.5 py-0.5 font-mono text-xs text-[#9AAFC2]">
                          {typeLabel(type)}
                        </span>
                        {!encodeable && (
                          <span className="text-xs text-[#F5A623]/80">⚠ complex type — use Manual mode</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={argValues[name] ?? ""}
                        onChange={(e) => setArgValues((p) => ({ ...p, [name]: e.target.value }))}
                        disabled={loading || !encodeable}
                        placeholder={encodeable ? typeInputHint(type) : "Not supported in IDL mode"}
                        className={inputCls}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selectedIx && selectedIx.args.length === 0 && (
            <p className="text-[13px] text-[#6B8299]">This instruction has no arguments.</p>
          )}

          {/* Payer */}
          <div>
            <label className={labelCls}>
              Sender / fee payer <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={payer}
              onChange={(e) => setPayer(e.target.value)}
              disabled={loading}
              placeholder="Real wallet address with SOL on this network"
              className={inputCls}
            />
          </div>

          {!programId && (
            <p className="rounded-lg border border-[#F5A623]/20 bg-[#F5A623]/5 px-3.5 py-2.5 text-[13px] text-[#F5A623]">
              This IDL doesn&apos;t include a program address. Add{" "}
              <code className="font-mono">&quot;address&quot;: &quot;…&quot;</code> to the IDL JSON, or switch to Manual mode.
            </p>
          )}

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
              onClick={handleSubmit}
              disabled={loading || !payer.trim() || !selectedIx || !programId}
              className={submitBtnCls}
            >
              {loading ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#080B14]/20 border-t-[#080B14]" />
                  Simulating…
                </>
              ) : (
                <>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11V15.89a1.5 1.5 0 0 0 2.3 1.269l9.344-5.89a1.5 1.5 0 0 0 0-2.538L6.3 2.84Z" />
                  </svg>
                  Simulate from IDL
                </>
              )}
            </button>
          </div>

          {buildError && (
            <p className="rounded-lg border border-red-900/40 bg-red-950/20 px-3.5 py-3 text-[13px] text-red-300">
              {buildError}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function SimulatePage() {
  const [inputMode, setInputMode] = useState<InputMode>("manual");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<SimulationRecord | null>(null);

  const runSimulate = useCallback(async (req: BuildSimulateRequest) => {
    setLoading(true);
    setApiError(null);
    setSelectedRecord(null);

    const label = `${req.programId.slice(0, 8)}… (${req.payer.slice(0, 6)}…)`;

    try {
      const res = await fetch("/api/build-simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      const data = await res.json();
      if (!res.ok) {
        setApiError(data.error ?? "Unexpected error");
        return;
      }
      const result = data as SimulateResponse;
      const record = saveToHistory(label, req.network, result, "simulate");
      notifyHistoryUpdated();
      setSelectedRecord(record);
    } catch {
      setApiError("Network error — could not reach the API");
    } finally {
      setLoading(false);
    }
  }, []);

  function resetToForm() {
    setSelectedRecord(null);
    setApiError(null);
  }

  return (
    <div className="flex h-screen flex-col bg-[#03060F] overflow-hidden">
      {/* Top bar */}
      <div className="flex h-14 items-center gap-3 border-b border-[#131920] px-6 flex-shrink-0">
        <h1 className="text-[15px] font-bold tracking-tight text-[#F0F4F8]">Transaction Simulator</h1>
        {selectedRecord && (
          <button
            type="button"
            onClick={resetToForm}
            className="ml-auto flex items-center gap-1.5 text-[13px] font-medium text-[#9AAFC2] hover:text-[#F0F4F8] transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
            New simulation
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
            mode="simulate"
            selectedId={selectedRecord?.id ?? null}
            onSelect={(record) => {
              setSelectedRecord(record);
              setApiError(null);
            }}
          />
        </div>

        {/* Right */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
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
              New simulation
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-5 relative h-10 w-10">
                    <div className="absolute inset-0 rounded-full border-2 border-[#131920]" />
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#F5A623] animate-spin" />
                  </div>
                  <p className="text-base font-semibold text-[#C5D3DF]">Building and simulating…</p>
                  <p className="mt-1.5 text-sm text-[#6B8299]">Constructing transaction and fetching chain state</p>
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
              <div className="mx-auto w-full max-w-2xl py-8 px-6">
                {/* Page heading */}
                <div className="mb-6">
                  <h2 className="text-2xl font-bold tracking-tight text-[#F0F4F8]">Build a transaction</h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-[#9AAFC2]">
                    Construct a custom instruction or use an Anchor IDL — Solaris simulates it without broadcasting.
                  </p>
                </div>

                {/* Inline mode tabs */}
                <div className="mb-7 flex gap-1 rounded-xl border border-[#1B2433] bg-[#0D1117] p-1">
                  {(["manual", "idl"] as InputMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setInputMode(m)}
                      className={`flex-1 rounded-lg py-2 text-[14px] font-semibold transition-all ${
                        inputMode === m
                          ? "bg-[#1B2433] text-[#F0F4F8] shadow-sm"
                          : "text-[#6B8299] hover:text-[#9AAFC2]"
                      }`}
                    >
                      {m === "manual" ? "Manual" : "From IDL"}
                    </button>
                  ))}
                </div>

                {inputMode === "manual" ? (
                  <ManualForm onSubmit={runSimulate} loading={loading} />
                ) : (
                  <IdlForm onSubmit={runSimulate} loading={loading} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
