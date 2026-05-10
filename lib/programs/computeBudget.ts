export const COMPUTE_BUDGET_PROGRAM_ID =
  "ComputeBudget111111111111111111111111111111";

export function decodeComputeBudgetInstruction(
  data: Buffer,
  _accountKeys: string[]
): { name: string; args: Record<string, unknown> } | null {
  try {
    const type = data[0];

    if (type === 2) {
      // SetComputeUnitLimit: [2][units:u32]
      const units = data.readUInt32LE(1);
      return { name: "SetComputeUnitLimit", args: { units } };
    }

    if (type === 3) {
      // SetComputeUnitPrice: [3][microLamports:u64]
      const microLamports = data.readBigUInt64LE(1);
      return {
        name: "SetComputeUnitPrice",
        args: {
          microLamports: microLamports.toString(),
          priorityFee: `${(Number(microLamports) / 1e6).toFixed(6)} lamports/CU`,
        },
      };
    }

    if (type === 1) {
      // RequestHeapFrame: [1][bytes:u32]
      const bytes = data.readUInt32LE(1);
      return { name: "RequestHeapFrame", args: { bytes } };
    }

    if (type === 0) {
      // RequestUnits (deprecated): [0][units:u32][additionalFee:u32]
      const units = data.readUInt32LE(1);
      const additionalFee = data.readUInt32LE(5);
      return { name: "RequestUnits", args: { units, additionalFee } };
    }

    return { name: `Unknown(${type})`, args: {} };
  } catch {
    return null;
  }
}
