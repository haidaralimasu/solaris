// Anchor IDL types and borsh encoder — client-safe (no Node-only APIs)

export type IdlType =
  | "u8" | "u16" | "u32" | "u64" | "u128"
  | "i8" | "i16" | "i32" | "i64" | "i128"
  | "f32" | "f64"
  | "bool" | "string" | "publicKey" | "bytes"
  | { vec: IdlType }
  | { array: [IdlType, number] }
  | { option: IdlType }
  | { defined: string };

export type IdlField = { name: string; type: IdlType };

export type IdlAccount = {
  name: string;
  isMut?: boolean;
  isWritable?: boolean;
  isSigner?: boolean;
  pda?: unknown;
};

export type IdlInstruction = {
  name: string;
  accounts: IdlAccount[];
  args: IdlField[];
};

export type AnchorIdl = {
  name: string;
  version?: string;
  address?: string;
  metadata?: { address?: string };
  instructions: IdlInstruction[];
};

export function parseIdl(json: string): AnchorIdl | null {
  try {
    const parsed = JSON.parse(json);
    if (!parsed || !Array.isArray(parsed.instructions)) return null;
    return parsed as AnchorIdl;
  } catch {
    return null;
  }
}

export function getProgramIdFromIdl(idl: AnchorIdl): string | null {
  return idl.address ?? idl.metadata?.address ?? null;
}

export function typeLabel(t: IdlType): string {
  if (typeof t === "string") return t;
  if ("vec" in t) return `Vec<${typeLabel(t.vec)}>`;
  if ("array" in t) return `[${typeLabel(t.array[0])}; ${t.array[1]}]`;
  if ("option" in t) return `Option<${typeLabel(t.option)}>`;
  if ("defined" in t) return t.defined;
  return "unknown";
}

export function typeInputHint(t: IdlType): string {
  if (typeof t === "string") {
    switch (t) {
      case "bool": return "true or false";
      case "publicKey": return "base58 address";
      case "string": return "text";
      case "bytes": return "hex bytes (e.g. deadbeef)";
      case "u64":
      case "u128":
      case "i64":
      case "i128": return "number (integer)";
      default: return "number";
    }
  }
  return "...";
}

export function isEncodeable(t: IdlType): boolean {
  if (typeof t !== "string") return false;
  return [
    "u8","u16","u32","u64","u128",
    "i8","i16","i32","i64","i128",
    "bool","string","publicKey","bytes",
  ].includes(t);
}

// Anchor stores instruction names as camelCase in IDL JSON but computes
// the discriminator from the original snake_case Rust function name.
// e.g. "sharedAccountsRoute" → "shared_accounts_route"
function toSnakeCase(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

// Anchor discriminator: sha256("global:<snake_case_name>")[0:8]
export async function computeDiscriminator(ixName: string): Promise<Uint8Array> {
  const snake = toSnakeCase(ixName);
  const data = new TextEncoder().encode(`global:${snake}`);
  const hash = await crypto.subtle.digest("SHA-256", data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer);
  return new Uint8Array(hash).slice(0, 8);
}

// ─── Borsh writers ────────────────────────────────────────────────────────

function u32le(n: number): Uint8Array {
  const b = new Uint8Array(4);
  b[0] = n & 0xff;
  b[1] = (n >>> 8) & 0xff;
  b[2] = (n >>> 16) & 0xff;
  b[3] = (n >>> 24) & 0xff;
  return b;
}

function bigintToLeBytes(n: bigint, byteLen: number): Uint8Array {
  const b = new Uint8Array(byteLen);
  let v = BigInt.asUintN(byteLen * 8, n);
  for (let i = 0; i < byteLen; i++) {
    b[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return b;
}

function decodeBase58(s: string): Uint8Array {
  const ALPHA = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let n = 0n;
  for (const ch of s) {
    const idx = ALPHA.indexOf(ch);
    if (idx < 0) throw new Error(`Invalid base58 char: ${ch}`);
    n = n * 58n + BigInt(idx);
  }
  const out = new Uint8Array(32);
  let remaining = n;
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  return out;
}

function concat(...bufs: Uint8Array[]): Uint8Array {
  const total = bufs.reduce((s, b) => s + b.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const b of bufs) {
    out.set(b, offset);
    offset += b.length;
  }
  return out;
}

export function encodeArg(type: IdlType, value: string): Uint8Array {
  if (typeof type !== "string") {
    throw new Error(`Encoding for type ${typeLabel(type)} is not supported in the UI builder`);
  }

  const s = value.trim();

  switch (type) {
    case "u8": return new Uint8Array([Number(s) & 0xff]);
    case "u16": { const n = Number(s); return new Uint8Array([n & 0xff, (n >> 8) & 0xff]); }
    case "u32": return u32le(Number(s));
    case "u64": return bigintToLeBytes(BigInt(s), 8);
    case "u128": return bigintToLeBytes(BigInt(s), 16);
    case "i8": { const n = parseInt(s); return new Uint8Array([(n < 0 ? n + 256 : n) & 0xff]); }
    case "i16": { const n = parseInt(s); const u = n < 0 ? n + 65536 : n; return new Uint8Array([u & 0xff, (u >> 8) & 0xff]); }
    case "i32": { const n = parseInt(s); return u32le(n < 0 ? (n + 2 ** 32) : n); }
    case "i64": return bigintToLeBytes(BigInt.asUintN(64, BigInt(s)), 8);
    case "i128": return bigintToLeBytes(BigInt.asUintN(128, BigInt(s)), 16);
    case "bool": return new Uint8Array([s === "true" || s === "1" ? 1 : 0]);
    case "string": {
      const enc = new TextEncoder().encode(s);
      return concat(u32le(enc.length), enc);
    }
    case "bytes": {
      const hex = s.replace(/[\s,]/g, "");
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
      }
      return concat(u32le(bytes.length), bytes);
    }
    case "publicKey": return decodeBase58(s);
    default: throw new Error(`Unsupported type: ${type}`);
  }
}

export async function buildInstructionDataHex(
  ixName: string,
  args: IdlField[],
  values: Record<string, string>
): Promise<string> {
  const disc = await computeDiscriminator(ixName);
  const parts: Uint8Array[] = [disc];
  for (const { name, type } of args) {
    parts.push(encodeArg(type, values[name] ?? ""));
  }
  const data = concat(...parts);
  return Array.from(data)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
