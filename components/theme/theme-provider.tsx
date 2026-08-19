"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { applyTheme, PRESETS } from "@/lib/theme";
import { getSettings, saveSettings } from "@/lib/hydrate";
import { debounce } from "@/lib/utils/timers";
import type { ThemeMode, ThemePresetName } from "@/types";

const LS = {
  theme: "stxic:theme",
  preset: "stxic:preset",
  accent: "stxic:accent",
} as const;

interface ThemeState {
  theme: ThemeMode;
  preset: ThemePresetName;
  accent: string;
  setTheme: (theme: ThemeMode) => void;
  setPreset: (preset: ThemePresetName) => void;
  setAccent: (accent: string) => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

function readCache(): { theme: ThemeMode; preset: ThemePresetName; accent: string } {
  if (typeof window === "undefined") {
    return { theme: "dark", preset: "stxc", accent: "#00d4ff" };
  }
  return {
    theme: (localStorage.getItem(LS.theme) as ThemeMode | null) ?? "dark",
    preset: (localStorage.getItem(LS.preset) as ThemePresetName | null) ?? "stxc",
    accent: localStorage.getItem(LS.accent) ?? "#00d4ff",
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("dark");
  const [preset, setPresetState] = useState<ThemePresetName>("stxc");
  const [accent, setAccentState] = useState("#00d4ff");

  // Apply the cached theme right after mount (external system sync), then
  // reconcile with persisted settings (async — best source of truth).
  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(() => {
      if (cancelled) return;
      const cached = readCache();
      setThemeState(cached.theme);
      setPresetState(cached.preset);
      setAccentState(cached.accent);
      applyTheme(cached.theme, cached.preset, cached.accent);
    }, 0);

    getSettings().then((res) => {
      if (!res.ok || cancelled) return;
      const s = res.data;
      const nextTheme = s.theme ?? "dark";
      const nextPreset = s.themePreset ?? "stxc";
      const nextAccent = s.accent ?? "";
      setThemeState(nextTheme);
      setPresetState(nextPreset);
      setAccentState(nextAccent);
      applyTheme(nextTheme, nextPreset, nextAccent || undefined);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, []);

  const persist = useMemo(
    () =>
      debounce((patch: { themePreset?: ThemePresetName; accent?: string; theme?: ThemeMode }) => {
        void saveSettings(patch);
      }, 300),
    [],
  );

  const setTheme = useCallback(
    (t: ThemeMode) => {
      setThemeState(t);
      localStorage.setItem(LS.theme, t);
      applyTheme(t, preset, accent || undefined);
      persist({ theme: t });
    },
    [preset, accent, persist],
  );

  const setPreset = useCallback(
    (p: ThemePresetName) => {
      setPresetState(p);
      localStorage.setItem(LS.preset, p);
      const presetAccent = PRESETS[p].accent;
      // Keep the accent state + slider in sync with the preset's own accent.
      setAccentState(presetAccent);
      localStorage.setItem(LS.accent, presetAccent);
      applyTheme(theme, p, presetAccent);
      persist({ themePreset: p, accent: presetAccent });
    },
    [theme, persist],
  );

  const setAccent = useCallback(
    (a: string) => {
      setAccentState(a);
      localStorage.setItem(LS.accent, a);
      applyTheme(theme, preset, a);
      persist({ accent: a });
    },
    [theme, preset, persist],
  );

  const value = useMemo(
    () => ({ theme, preset, accent, setTheme, setPreset, setAccent }),
    [theme, preset, accent, setTheme, setPreset, setAccent],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
