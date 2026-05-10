"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { VersionedTransaction } from "@solana/web3.js";
import type { CircuitBreaker, CBAccountMeta, PrepareResponse, ExecuteResponse } from "@/types/circuitBreaker";
import type { CBExecution } from "@/types/circuitBreaker";
import type { Network } from "@/types/simulate";
import {
  loadBreakers,
  saveBreaker,
  deleteBreaker,
  updateBreakerAfterFire,
  loadExecutions,
  saveExecution,
} from "@/lib/circuitBreakerStorage";

const NETWORKS: Network[] = ["mainnet-beta", "devnet"];

function shortAddr(addr: string) {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

function timeAgo(ts: number): string {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

// ─── Account row editor ───────────────────────────────────────────────────────

function AccountRow({
  acc,
  index,
  onChange,
  onRemove,
}: {
  acc: CBAccountMeta;
  index: number;
  onChange: (i: number, val: CBAccountMeta) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        value={acc.label ?? ""}
        onChange={(e) => onChange(index, { ...acc, label: e.target.value })}
        placeholder="Label (optional)"
        className="w-28 rounded-lg border border-[#1B2433] bg-[#080B14] px-2.5 py-1.5 text-[12px] text-[#9AAFC2] placeholder-[#2A3441] outline-none focus:border-[#F5A623]/40 transition-colors"
      />
      <input
        value={acc.address}
        onChange={(e) => onChange(index, { ...acc, address: e.target.value.trim() })}
        placeholder="Account address (base58)"
        className="flex-1 rounded-lg border border-[#1B2433] bg-[#080B14] px-2.5 py-1.5 font-mono text-[12px] text-[#9AAFC2] placeholder-[#2A3441] outline-none focus:border-[#F5A623]/40 transition-colors"
      />
      <label className="flex items-center gap-1 cursor-pointer select-none text-[11px] text-[#475569] hover:text-[#9AAFC2] transition-colors">
        <input
          type="checkbox"
          checked={acc.writable}
          onChange={(e) => onChange(index, { ...acc, writable: e.target.checked })}
          className="h-3 w-3 accent-[#F5A623]"
        />
        Write
      </label>
      <label className="flex items-center gap-1 cursor-pointer select-none text-[11px] text-[#475569] hover:text-[#9AAFC2] transition-colors">
        <input
          type="checkbox"
          checked={acc.signer}
          onChange={(e) => onChange(index, { ...acc, signer: e.target.checked })}
          className="h-3 w-3 accent-[#F5A623]"
        />
        Sign
      </label>
      <button
        onClick={() => onRemove(index)}
        className="text-[#2A3441] hover:text-red-400 transition-colors p-1"
        title="Remove account"
      >
        ✕
      </button>
    </div>
  );
}

// ─── Create / Edit form ───────────────────────────────────────────────────────

interface FormState {
  label: string;
  description: string;
  programId: string;
  instructionData: string;
  accounts: CBAccountMeta[];
  network: Network;
}

const EMPTY_FORM: FormState = {
  label: "",
  description: "",
  programId: "",
  instructionData: "",
  accounts: [],
  network: "mainnet-beta",
};

function BreakerForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: CircuitBreaker;
  onSave: (cb: CircuitBreaker) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          label: initial.label,
          description: initial.description,
          programId: initial.programId,
          instructionData: initial.instructionData,
          accounts: initial.accounts,
          network: initial.network,
        }
      : EMPTY_FORM
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.label.trim()) e.label = "Label is required";
    if (!form.programId.trim()) e.programId = "Program ID is required";
    const hexClean = form.instructionData.replace(/\s/g, "");
    if (hexClean && !/^[0-9a-fA-F]+$/.test(hexClean))
      e.instructionData = "Must be valid hex (or empty for no data)";
    if (hexClean && hexClean.length % 2 !== 0)
      e.instructionData = "Hex must be even length";
    for (const acc of form.accounts) {
      if (!acc.address.trim()) {
        e.accounts = "All account addresses must be filled";
        break;
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function submit() {
    if (!validate()) return;
    const cb: CircuitBreaker = {
      id: initial?.id ?? crypto.randomUUID(),
      label: form.label.trim(),
      description: form.description.trim(),
      programId: form.programId.trim(),
      instructionData: form.instructionData.replace(/\s/g, ""),
      accounts: form.accounts,
      network: form.network,
      createdAt: initial?.createdAt ?? Date.now(),
      lastFiredAt: initial?.lastFiredAt,
      lastSignature: initial?.lastSignature,
    };
    onSave(cb);
  }

  function addAccount() {
    setForm((f) => ({
      ...f,
      accounts: [...f.accounts, { address: "", writable: false, signer: false }],
    }));
  }

  function updateAccount(i: number, val: CBAccountMeta) {
    setForm((f) => {
      const accounts = [...f.accounts];
      accounts[i] = val;
      return { ...f, accounts };
    });
  }

  function removeAccount(i: number) {
    setForm((f) => ({ ...f, accounts: f.accounts.filter((_, idx) => idx !== i) }));
  }

  return (
    <div className="rounded-xl border border-[#1E2632] bg-[#0D1117] p-5 space-y-4">
      <h3 className="text-[14px] font-bold text-[#F0F4F8]">
        {initial ? "Edit Circuit Breaker" : "New Circuit Breaker"}
      </h3>

      {/* Label + Network row */}
      <div className="flex gap-3">
        <div className="flex-1 space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[#475569]">
            Label *
          </label>
          <input
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            placeholder="Emergency pause"
            className="w-full rounded-lg border border-[#1B2433] bg-[#080B14] px-3 py-2 text-[13px] text-[#F0F4F8] placeholder-[#2A3441] outline-none focus:border-[#F5A623]/40 transition-colors"
          />
          {errors.label && <p className="text-[11px] text-red-400">{errors.label}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[#475569]">
            Network
          </label>
          <select
            value={form.network}
            onChange={(e) => setForm((f) => ({ ...f, network: e.target.value as Network }))}
            className="rounded-lg border border-[#1B2433] bg-[#080B14] px-3 py-2 text-[13px] text-[#9AAFC2] outline-none focus:border-[#F5A623]/40 transition-colors"
          >
            {NETWORKS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-[#475569]">
          Description
        </label>
        <input
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="What does this breaker do?"
          className="w-full rounded-lg border border-[#1B2433] bg-[#080B14] px-3 py-2 text-[13px] text-[#9AAFC2] placeholder-[#2A3441] outline-none focus:border-[#F5A623]/40 transition-colors"
        />
      </div>

      {/* Program ID */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-[#475569]">
          Program ID *
        </label>
        <input
          value={form.programId}
          onChange={(e) => setForm((f) => ({ ...f, programId: e.target.value.trim() }))}
          placeholder="Base58 program address"
          className="w-full rounded-lg border border-[#1B2433] bg-[#080B14] px-3 py-2 font-mono text-[13px] text-[#9AAFC2] placeholder-[#2A3441] outline-none focus:border-[#F5A623]/40 transition-colors"
        />
        {errors.programId && <p className="text-[11px] text-red-400">{errors.programId}</p>}
      </div>

      {/* Instruction data */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-[#475569]">
          Instruction Data <span className="text-[#2A3441] normal-case">(hex, e.g. Anchor discriminator + args)</span>
        </label>
        <input
          value={form.instructionData}
          onChange={(e) => setForm((f) => ({ ...f, instructionData: e.target.value }))}
          placeholder="17212145943200950a... (leave empty for no data)"
          className="w-full rounded-lg border border-[#1B2433] bg-[#080B14] px-3 py-2 font-mono text-[12px] text-[#F5A623]/80 placeholder-[#2A3441] outline-none focus:border-[#F5A623]/40 transition-colors"
        />
        {errors.instructionData && (
          <p className="text-[11px] text-red-400">{errors.instructionData}</p>
        )}
        <p className="text-[10px] text-[#2A3441]">
          Anchor discriminator = sha256(&quot;global:instruction_name&quot;)[0..8] as hex
        </p>
      </div>

      {/* Accounts */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[#475569]">
            Accounts
          </label>
          <button
            onClick={addAccount}
            className="text-[11px] font-semibold text-[#F5A623] hover:text-[#F5A623]/70 transition-colors"
          >
            + Add account
          </button>
        </div>
        {form.accounts.length === 0 ? (
          <p className="text-[12px] text-[#2A3441] italic">No accounts added yet</p>
        ) : (
          <div className="space-y-1.5">
            {form.accounts.map((acc, i) => (
              <AccountRow
                key={i}
                acc={acc}
                index={i}
                onChange={updateAccount}
                onRemove={removeAccount}
              />
            ))}
          </div>
        )}
        {errors.accounts && <p className="text-[11px] text-red-400">{errors.accounts}</p>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={submit}
          className="rounded-xl bg-[#F5A623] px-5 py-2 text-[13px] font-bold text-[#080B14] hover:bg-[#F5A623]/90 transition-colors"
        >
          {initial ? "Save Changes" : "Create Breaker"}
        </button>
        <button
          onClick={onCancel}
          className="rounded-xl border border-[#1E2632] px-5 py-2 text-[13px] font-semibold text-[#6B8299] hover:text-[#9AAFC2] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Fire confirmation modal ───────────────────────────────────────────────────

interface FireState {
  phase: "idle" | "preparing" | "signing" | "broadcasting" | "done" | "error";
  error?: string;
  signature?: string;
}

function FireModal({
  breaker,
  onClose,
}: {
  breaker: CircuitBreaker;
  onClose: (exec?: CBExecution) => void;
}) {
  const { publicKey, signTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const [state, setState] = useState<FireState>({ phase: "idle" });

  const fire = useCallback(async () => {
    if (!publicKey || !signTransaction) {
      setVisible(true);
      return;
    }

    setState({ phase: "preparing" });

    try {
      // 1. Build unsigned tx on server (uses Helius key)
      const prepRes = await fetch("/api/circuit-breaker/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          breakerId: breaker.id,
          payer: publicKey.toBase58(),
          network: breaker.network,
          programId: breaker.programId,
          instructionData: breaker.instructionData,
          accounts: breaker.accounts,
        }),
      });

      if (!prepRes.ok) {
        const err = await prepRes.json();
        throw new Error(err.error ?? "Failed to prepare transaction");
      }

      const prep: PrepareResponse = await prepRes.json();
      const unsignedTx = VersionedTransaction.deserialize(
        Buffer.from(prep.transactionBase64, "base64")
      );

      // 2. Sign with wallet
      setState({ phase: "signing" });
      const signedTx = await signTransaction(unsignedTx);

      // 3. Broadcast via server
      setState({ phase: "broadcasting" });
      const execRes = await fetch("/api/circuit-breaker/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signedTransactionBase64: Buffer.from(signedTx.serialize()).toString("base64"),
          network: breaker.network,
          breakerId: breaker.id,
        }),
      });

      if (!execRes.ok) {
        const err = await execRes.json();
        throw new Error(err.error ?? "Failed to execute transaction");
      }

      const exec: ExecuteResponse = await execRes.json();

      const cbExec: CBExecution = {
        id: crypto.randomUUID(),
        breakerId: breaker.id,
        breakerLabel: breaker.label,
        signature: exec.signature,
        status: "success",
        network: breaker.network,
        timestamp: Date.now(),
      };

      updateBreakerAfterFire(breaker.id, exec.signature);
      saveExecution(cbExec);
      setState({ phase: "done", signature: exec.signature });
      onClose(cbExec);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      const cbExec: CBExecution = {
        id: crypto.randomUUID(),
        breakerId: breaker.id,
        breakerLabel: breaker.label,
        signature: "",
        status: "failed",
        network: breaker.network,
        timestamp: Date.now(),
        error: msg,
      };
      saveExecution(cbExec);
      setState({ phase: "error", error: msg });
    }
  }, [publicKey, signTransaction, setVisible, breaker]);

  const PHASE_LABELS: Record<FireState["phase"], string> = {
    idle: "Confirm execution",
    preparing: "Building transaction…",
    signing: "Waiting for wallet signature…",
    broadcasting: "Broadcasting to network…",
    done: "Executed successfully",
    error: "Execution failed",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(3,6,15,0.85)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && state.phase === "idle" && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl border border-[#1E2632] bg-[#0D1117] p-6 space-y-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-900/30 border border-red-800/40">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-red-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-[#F0F4F8]">Fire Circuit Breaker</h3>
            <p className="text-[13px] text-[#6B8299]">{breaker.label}</p>
          </div>
        </div>

        {/* Breaker details */}
        <div className="rounded-xl border border-[#1E2632] bg-[#080B14] p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#475569] w-20">Program</span>
            <span className="font-mono text-[12px] text-[#9AAFC2]">{shortAddr(breaker.programId)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#475569] w-20">Network</span>
            <span className={`text-[12px] font-semibold ${breaker.network === "mainnet-beta" ? "text-[#F5A623]" : "text-emerald-400"}`}>
              {breaker.network}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#475569] w-20">Accounts</span>
            <span className="text-[12px] text-[#9AAFC2]">{breaker.accounts.length} account{breaker.accounts.length !== 1 ? "s" : ""}</span>
          </div>
          {breaker.network === "mainnet-beta" && (
            <p className="text-[11px] text-red-400/80 mt-1">
              ⚠ This will execute on mainnet with real SOL fees.
            </p>
          )}
        </div>

        {/* Status */}
        {state.phase !== "idle" && (
          <div className={`rounded-xl border px-4 py-3 ${
            state.phase === "error"
              ? "border-red-700/40 bg-red-950/20"
              : state.phase === "done"
              ? "border-emerald-700/40 bg-emerald-950/20"
              : "border-[#1E2632] bg-[#080B14]"
          }`}>
            <div className="flex items-center gap-2">
              {state.phase !== "done" && state.phase !== "error" && (
                <span className="h-3 w-3 rounded-full border-2 border-[#F5A623] border-t-transparent animate-spin" />
              )}
              {state.phase === "done" && <span className="text-emerald-400">✓</span>}
              {state.phase === "error" && <span className="text-red-400">✕</span>}
              <p className={`text-[13px] font-semibold ${
                state.phase === "error" ? "text-red-300" : state.phase === "done" ? "text-emerald-300" : "text-[#9AAFC2]"
              }`}>
                {PHASE_LABELS[state.phase]}
              </p>
            </div>
            {state.error && (
              <p className="mt-1 font-mono text-[11px] text-red-400/70 break-all">{state.error}</p>
            )}
            {state.signature && (
              <p className="mt-1 font-mono text-[11px] text-emerald-400/70 break-all">{state.signature}</p>
            )}
          </div>
        )}

        {/* Wallet status */}
        {!publicKey && state.phase === "idle" && (
          <p className="text-[12px] text-[#F5A623]/80">
            No wallet connected — you will be prompted to connect before signing.
          </p>
        )}
        {publicKey && state.phase === "idle" && (
          <p className="text-[12px] text-[#475569]">
            Signing with: <span className="font-mono text-[#9AAFC2]">{shortAddr(publicKey.toBase58())}</span>
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          {(state.phase === "idle" || state.phase === "error") && (
            <button
              onClick={fire}
              className="flex-1 rounded-xl bg-red-600 px-5 py-2.5 text-[13px] font-bold text-white hover:bg-red-500 transition-colors"
            >
              {state.phase === "error" ? "Retry" : "Execute Now"}
            </button>
          )}
          {state.phase === "done" && (
            <button
              onClick={() => onClose()}
              className="flex-1 rounded-xl bg-emerald-800/40 border border-emerald-700/40 px-5 py-2.5 text-[13px] font-bold text-emerald-300 hover:bg-emerald-800/60 transition-colors"
            >
              Done
            </button>
          )}
          {(state.phase === "idle" || state.phase === "error") && (
            <button
              onClick={() => onClose()}
              className="rounded-xl border border-[#1E2632] px-5 py-2.5 text-[13px] font-semibold text-[#6B8299] hover:text-[#9AAFC2] transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Execution history row ────────────────────────────────────────────────────

function ExecRow({ exec }: { exec: CBExecution }) {
  const explorerUrl =
    exec.network === "mainnet-beta"
      ? `https://solscan.io/tx/${exec.signature}`
      : `https://solscan.io/tx/${exec.signature}?cluster=devnet`;

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-[#131920] last:border-0">
      <span className={`h-2 w-2 shrink-0 rounded-full ${exec.status === "success" ? "bg-emerald-500" : "bg-red-500"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#F0F4F8] truncate">{exec.breakerLabel}</p>
        {exec.signature && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] text-[#475569] hover:text-[#F5A623] transition-colors truncate block"
          >
            {shortAddr(exec.signature)} ↗
          </a>
        )}
        {exec.error && (
          <p className="text-[11px] text-red-400/70 truncate">{exec.error}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className={`text-[11px] font-semibold ${exec.status === "success" ? "text-emerald-400" : "text-red-400"}`}>
          {exec.status}
        </p>
        <p className="text-[10px] text-[#2A3441]">{timeAgo(exec.timestamp)}</p>
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function CircuitBreakerPanel() {
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();

  const [breakers, setBreakers] = useState<CircuitBreaker[]>([]);
  const [executions, setExecutions] = useState<CBExecution[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<CircuitBreaker | undefined>();
  const [fireTarget, setFireTarget] = useState<CircuitBreaker | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setBreakers(loadBreakers());
    setExecutions(loadExecutions());
  }, []);

  function handleSave(cb: CircuitBreaker) {
    saveBreaker(cb);
    setBreakers(loadBreakers());
    setShowForm(false);
    setEditTarget(undefined);
  }

  function handleDelete(id: string) {
    deleteBreaker(id);
    setBreakers(loadBreakers());
    setDeletingId(null);
  }

  function handleFireDone(exec?: CBExecution) {
    if (exec) setExecutions(loadExecutions());
    setFireTarget(null);
  }

  return (
    <div className="flex h-full min-h-screen flex-col gap-0">
      {/* Page header */}
      <div className="border-b border-[#131920] px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-bold text-[#F0F4F8]">Circuit Breaker</h1>
            <p className="mt-0.5 text-[13px] text-[#475569]">
              Pre-configure emergency on-chain instructions. Execute with one click.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!publicKey ? (
              <button
                onClick={() => setVisible(true)}
                className="flex items-center gap-2 rounded-xl border border-[#F5A623]/30 bg-[#F5A623]/08 px-4 py-2 text-[13px] font-semibold text-[#F5A623] hover:bg-[#F5A623]/15 transition-colors"
              >
                Connect Wallet
              </button>
            ) : (
              <div className="flex items-center gap-1.5 rounded-xl border border-[#1B2433] bg-[#080B14] px-3 py-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="font-mono text-[12px] text-[#9AAFC2]">{shortAddr(publicKey.toBase58())}</span>
              </div>
            )}
            {!showForm && (
              <button
                onClick={() => { setShowForm(true); setEditTarget(undefined); }}
                className="rounded-xl bg-[#F5A623] px-4 py-2 text-[13px] font-bold text-[#080B14] hover:bg-[#F5A623]/90 transition-colors"
              >
                + New Breaker
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 gap-6 p-6 overflow-hidden">
        {/* Left: breakers list + form */}
        <div className="flex-1 min-w-0 space-y-4">
          {showForm && (
            <BreakerForm
              initial={editTarget}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditTarget(undefined); }}
            />
          )}

          {breakers.length === 0 && !showForm ? (
            <div className="rounded-xl border border-[#1E2632] bg-[#0D1117] px-6 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#080B14] border border-[#1E2632] mx-auto mb-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6 text-[#2A3441]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
              <p className="text-[14px] font-semibold text-[#475569]">No circuit breakers configured</p>
              <p className="mt-1 text-[12px] text-[#2A3441]">Create one to pre-configure an emergency instruction for quick execution.</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 rounded-xl bg-[#F5A623]/10 border border-[#F5A623]/20 px-4 py-2 text-[13px] font-semibold text-[#F5A623] hover:bg-[#F5A623]/15 transition-colors"
              >
                Create your first breaker
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {breakers.map((cb) => (
                <div
                  key={cb.id}
                  className="rounded-xl border border-[#1E2632] bg-[#0D1117] overflow-hidden"
                >
                  <div className="flex items-center gap-4 px-5 py-4">
                    {/* Status indicator */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-950/30 border border-red-900/30">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 text-red-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                      </svg>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-bold text-[#F0F4F8]">{cb.label}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          cb.network === "mainnet-beta"
                            ? "bg-[#F5A623]/10 text-[#F5A623]"
                            : "bg-emerald-900/30 text-emerald-400"
                        }`}>
                          {cb.network === "mainnet-beta" ? "mainnet" : "devnet"}
                        </span>
                      </div>
                      {cb.description && (
                        <p className="text-[12px] text-[#475569] mt-0.5">{cb.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="font-mono text-[11px] text-[#2A3441]">
                          {shortAddr(cb.programId)}
                        </span>
                        <span className="text-[11px] text-[#2A3441]">·</span>
                        <span className="text-[11px] text-[#2A3441]">
                          {cb.accounts.length} account{cb.accounts.length !== 1 ? "s" : ""}
                        </span>
                        {cb.lastFiredAt && (
                          <>
                            <span className="text-[11px] text-[#2A3441]">·</span>
                            <span className="text-[11px] text-[#475569]">
                              Last fired {timeAgo(cb.lastFiredAt)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => { setEditTarget(cb); setShowForm(true); }}
                        className="rounded-lg border border-[#1B2433] px-3 py-1.5 text-[12px] font-semibold text-[#475569] hover:text-[#9AAFC2] transition-colors"
                      >
                        Edit
                      </button>
                      {deletingId === cb.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(cb.id)}
                            className="rounded-lg bg-red-900/40 border border-red-700/40 px-3 py-1.5 text-[12px] font-bold text-red-300 hover:bg-red-900/60 transition-colors"
                          >
                            Confirm delete
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="rounded-lg px-2 py-1.5 text-[12px] text-[#475569] hover:text-[#9AAFC2] transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(cb.id)}
                          className="rounded-lg border border-[#1B2433] px-3 py-1.5 text-[12px] font-semibold text-[#475569] hover:text-red-400 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                      <button
                        onClick={() => setFireTarget(cb)}
                        className="rounded-xl bg-red-600 px-4 py-1.5 text-[13px] font-bold text-white hover:bg-red-500 transition-colors"
                      >
                        Fire
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: execution history */}
        <div className="w-72 shrink-0">
          <div className="rounded-xl border border-[#1E2632] bg-[#0D1117] overflow-hidden sticky top-6">
            <div className="flex items-center gap-2 border-b border-[#131920] px-4 py-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                Execution History
              </span>
              {executions.length > 0 && (
                <span className="ml-auto rounded bg-[#131920] px-1.5 py-0.5 text-[10px] text-[#475569]">
                  {executions.length}
                </span>
              )}
            </div>
            <div className="px-4 py-2 max-h-96 overflow-y-auto">
              {executions.length === 0 ? (
                <p className="py-6 text-center text-[12px] text-[#2A3441]">
                  No executions yet
                </p>
              ) : (
                executions.map((e) => <ExecRow key={e.id} exec={e} />)
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fire modal */}
      {fireTarget && (
        <FireModal breaker={fireTarget} onClose={handleFireDone} />
      )}
    </div>
  );
}
