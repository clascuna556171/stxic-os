import { afterEach, describe, expect, it, vi } from "vitest";
import {
  badsDraftPrompt,
  dailyDigestPrompt,
  studyPlannerPrompt,
  threadSubPrompt,
} from "@/lib/ai/prompts";
import { CANNED_FALLBACK, resolveProvider } from "@/lib/ai/config";
import { chat, streamChat } from "@/lib/ai/router";
import { parseSseLine } from "@/lib/ai/client";
import { stripThink, stripThinkBlocks } from "@/lib/ai/groq";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("prompts", () => {
  it("daily digest asks for a briefing + top3Priorities JSON", () => {
    const p = dailyDigestPrompt({ date: "2026-08-15", tasks: "A", habits: "B", focus: "C" });
    expect(p).toContain("top3Priorities");
    expect(p).toContain("2026-08-15");
  });

  it("study planner produces a day-by-day schedule", () => {
    const p = studyPlannerPrompt({ tasks: "A", available: "2h" });
    expect(p).toContain("day-by-day");
  });

  it("bads draft keeps a TBD marker for unclear sections", () => {
    const p = badsDraftPrompt({ title: "Lab", description: "Do things" });
    expect(p).toContain("<details TBD>");
  });

  it("thread summarizer asks for a TL;DR bullet list", () => {
    const p = threadSubPrompt({ title: "T", text: "x".repeat(50) });
    expect(p).toContain("TL;DR");
  });
});

describe("resolveProvider", () => {
  it("auto → ollama primary with no groq key", () => {
    vi.stubEnv("GROQ_API_KEY", "");
    expect(resolveProvider("auto")).toEqual({ primary: "ollama", secondary: null });
  });

  it("auto → ollama primary, groq fallback when key present", () => {
    vi.stubEnv("GROQ_API_KEY", "sk-test");
    expect(resolveProvider("auto")).toEqual({ primary: "ollama", secondary: "groq" });
  });

  it("explicit providers are strict (no cross-fallback)", () => {
    vi.stubEnv("GROQ_API_KEY", "sk-test");
    expect(resolveProvider("groq")).toEqual({ primary: "groq", secondary: null });
    expect(resolveProvider("ollama")).toEqual({ primary: "ollama", secondary: null });
  });
});

describe("chat", () => {
  it("returns canned fallback when the only provider fails", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));

    const res = await chat([{ role: "user", content: "hi" }], { provider: "ollama" });
    expect(res.fallback).toBe(true);
    expect(res.provider).toBe("ollama");
    expect(res.text).toBe(CANNED_FALLBACK);
  });

  it("calls groq and returns its content when configured", async () => {
    vi.stubEnv("GROQ_API_KEY", "sk-test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ choices: [{ message: { content: "hello" } }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const res = await chat([{ role: "user", content: "hi" }], { provider: "groq" });
    expect(res.fallback).toBe(false);
    expect(res.provider).toBe("groq");
    expect(res.text).toBe("hello");
  });
});

describe("streamChat", () => {
  it("emits the canned fallback as a delta then done when all fail", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));

    const events = [];
    for await (const e of streamChat([{ role: "user", content: "hi" }], { provider: "ollama" })) {
      events.push(e);
    }
    expect(events[0]).toMatchObject({ type: "delta", fallback: true, text: CANNED_FALLBACK });
    expect(events[1]).toMatchObject({ type: "done", fallback: true });
  });
});

describe("parseSseLine", () => {
  it("parses a delta event", () => {
    const ev = parseSseLine('data: {"type":"delta","text":"hi","provider":"groq"}');
    expect(ev).toEqual({ type: "delta", text: "hi", provider: "groq" });
  });

  it("ignores non-data lines and malformed JSON", () => {
    expect(parseSseLine("event: message")).toBeNull();
    expect(parseSseLine("data: not json")).toBeNull();
    expect(parseSseLine('data: {"nope":1}')).toBeNull();
  });
});

describe("stripThink", () => {
  it("removes <think> reasoning blocks", () => {
    expect(stripThink("<think>Let me reason…</think>Answer.")).toBe("Answer.");
  });

  it("keeps answers without thinking", () => {
    expect(stripThink("Just an answer.")).toBe("Just an answer.");
  });

  it("handles a self-closing think tag", () => {
    expect(stripThink("<think/>Done.")).toBe("Done.");
  });
});

describe("stripThinkBlocks (streaming)", () => {
  it("preserves spaces between streamed fragments", () => {
    // Deltas are trimmed per-chunk in the OLD code, eating the leading space of
    // " world" and yielding "Helloworld". stripThinkBlocks must NOT trim.
    const chunks = ["Hello", " world", "!"];
    const joined = chunks.map((c) => stripThinkBlocks(c)).join("");
    expect(joined).toBe("Hello world!");
  });

  it("still removes think blocks when they leak into a fragment", () => {
    expect(stripThinkBlocks("<think>x</think> plain")).toBe(" plain");
  });
});
