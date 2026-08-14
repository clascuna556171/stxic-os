"use client";

import { passwordStrength } from "@/lib/strength";
import { cn } from "@/lib/utils/cn";

const SEGMENTS = [1, 2, 3, 4] as const;

function segmentColor(score: number): string {
  if (score <= 1) return "bg-danger";
  if (score === 2) return "bg-warning";
  return "bg-success";
}

/** Four-segment strength meter with label (local, token-colored). */
export function PasswordStrength({ value, className }: { value: string; className?: string }) {
  const { score, label } = passwordStrength(value);
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex gap-1" aria-hidden>
        {SEGMENTS.map((s) => (
          <div
            key={s}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-150",
              s <= score ? segmentColor(score) : "bg-surface-2",
            )}
          />
        ))}
      </div>
      <p className="text-muted text-xs">
        <span className="font-medium">{label}</span>
        {value ? ` — ${value.length} characters` : ""}
      </p>
    </div>
  );
}
