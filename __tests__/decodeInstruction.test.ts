import { decodeInstruction, getProgramName } from "@/lib/programs";
import { SYSTEM_PROGRAM_ID } from "@/lib/programs/system";
import { TOKEN_PROGRAM_ID } from "@/lib/programs/token";
import { ATA_PROGRAM_ID } from "@/lib/programs/ata";

describe("getProgramName", () => {
  it("names known programs", () => {
    expect(getProgramName(SYSTEM_PROGRAM_ID)).toBe("System Program");
    expect(getProgramName(TOKEN_PROGRAM_ID)).toBe("Token Program");
    expect(getProgramName(ATA_PROGRAM_ID)).toBe("Associated Token Account Program");
  });

  it("returns null for unknown programs", () => {
    expect(getProgramName("UnknownProgram111111111111111111111111111")).toBeNull();
  });
});

describe("decodeInstruction — System Transfer", () => {
  it("decodes a SOL transfer", () => {
    // type=2 (u32LE) + lamports=1_000_000_000 (u64LE)
    const data = Buffer.alloc(12);
    data.writeUInt32LE(2, 0);
    data.writeBigUInt64LE(BigInt(1_000_000_000), 4);

    const result = decodeInstruction(SYSTEM_PROGRAM_ID, data, ["senderPubkey", "receiverPubkey"]);
    expect(result?.name).toBe("Transfer");
    expect(result?.args.lamports).toBe("1000000000");
    expect(result?.args.sol).toBe("1.000000000");
    expect(result?.args.from).toBe("senderPubkey");
    expect(result?.args.to).toBe("receiverPubkey");
  });
});

describe("decodeInstruction — Token Transfer", () => {
  it("decodes SPL Token Transfer", () => {
    const data = Buffer.alloc(9);
    data[0] = 3; // Transfer
    data.writeBigUInt64LE(BigInt(5_000_000), 1);

    const result = decodeInstruction(TOKEN_PROGRAM_ID, data, ["src", "dst", "auth"]);
    expect(result?.name).toBe("Transfer");
    expect(result?.args.amount).toBe("5000000");
    expect(result?.args.source).toBe("src");
    expect(result?.args.destination).toBe("dst");
  });
});

describe("decodeInstruction — ATA Create", () => {
  it("decodes ATA Create", () => {
    const data = Buffer.alloc(0);
    const result = decodeInstruction(ATA_PROGRAM_ID, data, ["payer", "ata", "owner", "mint"]);
    expect(result?.name).toBe("Create");
    expect(result?.args.payer).toBe("payer");
    expect(result?.args.mint).toBe("mint");
  });

  it("decodes ATA CreateIdempotent", () => {
    const data = Buffer.from([1]);
    const result = decodeInstruction(ATA_PROGRAM_ID, data, ["payer", "ata", "owner", "mint"]);
    expect(result?.name).toBe("CreateIdempotent");
  });
});

describe("decodeInstruction — unknown program", () => {
  it("returns null for unknown program", () => {
    const result = decodeInstruction("SomeUnknownProgramId", Buffer.from([0]), []);
    expect(result).toBeNull();
  });
});
