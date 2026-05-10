import { SystemInstruction, SystemProgram } from "@solana/web3.js";

export const SYSTEM_PROGRAM_ID = SystemProgram.programId.toBase58();

const SYSTEM_IX_NAMES: Record<number, string> = {
  0: "CreateAccount",
  1: "Assign",
  2: "Transfer",
  3: "CreateAccountWithSeed",
  4: "AdvanceNonceAccount",
  5: "WithdrawNonceAccount",
  6: "InitializeNonceAccount",
  7: "AuthorizeNonceAccount",
  8: "Allocate",
  9: "AllocateWithSeed",
  10: "AssignWithSeed",
  11: "TransferWithSeed",
  12: "UpgradeNonceAccount",
};

export function decodeSystemInstruction(
  data: Buffer,
  accountKeys: string[]
): { name: string; args: Record<string, unknown> } | null {
  try {
    const ixType = data.readUInt32LE(0);
    const name = SYSTEM_IX_NAMES[ixType] ?? `Unknown(${ixType})`;

    if (ixType === 2) {
      // Transfer: [type:u32][lamports:u64]
      const lamports = data.readBigUInt64LE(4);
      return {
        name,
        args: {
          from: accountKeys[0] ?? "unknown",
          to: accountKeys[1] ?? "unknown",
          lamports: lamports.toString(),
          sol: (Number(lamports) / 1e9).toFixed(9),
        },
      };
    }

    if (ixType === 0) {
      // CreateAccount: [type:u32][lamports:u64][space:u64][programId:32]
      const lamports = data.readBigUInt64LE(4);
      const space = data.readBigUInt64LE(12);
      return {
        name,
        args: {
          from: accountKeys[0] ?? "unknown",
          newAccount: accountKeys[1] ?? "unknown",
          lamports: lamports.toString(),
          space: space.toString(),
        },
      };
    }

    return { name, args: {} };
  } catch {
    return null;
  }
}
