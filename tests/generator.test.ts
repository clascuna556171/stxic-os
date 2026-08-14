import { describe, it, expect } from "vitest";
import { generatePassword, buildPool, DEFAULT_GENERATOR_OPTIONS } from "@/lib/generator";

describe("password generator", () => {
  it("produces the requested length", () => {
    const pwd = generatePassword({ ...DEFAULT_GENERATOR_OPTIONS, length: 32 });
    expect(pwd).toHaveLength(32);
  });

  it("honors selected character sets", () => {
    const pwd = generatePassword({
      ...DEFAULT_GENERATOR_OPTIONS,
      lower: true,
      upper: false,
      digits: false,
      symbols: false,
    });
    expect(pwd).toMatch(/^[a-z]+$/);
  });

  it("never emits excluded characters", () => {
    const pwd = generatePassword({
      ...DEFAULT_GENERATOR_OPTIONS,
      length: 64,
      exclude: "abcABC123",
    });
    for (const ch of pwd) {
      expect("abcABC123").not.toContain(ch);
    }
  });

  it("falls back to lowercase when all sets are disabled", () => {
    const pwd = generatePassword({
      ...DEFAULT_GENERATOR_OPTIONS,
      upper: false,
      lower: false,
      digits: false,
      symbols: false,
    });
    expect(pwd.length).toBeGreaterThanOrEqual(4);
    expect(pwd).toMatch(/^[a-z]+$/);
  });

  it("clamps length to a sane range", () => {
    expect(generatePassword({ ...DEFAULT_GENERATOR_OPTIONS, length: 1 })).toHaveLength(4);
    expect(generatePassword({ ...DEFAULT_GENERATOR_OPTIONS, length: 999 })).toHaveLength(128);
  });

  it("builds a pool without duplicates or exclusions", () => {
    const pool = buildPool({ ...DEFAULT_GENERATOR_OPTIONS, exclude: "a" });
    expect(pool).not.toContain("a");
    expect(new Set(pool).size).toBe(pool.length);
  });
});
