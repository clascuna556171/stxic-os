import { useId } from "react";
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
 * Stxic brand mark — "Orbital S".
 *
 * Precision aerospace geometry ("SpaceX meets macOS"): a macOS squircle tile,
 * an inclined elliptical orbital trajectory with an active telemetry satellite
 * node, and a balanced geometric "S" monogram that adapts to `--accent`.
 */
export function BrandMark({ size = 20, className, tile = true, label = "Stxic" }: BrandMarkProps) {
  const uid = useId().replace(/:/g, "");
  const sGradId = `stxic-s-${uid}`;
  const tileSheenId = `stxic-sheen-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={cn("shrink-0 select-none", className)}
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id={sGradId} x1="30" y1="18" x2="70" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--accent-hover, var(--accent))" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
        <linearGradient id={tileSheenId} x1="50" y1="4" x2="50" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.07)" />
          <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
        </linearGradient>
      </defs>

      {tile ? (
        <>
          <rect
            x="4"
            y="4"
            width="92"
            height="92"
            rx="22"
            fill="var(--surface-2)"
            stroke="var(--border)"
            strokeWidth="2"
          />
          <rect x="5" y="5" width="90" height="90" rx="21" fill={`url(#${tileSheenId})`} />
        </>
      ) : null}

      {/* Inclined aerospace orbital trajectory */}
      <ellipse
        cx="50"
        cy="50"
        rx="35"
        ry="15"
        transform="rotate(-32 50 50)"
        stroke="var(--accent)"
        strokeOpacity="0.32"
        strokeWidth="3.5"
        strokeDasharray="150 28"
        strokeLinecap="round"
      />

      {/* Precision geometric "S" monogram */}
      <path
        d="M 62 30 C 62 20, 37 20, 37 34.5 C 37 48.5, 63 51.5, 63 65.5 C 63 80, 38 80, 38 70"
        stroke={`url(#${sGradId})`}
        strokeWidth="9.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Orbital satellite telemetry node */}
      <circle cx="79.5" cy="31.5" r="4.5" fill="var(--surface-2)" />
      <circle cx="79.5" cy="31.5" r="3.2" fill="var(--accent)" />
    </svg>
  );
}
