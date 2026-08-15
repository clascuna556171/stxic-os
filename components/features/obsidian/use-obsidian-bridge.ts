"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getObsidianConfig } from "@/lib/hydrate";
import {
  createObsidianClient,
  type ObsidianClient,
  type ObsidianResult,
} from "@/lib/obsidian/client";
import { buildPushPath, pushContent } from "@/lib/obsidian/sync";
import type { Note, ObsidianSettings } from "@/types";

export interface ObsidianBridge {
  config: ObsidianSettings | null;
  client: ObsidianClient | null;
  connected: boolean;
  refreshing: boolean;
  refresh: () => void;
  pushNote: (note: Note) => Promise<ObsidianResult<null>>;
}

/**
 * Client-side bridge to the Local REST API. Loads the encrypted config from
 * hydrate (decrypted in-browser) and builds the REST client. `connected`
 * reflects a live `GET /` ping; call `refresh()` to re-check on demand.
 */
export function useObsidianBridge(): ObsidianBridge {
  const [config, setConfig] = useState<ObsidianSettings | null>(null);
  const [connected, setConnected] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getObsidianConfig().then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setConfig(res.data);
        setConnected(res.data.enabled && Boolean(res.data.lastConnectedAt));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const client = useMemo(
    () =>
      config?.enabled
        ? createObsidianClient({
            baseUrl: config.baseUrl,
            insecure: config.insecure,
            apiKey: config.encryptedKey,
          })
        : null,
    [config],
  );

  const refresh = useCallback(() => {
    if (!client) {
      setConnected(false);
      return;
    }
    setRefreshing(true);
    void client.getStatus().then((res) => {
      setConnected(res.ok);
      setRefreshing(false);
    });
  }, [client]);

  const pushNote = useCallback(
    async (note: Note): Promise<ObsidianResult<null>> => {
      if (!client) {
        return {
          ok: false,
          error: { code: "unknown", message: "Obsidian is not enabled — check Settings." },
        };
      }
      const result = await client.writeNote(buildPushPath(note), pushContent(note));
      if (result.ok) setConnected(true);
      return result;
    },
    [client],
  );

  return { config, client, connected, refreshing, refresh, pushNote };
}
