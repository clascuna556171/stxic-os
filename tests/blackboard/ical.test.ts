import { describe, expect, it } from "vitest";
import { parseDateTime, parseIcal, unescapeIcalText, unfoldIcal } from "@/lib/blackboard/ical";

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

const FEED = `BEGIN:VCALENDAR
PRODID:-//Blackboard//EN
VERSION:2.0
BEGIN:VEVENT
DTSTAMP:20260815T085532Z
DTSTART;TZID=Asia/Manila:20260910T235900
DTEND;TZID=Asia/Manila:20260910T235900
SUMMARY:LABARATORY ACTIVITY 3 - MODEL STRUCTURING MIGRATION
UID:_blackboard.platform.gradebook2.GradableItem-_596735_1
END:VEVENT
BEGIN:VEVENT
DTSTAMP:20260815T085532Z
DTSTART;TZID=Asia/Manila:20260204T235959
DTEND;TZID=Asia/Manila:20260204T235959
SUMMARY:PORTFOLIO USING BOOTSTRAP \\, HTML AND CSS LAB ACTIVITY 6
UID:_blackboard.platform.gradebook2.GradableItem-_588947_1
DESCRIPTION:Build a portfolio page.
END:VEVENT
BEGIN:VEVENT
DTSTAMP:20260815T085532Z
DTSTART;TZID=Asia/Manila:20260315T235900
DTEND;TZID=Asia/Manila:20260315T235900
SUMMARY:LABORATORY ACTIV
 ITY 5 - CRUD LARAVEL
UID:_blackboard.platform.gradebook2.GradableItem-_596737_1
END:VEVENT
END:VCALENDAR
`;

describe("unfoldIcal", () => {
  it("joins folded continuation lines", () => {
    expect(unfoldIcal("A:first\n second")).toBe("A:firstsecond");
  });

  it("normalizes CRLF", () => {
    expect(unfoldIcal("A:x\r\nB:y")).toBe("A:x\nB:y");
  });
});

describe("unescapeIcalText", () => {
  it("unescapes commas and semicolons", () => {
    expect(unescapeIcalText("a\\, b\\; c")).toBe("a, b; c");
  });
});

describe("parseDateTime", () => {
  it("applies the TZID offset", () => {
    const epoch = parseDateTime("20260910T235900", { TZID: "Asia/Manila" });
    expect(epoch).toBe(Date.UTC(2026, 8, 10, 23, 59, 0) - MANILA_OFFSET_MS);
  });

  it("parses all-day dates as midnight", () => {
    expect(parseDateTime("20260315", {})).toBe(Date.UTC(2026, 2, 15));
  });
});

describe("parseIcal", () => {
  it("extracts uid, summary, description, and times", () => {
    const events = parseIcal(FEED);
    expect(events).toHaveLength(3);

    expect(events[0]!.summary).toBe("LABARATORY ACTIVITY 3 - MODEL STRUCTURING MIGRATION");
    expect(events[0]!.uid).toBe("_blackboard.platform.gradebook2.GradableItem-_596735_1");
    expect(events[0]!.description).toBeUndefined();
    expect(events[0]!.dtstart).toBe(Date.UTC(2026, 8, 10, 23, 59, 0) - MANILA_OFFSET_MS);
  });

  it("unescapes commas in summaries and reads descriptions", () => {
    const events = parseIcal(FEED);
    expect(events[1]!.summary).toBe("PORTFOLIO USING BOOTSTRAP , HTML AND CSS LAB ACTIVITY 6");
    expect(events[1]!.description).toBe("Build a portfolio page.");
  });

  it("unfolds folded summaries", () => {
    const events = parseIcal(FEED);
    expect(events[2]!.summary).toBe("LABORATORY ACTIVITY 5 - CRUD LARAVEL");
  });

  it("ignores non-VEVENT content and returns [] for garbage", () => {
    expect(parseIcal("hello")).toEqual([]);
  });
});
