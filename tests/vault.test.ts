import { describe, it, expect } from "vitest";
import type { VaultItem } from "@/types";
import { reusedPasswordIds, vaultFolders, vaultTags, passwordHash } from "@/lib/vault";

function item(id: string, password: string, folder = "", tags: string[] = []): VaultItem {
  return {
    id,
    folder,
    name: id,
    username: "u",
    password,
    tags,
    favorite: false,
    createdAt: 0,
    updatedAt: 0,
  };
}

describe("vault reuse detection", () => {
  it("flags items sharing the same password", async () => {
    const items = [item("a", "hunter2"), item("b", "hunter2"), item("c", "other")];
    const reused = await reusedPasswordIds(items);
    expect(reused.has("a")).toBe(true);
    expect(reused.has("b")).toBe(true);
    expect(reused.has("c")).toBe(false);
  });

  it("ignores empty passwords", async () => {
    const items = [item("a", ""), item("b", "")];
    expect((await reusedPasswordIds(items)).size).toBe(0);
  });

  it("hashes deterministically", async () => {
    expect(await passwordHash("secret")).toBe(await passwordHash("secret"));
    expect(await passwordHash("secret")).not.toBe(await passwordHash("other"));
  });
});

describe("vault folder/tag derivation", () => {
  it("collects distinct, sorted folders", () => {
    const folders = vaultFolders([
      item("a", "p", "Work"),
      item("b", "p", "Personal"),
      item("c", "p", "Work"),
    ]);
    expect(folders).toEqual(["Personal", "Work"]);
  });

  it("collects distinct, sorted tags", () => {
    const tags = vaultTags([
      item("a", "p", "", ["dev", "prod"]),
      item("b", "p", "", ["dev", "email"]),
    ]);
    expect(tags).toEqual(["dev", "email", "prod"]);
  });
});
