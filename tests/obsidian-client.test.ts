import { afterEach, describe, expect, it, vi } from "vitest";
import { createObsidianClient, encodeVaultPath } from "@/lib/obsidian/client";

const CONFIG = {
  baseUrl: "https://127.0.0.1:27124/",
  insecure: false,
  apiKey: "sekrit",
};

function fetchMock(status: number, body: unknown = {}) {
  return vi.fn().mockResolvedValue({ status, json: async () => body });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("encodeVaultPath", () => {
  it("encodes segments but preserves slashes", () => {
    expect(encodeVaultPath("Stxic/Foo/My Note.md")).toBe("Stxic/Foo/My%20Note.md");
  });
});

describe("getStatus", () => {
  it("reads the version from versions.self and sends Bearer auth", async () => {
    const fn = fetchMock(200, { versions: { self: "5.1.0", obsidian: "1.13.7" } });
    vi.stubGlobal("fetch", fn);
    const client = createObsidianClient(CONFIG);
    const res = await client.getStatus();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.version).toBe("5.1.0");
    expect(fn.mock.calls[0]![0]).toBe("https://127.0.0.1:27124/");
    expect((fn.mock.calls[0]![1] as RequestInit).headers).toMatchObject({
      Authorization: "Bearer sekrit",
    });
  });

  it("maps 401 to unauthorized", async () => {
    vi.stubGlobal("fetch", fetchMock(401));
    const res = await createObsidianClient(CONFIG).getStatus();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("unauthorized");
  });

  it("maps a network failure to connection-refused", async () => {
    const fn = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fn);
    const res = await createObsidianClient(CONFIG).getStatus();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("connection-refused");
  });
});

describe("writeNote", () => {
  it("PUTs text/markdown to the encoded vault path", async () => {
    const fn = fetchMock(200);
    vi.stubGlobal("fetch", fn);
    const res = await createObsidianClient(CONFIG).writeNote("Stxic/My Note.md", "hello");
    expect(res.ok).toBe(true);
    const [url, init] = fn.mock.calls[0]! as [string, RequestInit];
    expect(url).toBe("https://127.0.0.1:27124/vault/Stxic/My%20Note.md");
    expect(init.method).toBe("PUT");
    expect(init.body).toBe("hello");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("text/markdown");
  });
});

describe("listDirectory / readNote / appendNote / search", () => {
  it("maps the { files } listing to entries", async () => {
    const fn = fetchMock(200, { files: ["Note.md", "Folder/"] });
    vi.stubGlobal("fetch", fn);
    const res = await createObsidianClient(CONFIG).listDirectory();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual([{ filename: "Note.md" }, { filename: "Folder/" }]);
    expect(fn.mock.calls[0]![0]).toBe("https://127.0.0.1:27124/vault/");
  });

  it("requests the structured note shape on readNote", async () => {
    const fn = fetchMock(200, {
      tags: [],
      frontmatter: {},
      path: "Home.md",
      content: "hi",
      stat: { ctime: 1, mtime: 2, size: 3 },
    });
    vi.stubGlobal("fetch", fn);
    const res = await createObsidianClient(CONFIG).readNote("Home.md");
    expect(res.ok).toBe(true);
    const [, init] = fn.mock.calls[0]! as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Accept"]).toBe(
      "application/vnd.olrapi.note+json",
    );
  });

  it("POSTs to appendNote (append semantics)", async () => {
    const fn = fetchMock(200);
    vi.stubGlobal("fetch", fn);
    const res = await createObsidianClient(CONFIG).appendNote("Stxic/a.md", "more");
    expect(res.ok).toBe(true);
    const [, init] = fn.mock.calls[0]! as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("text/markdown");
  });

  it("sends the search query in the URL", async () => {
    const fn = fetchMock(200, [{ filename: "a.md", score: 1 }]);
    vi.stubGlobal("fetch", fn);
    const res = await createObsidianClient(CONFIG).search("hello world");
    expect(res.ok).toBe(true);
    const [url, init] = fn.mock.calls[0]! as [string, RequestInit];
    expect(url).toBe("https://127.0.0.1:27124/search/simple/?query=hello%20world");
    expect(init.method).toBe("POST");
  });
});
