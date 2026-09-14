import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";

import { shellFocusRingClass } from "@/features/app-shell/app-shell-ui";
import { cn } from "@/lib/utils";

type AppShellTeamCardButtonProps = {
  name: string;
  meta: string;
  mark: ReactNode;
  className?: string;
  ariaLabel: string;
} & Omit<ComponentPropsWithoutRef<"button">, "children" | "type">;

export function TeamCardOpenIndicator({ open }: { open: boolean }) {
  return (
    <div
      className={cn(
        "app-shell__team-card-indicator pointer-events-none absolute top-1/2 -right-1 -translate-y-1/2 transition-opacity duration-200",
        open ? "opacity-100" : "opacity-50 group-hover/team-card:opacity-90",
      )}
      aria-hidden
    >
      <svg
        className={cn(
          "size-5 transition-colors duration-200",
          open
            ? "text-primary"
            : "text-sidebar-foreground/45 group-hover/team-card:text-sidebar-foreground/70",
        )}
        fill="none"
        viewBox="0 0 12 24"
        width="12"
        height="24"
      >
        <path
          d="M2 4C6 8 6 16 2 20"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}

/** Editorial team identity card button — text left, logo right. Pair with TeamCardOpenIndicator. */
export const AppShellTeamCardButton = forwardRef<HTMLButtonElement, AppShellTeamCardButtonProps>(
  function AppShellTeamCardButton(
    { name, meta, mark, className, ariaLabel, ...triggerProps },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        className={cn("app-shell__team-card", shellFocusRingClass, className)}
        aria-label={ariaLabel}
        title={name}
        {...triggerProps}
      >
        <span className="app-shell__team-card-copy">
          <span className="app-shell__team-card-name">{name}</span>
          <span className="app-shell__team-card-meta">{meta}</span>
        </span>
        <span className="app-shell__team-card-mark">{mark}</span>
      </button>
    );
  },
);
