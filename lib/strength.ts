/** Local password strength (0–4) — no network, no password leaves the tab. */

export interface StrengthResult {
  score: number; // 0..4
  label: string;
}

export function passwordStrength(value: string): StrengthResult {
  if (!value) return { score: 0, label: "Too short" };

  let classes = 0;
  if (/[a-z]/.test(value)) classes++;
  if (/[A-Z]/.test(value)) classes++;
  if (/\d/.test(value)) classes++;
  if (/[^A-Za-z0-9]/.test(value)) classes++;

  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (classes >= 3) score++;
  if (classes >= 4 && value.length >= 10) score++;
  score = Math.min(4, score);

  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
  return { score, label: labels[score] ?? "Strong" };
}
