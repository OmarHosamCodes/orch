import { cn } from "@/lib/utils";

import { eclipseMoodLabel, type EclipseMood } from "@/features/workspace-agent/eclipse-mood";

type EclipsePetViewProps = {
  mood: EclipseMood;
  expanded: boolean;
  oneLiner: string | null;
  onOpen: () => void;
  className?: string;
};

export function EclipsePetView({
  mood,
  expanded,
  oneLiner,
  onOpen,
  className,
}: EclipsePetViewProps) {
  const label = eclipseMoodLabel(mood);
  return (
    <div className={cn("flex flex-col items-end gap-1.5", className)}>
      {oneLiner && mood === "needs-you" ? (
        <p className="max-w-48 rounded-lg border border-border bg-card px-2 py-1 text-xs text-foreground shadow-sm">
          {oneLiner}
        </p>
      ) : null}
      <button
        type="button"
        aria-label={label}
        aria-expanded={expanded}
        aria-haspopup="dialog"
        aria-busy={mood === "working" || undefined}
        data-eclipse-mood={mood}
        title={oneLiner ?? label}
        onClick={onOpen}
        className={cn(
          "size-12 overflow-hidden rounded-full border border-border bg-card shadow-md",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          mood === "working" && "eclipse-pet--working",
          mood === "needs-you" && "eclipse-pet--needs-you",
          mood === "error" && "opacity-80",
          mood === "done" && "eclipse-pet--done",
        )}
      >
        <EclipseGlyph mood={mood} />
        <span className="sr-only">{label}</span>
      </button>
    </div>
  );
}

function EclipseGlyph({ mood }: { mood: EclipseMood }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      role="img"
      aria-hidden
      className="pointer-events-none size-full"
    >
      <defs>
        <mask id="eclipse-pet-bite">
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
        mask="url(#eclipse-pet-bite)"
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
