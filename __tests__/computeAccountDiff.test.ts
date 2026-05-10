import { computeAccountDiff } from "@/lib/accounts";

describe("computeAccountDiff — SOL account", () => {
  it("computes lamport delta for a plain account", () => {
    const pre = { lamports: 1_000_000, data: Buffer.alloc(0) };
    const post = { lamports: 1_500_000, data: Buffer.alloc(0) };
    const diff = computeAccountDiff("pubkey1", pre, post);
    expect(diff.lamportDelta).toBe(500_000);
    expect(diff.isTokenAccount).toBe(false);
    expect(diff.tokenDelta).toBeUndefined();
  });

  it("handles null pre account (new account created)", () => {
    const post = { lamports: 2_000_000, data: Buffer.alloc(0) };
    const diff = computeAccountDiff("pubkey2", null, post);
    expect(diff.preLamports).toBe(0);
    expect(diff.postLamports).toBe(2_000_000);
    expect(diff.lamportDelta).toBe(2_000_000);
  });

  it("handles null post account (account closed)", () => {
    const pre = { lamports: 3_000_000, data: Buffer.alloc(0) };
    const diff = computeAccountDiff("pubkey3", pre, null);
    expect(diff.postLamports).toBe(0);
    expect(diff.lamportDelta).toBe(-3_000_000);
  });
});

describe("computeAccountDiff — token account", () => {
  it("skips token parsing for non-165-byte data", () => {
    const pre = { lamports: 1_000_000, data: Buffer.alloc(100) };
    const post = { lamports: 1_000_000, data: Buffer.alloc(100) };
    const diff = computeAccountDiff("pubkey4", pre, post);
    expect(diff.isTokenAccount).toBe(false);
  });

  it("detects 165-byte data as token account (may fail to decode without valid layout)", () => {
    const data = Buffer.alloc(165);
    const pre = { lamports: 2_000_000, data };
    const post = { lamports: 2_000_000, data };
    const diff = computeAccountDiff("pubkey5", pre, post);
    expect(diff.isTokenAccount).toBe(true);
  });
});
