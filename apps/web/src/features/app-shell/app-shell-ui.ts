/** Shared Tailwind class strings for the authenticated app shell. */
import { cn } from "@/lib/utils";

export const shellLabelClass = "text-[11px] font-bold uppercase tracking-[0.18em] text-muted";

export const shellFocusRingClass =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20";

export const shellEmptyPanelClass =
  "rounded-2xl border border-dashed border-default bg-muted/20 p-10 text-center";

export const shellErrorPanelClass = "rounded-2xl border border-error/30 bg-error/5 p-6 text-center";

export const shellRailIconClass = "size-4 shrink-0";

export const shellRailLinkClass = cn(
  "app-shell__rail-link text-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:scale-[0.98]",
  shellFocusRingClass,
);

export const shellRailLinkActiveClass =
  "bg-sidebar-accent text-sidebar-accent-foreground font-medium";

export const shellRailFooterClass = "app-shell__rail-footer";

export const shellChromeFrameClass = "app-shell__chrome app-shell__chrome-surface";

export const shellContextBarClass = "app-shell__context-bar";

export const shellChromePanelClass =
  "bg-card text-card-foreground shadow-sm ring-1 ring-foreground/5 dark:ring-foreground/10";

export const shellHeaderContextRegionClass = "app-shell__context-bar-left min-w-0";

export const shellHeaderContextInnerClass = "flex min-w-0 items-center gap-2";

export const shellNavLinkClass = cn(
  "relative inline-flex h-8 items-center rounded-md px-1.5 text-sm font-medium text-muted transition-colors hover:text-highlighted",
  shellFocusRingClass,
);

export const shellNavLinkActiveClass =
  "font-semibold text-highlighted after:absolute after:inset-x-1.5 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-primary";

export const shellUtilityClusterClass =
  "app-shell__utilities flex shrink-0 items-center justify-end gap-1.5";

export const shellSegmentTabClass =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-muted transition-colors hover:bg-elevated hover:text-highlighted";

export const shellSegmentTabActiveClass = "bg-primary/10 text-primary";

/** Document-scroll Agency pages — grow with content instead of locking to viewport height. */
export const shellPageScrollClass =
  "flex w-full min-h-full flex-col px-[var(--shell-nest-pad,1rem)] pb-4";

/** Nest-padded work surface — inset matches `--app-shell-topbar-inset` in execution. */
export const shellPageNestClass =
  "flex h-full w-full min-h-0 flex-1 flex-col overflow-hidden p-[var(--shell-nest-pad,1rem)]";

export const shellPageBodyClass = "flex min-h-0 flex-1 flex-col gap-4 pt-4";

/** Outer content frame — set on the shell page transition in execution mode. */
export const shellContentFrameClass = "overflow-hidden";

/** Motion utilities (see index.css for keyframes and reduced-motion guards). */
export const shellPageEnterClass = "shell-page-enter";

export const shellContentInClass = "shell-content-in";

export const shellStaggerItemClass = "shell-stagger-item";

export const shellConfirmInClass = "shell-confirm-in";
