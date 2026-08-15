/**
 * Obsidian Local REST API client (client-side only).
 *
 * Talks to the "Local REST API with MCP" community plugin on the user's own
 * machine (`https://127.0.0.1:27124` or the insecure `http://127.0.0.1:27123`
 * fallback). The Next.js server can never reach loopback — this runs in the
 * browser. Every request is Bearer-authed and returns a typed
 * `{ ok, data?, error? }` envelope; errors are categorized so the UI can show
 * the right copy (see docs/AGENT_OBSIDIAN_HYBRID.md).
 */

export interface ObsidianClientConfig {
  baseUrl: string;
  insecure: boolean;
  apiKey: string;
}

export type ObsidianErrorCode =
  "connection-refused" | "cert-untrusted" | "unauthorized" | "not-found" | "rate" | "unknown";

export interface ObsidianError {
  code: ObsidianErrorCode;
  message: string;
}

export type ObsidianResult<T> =
  { ok: true; data: T; error?: undefined } | { ok: false; data?: undefined; error: ObsidianError };

export interface NoteJson {
  tags: string[];
  frontmatter: Record<string, unknown>;
  stat: { ctime: number; mtime: number; size: number };
  path: string;
  content: string;
}

export interface DirectoryEntry {
  filename: string;
}

export interface SearchResult {
  filename: string;
  score: number;
}

export interface ObsidianClient {
  readonly baseUrl: string;
  getStatus(): Promise<ObsidianResult<{ version?: string }>>;
  listDirectory(path?: string): Promise<ObsidianResult<DirectoryEntry[]>>;
  readNote(path: string): Promise<ObsidianResult<NoteJson>>;
  writeNote(path: string, content: string): Promise<ObsidianResult<null>>;
  appendNote(path: string, content: string): Promise<ObsidianResult<null>>;
  deleteNote(path: string): Promise<ObsidianResult<null>>;
  search(query: string): Promise<ObsidianResult<SearchResult[]>>;
}

/** Encode a vault path segment-by-segment, preserving `/` separators. */
export function encodeVaultPath(path: string): string {
  return path
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

function networkError(baseUrl: string): ObsidianError {
  const https = baseUrl.startsWith("https://");
  return {
    code: "connection-refused",
    message: https
      ? "Obsidian must be running on this machine with the Local REST API plugin enabled. If it is, trust the self-signed certificate or enable HTTP mode (port 27123) in the plugin."
      : "Obsidian must be running on this machine with the Local REST API plugin enabled.",
  };
}

function statusError(status: number): ObsidianError {
  if (status === 401) {
    return {
      code: "unauthorized",
      message: "API key incorrect — check Obsidian → Settings → Local REST API.",
    };
  }
  if (status === 404) {
    return { code: "not-found", message: "That file or path was not found in the vault." };
  }
  if (status === 429) {
    return { code: "rate", message: "Obsidian rate-limited the request — try again shortly." };
  }
  return { code: "unknown", message: `Obsidian request failed (HTTP ${status}).` };
}

async function request(
  baseUrl: string,
  apiKey: string,
  path: string,
  init: RequestInit = {},
): Promise<ObsidianResult<Response>> {
  const url = `${baseUrl}${path}`;
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(init.headers as Record<string, string> | undefined),
      },
    });
    return { ok: true, data: res };
  } catch {
    return { ok: false, error: networkError(baseUrl) };
  }
}

/** True when the REST response is an auth failure (used for `GET /` status). */
function isOkStatus(res: Response): boolean {
  return res.status >= 200 && res.status < 300;
}

export function createObsidianClient(config: ObsidianClientConfig): ObsidianClient {
  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const { apiKey } = config;

  return {
    baseUrl,

    async getStatus() {
      const res = await request(baseUrl, apiKey, "/");
      if (!res.ok) return res;
      if (!isOkStatus(res.data)) return { ok: false, error: statusError(res.data.status) };
      const json = (await res.data.json().catch(() => ({}))) as {
        versions?: { self?: string; obsidian?: string };
      };
      return { ok: true, data: { version: json.versions?.self } };
    },

    async listDirectory(path = "") {
      const suffix = path ? `${encodeVaultPath(path)}/` : "";
      const res = await request(baseUrl, apiKey, `/vault/${suffix}`);
      if (!res.ok) return res;
      if (!isOkStatus(res.data)) return { ok: false, error: statusError(res.data.status) };
      const json = (await res.data.json().catch(() => ({}))) as { files?: string[] };
      const files = Array.isArray(json.files) ? json.files : [];
      return { ok: true, data: files.map((filename) => ({ filename })) };
    },

    async readNote(path) {
      const res = await request(baseUrl, apiKey, `/vault/${encodeVaultPath(path)}`, {
        headers: { Accept: "application/vnd.olrapi.note+json" },
      });
      if (!res.ok) return res;
      if (!isOkStatus(res.data)) return { ok: false, error: statusError(res.data.status) };
      const json = (await res.data.json().catch(() => null)) as NoteJson | null;
      if (!json)
        return { ok: false, error: { code: "unknown", message: "Empty response from Obsidian." } };
      return { ok: true, data: json };
    },

    async writeNote(path, content) {
      const res = await request(baseUrl, apiKey, `/vault/${encodeVaultPath(path)}`, {
        method: "PUT",
        body: content,
        headers: { "Content-Type": "text/markdown" },
      });
      if (!res.ok) return res;
      if (!isOkStatus(res.data)) return { ok: false, error: statusError(res.data.status) };
      return { ok: true, data: null };
    },

    async appendNote(path, content) {
      const res = await request(baseUrl, apiKey, `/vault/${encodeVaultPath(path)}`, {
        method: "POST",
        body: content,
        headers: { "Content-Type": "text/markdown" },
      });
      if (!res.ok) return res;
      if (!isOkStatus(res.data)) return { ok: false, error: statusError(res.data.status) };
      return { ok: true, data: null };
    },

    async deleteNote(path) {
      const res = await request(baseUrl, apiKey, `/vault/${encodeVaultPath(path)}`, {
        method: "DELETE",
      });
      if (!res.ok) return res;
      if (!isOkStatus(res.data)) return { ok: false, error: statusError(res.data.status) };
      return { ok: true, data: null };
    },

    async search(query) {
      const res = await request(
        baseUrl,
        apiKey,
        `/search/simple/?query=${encodeURIComponent(query)}`,
        {
          method: "POST",
          body: "{}",
          headers: { "Content-Type": "application/json" },
        },
      );
      if (!res.ok) return res;
      if (!isOkStatus(res.data)) return { ok: false, error: statusError(res.data.status) };
      const json = (await res.data.json().catch(() => [])) as SearchResult[];
      return { ok: true, data: json };
    },
  };
}
