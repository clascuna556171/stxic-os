import { describe, it, expect } from "vitest";
import {
  buildManifest,
  decryptSnapshot,
  encryptSnapshot,
  parseBackup,
  serializeBackup,
  uidHash,
} from "@/lib/backup/format";
import type { BackupSnapshot } from "@/lib/hydrate";

function snapshot(): BackupSnapshot {
  return {
    vault: [
      {
        id: "v1",
        folder: "Work",
        name: "GitHub",
        username: "me",
        password: "secret",
        tags: ["dev"],
        favorite: false,
        createdAt: 1,
        updatedAt: 2,
      },
    ],
    notes: [],
    tasks: [],
    income: [],
    habits: [],
    focusSessions: [],
    settings: {
      themePreset: "stxc",
      accent: "#00D4FF",
      theme: "dark",
      autoLockMin: 5,
      defaultCurrency: "PHP",
      obsidian: {
        enabled: false,
        baseUrl: "https://127.0.0.1:27124",
        insecure: false,
        encryptedKey: "",
        mcpUrl: "",
      },
    },
    newsConfig: { sources: [], saved: [], readLater: [] },
    blackboard: { events: [], mirrored: [] },
  };
}

describe("backup format", () => {
  it("hashes the uid deterministically and never exposes it", async () => {
    const a = await uidHash("user-123");
    const b = await uidHash("user-123");
    expect(a).toBe(b);
    expect(a).not.toContain("user-123");
  });

  it("builds a valid manifest with all collections", async () => {
    const manifest = await buildManifest("user-123", 12345);
    expect(manifest).toMatchObject({ version: 1, schema: "stxic", exportedAt: 12345 });
    expect(manifest.collections).toContain("vault");
    expect(manifest.collections).toContain("settings");
  });

  it("round-trips a snapshot through encryption", async () => {
    const file = await encryptSnapshot("user-123", "correct horse", snapshot());
    const restored = await decryptSnapshot("correct horse", file);
    expect(restored.vault[0]?.name).toBe("GitHub");
  });

  it("rejects the wrong master password", async () => {
    const file = await encryptSnapshot("user-123", "correct horse", snapshot());
    await expect(decryptSnapshot("wrong", file)).rejects.toThrow();
  });

  it("serializes and parses the envelope", async () => {
    const file = await encryptSnapshot("user-123", "correct horse", snapshot());
    const text = serializeBackup(file);
    const parsed = parseBackup(text);
    expect(parsed.manifest.uidHash).toBe(file.manifest.uidHash);
    expect(parsed.salt).toBe(file.salt);
  });

  it("rejects malformed files", () => {
    expect(() => parseBackup("not json")).toThrow();
    expect(() => parseBackup("{}")).toThrow();
  });
});
