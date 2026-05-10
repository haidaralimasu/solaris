import { translateError } from "@/lib/errors";

describe("translateError", () => {
  it("returns Unknown error for null", () => {
    expect(translateError(null)).toBe("Unknown error");
  });

  it("translates a known Anchor hex error", () => {
    const result = translateError("custom program error: 0x64");
    expect(result).toBe("Instruction is missing"); // 0x64 = 100
  });

  it("handles unknown hex error with fallback", () => {
    const result = translateError("custom program error: 0xFFFF");
    expect(result).toContain("Custom program error");
    expect(result.toLowerCase()).toContain("0xffff");
  });

  it("extracts Error Code from Anchor error string", () => {
    const result = translateError("Error Code: ConstraintSeeds. Error Number: 2006.");
    expect(result).toBe("ConstraintSeeds");
  });

  it("handles compute budget exceeded", () => {
    const result = translateError("exceeded CUs meter at BPF instruction");
    expect(result).toContain("Compute budget exceeded");
  });

  it("handles insufficient lamports", () => {
    const result = translateError("insufficient lamports 100, need 200");
    expect(result).toContain("Insufficient SOL");
  });

  it("returns raw error when no pattern matches", () => {
    const msg = "some totally unknown error";
    expect(translateError(msg)).toBe(msg);
  });
});
