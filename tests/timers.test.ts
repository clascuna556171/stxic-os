import { describe, expect, it, vi } from "vitest";
import { withTimeout } from "@/lib/utils/timers";

describe("withTimeout", () => {
  it("resolves with the wrapped value", async () => {
    await expect(withTimeout(Promise.resolve("ok"), 1000)).resolves.toBe("ok");
  });

  it("propagates the wrapped rejection", async () => {
    await expect(withTimeout(Promise.reject(new Error("boom")), 1000)).rejects.toThrow("boom");
  });

  it("rejects when the promise hangs past the deadline", async () => {
    vi.useFakeTimers();
    try {
      const hanging = withTimeout(new Promise(() => {}), 50, "timed out");
      const assertion = expect(hanging).rejects.toThrow("timed out");
      await vi.advanceTimersByTimeAsync(100);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
});
