import type { ThemeMode, ThemePreset, ThemePresetName } from "@/types";

/** Preset registry — see docs/AGENT_UI_DESIGN.md. */
export const PRESETS: Record<ThemePresetName, ThemePreset> = {
  stxc: {
    name: "stxc",
    label: "Stxc",
    accent: "#00d4ff",
    surface: "#131313",
    radius: "10px",
    font: "Inter",
  },
  mars: {
    name: "mars",
    label: "Mars",
    accent: "#ff6b35",
    surface: "#14100e",
    radius: "12px",
    font: "Inter",
  },
  midnight: {
    name: "midnight",
    label: "Midnight",
    accent: "#818cf8",
    surface: "#101018",
    radius: "10px",
    font: "Inter",
  },
  mono: {
    name: "mono",
    label: "Mono",
    accent: "#a3a3a3",
    surface: "#131313",
    radius: "8px",
    font: "Inter",
  },
};

export const PRESET_LIST: ThemePreset[] = Object.values(PRESETS);

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/** WCAG relative luminance (0..1). */
function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

/** Readable foreground (dark or white) for a given accent. */
export function contrastFg(hex: string): string {
  return luminance(hex) > 0.55 ? "#0a0a0a" : "#ffffff";
}

/** Extract the hue (0..360) of a hex color (for the accent slider). */
export function hexToHue(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r ?? 0, g ?? 0, b ?? 0);
  const min = Math.min(r ?? 0, g ?? 0, b ?? 0);
  const d = max - min;
  if (d === 0) return 0;
  let h = 0;
  if (max === r) h = ((g! - b!) / d) % 6;
  else if (max === g) h = (b! - r!) / d + 2;
  else h = (r! - g!) / d + 4;
  h = Math.round(h * 60);
  return h < 0 ? h + 360 : h;
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (n: number) =>
    Math.round(255 * f(n))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(0)}${toHex(8)}${toHex(4)}`;
}

/** Hue → vivid accent hex (saturation/lightness fixed for a lively accent). */
export function hueToHex(hue: number): string {
  return hslToHex(hue, 100, 55);
}

/** Linear blend of two hex colors: t=0 → a, t=1 → b. */
export function mixHex(a: string, b: string, t: number): string {
  const ar = hexToRgb(a);
  const br = hexToRgb(b);
  const mix = (i: number) => Math.round((ar[i] ?? 0) + ((br[i] ?? 0) - (ar[i] ?? 0)) * t);
  const to2 = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${to2(mix(0))}${to2(mix(1))}${to2(mix(2))}`;
}

/**
 * Full surface/radius vars for a preset + theme, derived from the preset's
 * dark `surface`. Light mode mixes the tint toward white. Pure + unit-tested.
 */
export function presetSurfaceVars(
  preset: ThemePresetName,
  theme: ThemeMode,
): Record<string, string> {
  const p = PRESETS[preset];
  if (theme === "light") {
    return {
      "--surface": mixHex(p.surface, "#ffffff", 0.88),
      "--surface-2": mixHex(p.surface, "#ffffff", 0.95),
      "--border": "rgba(0, 0, 0, 0.08)",
      "--radius": p.radius,
    };
  }
  return {
    "--surface": p.surface,
    "--surface-2": mixHex(p.surface, "#ffffff", 0.12),
    "--border": "rgba(255, 255, 255, 0.06)",
    "--radius": p.radius,
  };
}

/**
 * Apply theme + preset + (optional) custom accent to the document root.
 * CSS-var only — instant, no re-render (craft rule). Applies the full preset:
 * accent, surfaces, radius, and font.
 */
export function applyTheme(
  theme: ThemeMode,
  preset: ThemePresetName,
  accent?: string,
): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const a = accent ?? PRESETS[preset].accent;

  root.setAttribute("data-theme", theme);
  root.setAttribute("data-preset", preset);
  root.style.setProperty("--accent", a);
  root.style.setProperty("--accent-hover", `color-mix(in srgb, ${a} 88%, white)`);
  root.style.setProperty("--accent-fg", contrastFg(a));
  root.style.setProperty("--preset-font", `"${PRESETS[preset].font}"`);
  for (const [key, value] of Object.entries(presetSurfaceVars(preset, theme))) {
    root.style.setProperty(key, value);
  }
}
