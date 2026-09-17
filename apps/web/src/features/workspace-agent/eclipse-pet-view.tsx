import { cn } from "@/lib/utils";

import type { EclipseMood } from "@/features/workspace-agent/eclipse-mood";

export function EclipseGlyph({
  mood,
  maskId = "eclipse-pet-bite",
}: {
  mood: EclipseMood;
  maskId?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      role="img"
      aria-hidden
      className="pointer-events-none size-full"
    >
      <defs>
        <mask id={maskId}>
          <rect width="64" height="64" fill="#fff" />
          <circle cx="46" cy="20" r="9" fill="#000" />
        </mask>
      </defs>
      <circle
        cx="32"
        cy="32"
        r="20"
        fill="currentColor"
        className="text-foreground"
        mask={`url(#${maskId})`}
      />
      <circle
        cx="46"
        cy="20"
        r="3.2"
        fill="oklch(0.58 0.21 260.84)"
        className={cn(
          mood === "working" && "origin-center motion-safe:animate-pulse",
          mood === "needs-you" && "motion-safe:animate-pulse",
        )}
      />
    </svg>
  );
}
