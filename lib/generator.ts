/**
 * Local password generator (custom-string). Never touches the network and
 * never persists anything — it only returns a string for the user to copy.
 */

export interface GeneratorOptions {
  length: number;
  upper: boolean;
  lower: boolean;
  digits: boolean;
  symbols: boolean;
  /** Characters to exclude from the pool. */
  exclude: string;
}

export const DEFAULT_GENERATOR_OPTIONS: GeneratorOptions = {
  length: 16,
  upper: true,
  lower: true,
  digits: true,
  symbols: true,
  exclude: "",
};

const CHARSETS: Record<"upper" | "lower" | "digits" | "symbols", string> = {
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lower: "abcdefghijklmnopqrstuvwxyz",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?",
};

/** Build the usable pool from the selected character sets minus exclusions. */
export function buildPool(opts: Omit<GeneratorOptions, "length">): string {
  const sets = (["upper", "lower", "digits", "symbols"] as const)
    .filter((k) => opts[k])
    .map((k) => CHARSETS[k]);
  const exclusions = new Set(opts.exclude.split(""));
  const pool = sets
    .join("")
    .split("")
    .filter((c) => !exclusions.has(c))
    .join("");
  return [...new Set(pool)].join("");
}

/**
 * Generate a password. When no character set is enabled (or the pool is empty
 * after exclusions), falls back to lowercase letters so it never returns "".
 */
export function generatePassword(opts: GeneratorOptions = DEFAULT_GENERATOR_OPTIONS): string {
  const pool = buildPool(opts) || CHARSETS.lower;
  const length = Math.max(4, Math.min(128, Math.floor(opts.length)));
  const out = new Uint32Array(length);
  crypto.getRandomValues(out);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += pool[out[i]! % pool.length];
  }
  return result;
}
