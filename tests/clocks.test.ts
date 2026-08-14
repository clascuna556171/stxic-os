import { describe, it, expect } from "vitest";
import { formatOffset, timeZoneLabel, timeZoneOffsetMinutes } from "@/lib/clocks";

describe("timeZoneLabel", () => {
  it("uses known labels and falls back to path segment", () => {
    expect(timeZoneLabel("Asia/Manila")).toBe("Manila");
    expect(timeZoneLabel("America/Los_Angeles")).toBe("Los Angeles");
    expect(timeZoneLabel("Foo/Bar_Baz")).toBe("Bar Baz");
  });
});

describe("timeZoneOffsetMinutes", () => {
  it("returns 0 for UTC", () => {
    expect(timeZoneOffsetMinutes("UTC", new Date(2026, 0, 1, 12, 0, 0))).toBe(0);
  });
});

describe("formatOffset", () => {
  it("formats positive, negative, and zero offsets", () => {
    expect(formatOffset(480)).toBe("+08:00");
    expect(formatOffset(-300)).toBe("-05:00");
    expect(formatOffset(0)).toBe("+00:00");
  });
});
