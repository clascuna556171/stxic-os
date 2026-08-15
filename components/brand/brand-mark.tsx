import { cn } from "@/lib/utils/cn";

interface BrandMarkProps {
  /** Rendered size in px (SVG viewBox is 100×100). */
  size?: number;
  className?: string;
  /** Omit the rounded tile (for transparent contexts like the topbar). */
  tile?: boolean;
  label?: string;
}

/**
 * Stxic brand mark — "Orbit S".
 *
 * A rounded tile (macOS squircle) with a subtle orbital ring whose arc is
 * broken by a stylized "S", and a bright core dot at the center — aerospace
 * + personal-OS, adapting to the active preset via `--accent`.
 */
export function BrandMark({ size = 20, className, tile = true, label = "Stxic" }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={cn("shrink-0", className)}
      role="img"
      aria-label={label}
    >
      {tile ? (
        <rect width="100" height="100" rx="24" fill="var(--surface-2)" stroke="var(--border)" />
      ) : null}
      <circle
        cx="50"
        cy="50"
        r="31"
        fill="none"
        stroke="var(--accent)"
        strokeOpacity="0.35"
        strokeWidth="4"
      />
      <path
        d="M 42 33 C 55 29, 62 35, 57 44 C 53 51, 44 48, 45 55 C 46 63, 51 69, 59 68"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="50" r="7" fill="var(--accent)" />
    </svg>
  );
}
