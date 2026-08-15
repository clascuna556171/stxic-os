import { describe, expect, it } from "vitest";
import { riskLabel, riskScore } from "@/lib/blackboard/risk";

const NOW = Date.UTC(2026, 7, 15, 0, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

describe("riskScore", () => {
  it("scores overdue + missing description as critical (3)", () => {
    expect(riskScore({ dtstart: NOW - DAY, description: "" }, NOW)).toBe(3);
  });

  it("scores overdue with description as high (2)", () => {
    expect(riskScore({ dtstart: NOW - DAY, description: "steps" }, NOW)).toBe(2);
  });

  it("scores due-soon with description as med (1)", () => {
    expect(riskScore({ dtstart: NOW + 2 * DAY, description: "steps" }, NOW)).toBe(1);
  });

  it("scores due-soon without description as high (2)", () => {
    expect(riskScore({ dtstart: NOW + 2 * DAY, description: "" }, NOW)).toBe(2);
  });

  it("scores distant + described as low (0)", () => {
    expect(riskScore({ dtstart: NOW + 10 * DAY, description: "steps" }, NOW)).toBe(0);
  });
});

describe("riskLabel", () => {
  it("maps scores to labels", () => {
    expect(riskLabel(0)).toBe("Low");
    expect(riskLabel(1)).toBe("Med");
    expect(riskLabel(2)).toBe("High");
    expect(riskLabel(3)).toBe("Critical");
  });
});
