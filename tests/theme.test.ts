import { describe, expect, it } from "vitest";
import { mixHex, presetSurfaceVars } from "@/lib/theme";

describe("mixHex", () => {
  it("returns a at t=0 and b at t=1", () => {
    expect(mixHex("#ff0000", "#0000ff", 0)).toBe("#ff0000");
    expect(mixHex("#ff0000", "#0000ff", 1)).toBe("#0000ff");
  });

  it("blends linearly", () => {
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
  });

  it("handles 3-digit hex", () => {
    expect(mixHex("#000", "#fff", 0.5)).toBe("#808080");
  });
});

describe("presetSurfaceVars", () => {
  it("dark preset surfaces stay near-black with a lightened surface-2", () => {
    const vars = presetSurfaceVars("stxc", "dark");
    expect(vars["--surface"]).toBe("#131313");
    expect(vars["--surface-2"]).toBe("#2f2f2f");
    expect(vars["--radius"]).toBe("10px");
  });

  it("light preset surfaces mix the tint toward white", () => {
    const vars = presetSurfaceVars("mars", "light");
    expect(vars["--surface"]).toBe(mixHex("#14100e", "#ffffff", 0.88));
    expect(vars["--border"]).toBe("rgba(0, 0, 0, 0.08)");
  });

  it("respects per-preset radius", () => {
    expect(presetSurfaceVars("mono", "dark")["--radius"]).toBe("8px");
    expect(presetSurfaceVars("midnight", "dark")["--radius"]).toBe("10px");
  });
});
