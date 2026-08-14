"use client";

import { Delete } from "lucide-react";

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

interface PinPadProps {
  onDigit: (d: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
  maxLength?: number;
}

export function PinPad({ onDigit, onBackspace, disabled, maxLength }: PinPadProps) {
  const base =
    "flex h-14 items-center justify-center rounded-xl border border-border bg-surface text-lg font-medium text-foreground transition-colors hover:bg-surface-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="mx-auto grid w-full max-w-[260px] grid-cols-3 gap-3">
      {DIGITS.map((d) => (
        <button
          key={d}
          type="button"
          className={base}
          disabled={disabled || maxLength !== undefined}
          onClick={() => onDigit(d)}
        >
          {d}
        </button>
      ))}
      <div aria-hidden />
      <button
        type="button"
        className={base}
        disabled={disabled || maxLength !== undefined}
        onClick={() => onDigit("0")}
      >
        0
      </button>
      <button
        type="button"
        aria-label="Delete"
        className={base}
        disabled={disabled}
        onClick={onBackspace}
      >
        <Delete className="size-5" />
      </button>
    </div>
  );
}

/** Dot indicators showing PIN entry progress. */
export function PinDots({ value, max = 6 }: { value: string; max?: number }) {
  return (
    <div className="flex items-center justify-center gap-3" aria-hidden>
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={
            i < value.length
              ? "bg-accent size-3 rounded-full transition-colors"
              : "border-border bg-surface-2 size-3 rounded-full border"
          }
        />
      ))}
    </div>
  );
}
