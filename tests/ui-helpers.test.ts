import { describe, it, expect } from "vitest";
import { formatCurrency, currencySymbol } from "@/lib/utils/currency";
import { weekLog } from "@/lib/habits";

describe("UI & Currency Helpers", () => {
  it("formats currencies correctly across locales", () => {
    expect(currencySymbol("PHP")).toBe("₱");
    expect(currencySymbol("USD")).toBe("$");
    expect(currencySymbol("EUR")).toBe("€");
    expect(currencySymbol("JPY")).toBe("¥");

    const php = formatCurrency(12345.5, "PHP");
    expect(php).toContain("12,345.50");

    const usd = formatCurrency(1000, "USD");
    expect(usd).toContain("1,000.00");

    const jpy = formatCurrency(5000, "JPY");
    expect(jpy).toContain("5,000");

    const compactPhp = formatCurrency(12000, "PHP", true);
    expect(compactPhp).toContain("12,000");
  });

  it("calculates 7-day weekLog in correct order", () => {
    const base = new Date(2026, 9, 24).getTime();
    const log: Record<string, boolean> = {
      "2026-10-24": true,
      "2026-10-23": true,
      "2026-10-20": true,
    };
    const days = weekLog(log, base);
    expect(days).toHaveLength(7);
    expect(days[6]).toBe(true); // today (24th)
    expect(days[5]).toBe(true); // yesterday (23rd)
    expect(days[2]).toBe(true); // 4 days ago (20th)
    expect(days[0]).toBe(false); // 6 days ago (18th)
  });
});
