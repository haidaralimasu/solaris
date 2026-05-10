import { AccountLayout } from "@solana/spl-token";
import type { AccountDiff } from "@/types/simulate";

const TOKEN_ACCOUNT_DATA_SIZE = 165;

export function detectTokenAccount(data: Buffer | null): boolean {
  if (!data) return false;
  return data.length === TOKEN_ACCOUNT_DATA_SIZE;
}

export function computeAccountDiff(
  pubkey: string,
  preAccount: { lamports: number; data: Buffer } | null,
  postAccount: { lamports: number; data: Buffer } | null
): AccountDiff {
  const preLamports = preAccount?.lamports ?? 0;
  const postLamports = postAccount?.lamports ?? 0;
  const lamportDelta = postLamports - preLamports;

  const preData = preAccount?.data ?? null;
  const postData = postAccount?.data ?? null;

  const isTokenAccount =
    detectTokenAccount(preData) || detectTokenAccount(postData);

  if (!isTokenAccount) {
    return {
      pubkey,
      preLamports,
      postLamports,
      lamportDelta,
      isTokenAccount: false,
    };
  }

  let preTokenAmount: string | undefined;
  let postTokenAmount: string | undefined;
  let mint: string | undefined;

  try {
    if (preData && preData.length === TOKEN_ACCOUNT_DATA_SIZE) {
      const decoded = AccountLayout.decode(preData);
      preTokenAmount = decoded.amount.toString();
      mint = decoded.mint.toBase58();
    }
  } catch {}

  try {
    if (postData && postData.length === TOKEN_ACCOUNT_DATA_SIZE) {
      const decoded = AccountLayout.decode(postData);
      postTokenAmount = decoded.amount.toString();
      if (!mint) mint = decoded.mint.toBase58();
    }
  } catch {}

  let tokenDelta: string | undefined;
  if (preTokenAmount !== undefined && postTokenAmount !== undefined) {
    const delta = BigInt(postTokenAmount) - BigInt(preTokenAmount);
    tokenDelta = delta.toString();
  }

  return {
    pubkey,
    preLamports,
    postLamports,
    lamportDelta,
    isTokenAccount: true,
    preTokenAmount,
    postTokenAmount,
    tokenDelta,
    mint,
  };
}
