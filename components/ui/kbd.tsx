import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

/** Keyboard key cap. */
export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "border-border bg-surface-2 text-muted inline-flex h-5 min-w-5 items-center justify-center rounded border px-1.5 font-mono text-[11px]",
        className,
      )}
      {...props}
    />
  );
}
