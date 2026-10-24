import { cn } from "@/lib/utils/cn";

/** Skeletal loader — matches final layout (craft rule: no generic spinners). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("bg-surface-2 animate-pulse rounded-xl motion-reduce:animate-none", className)}
    />
  );
}
