import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import { EclipseGlyph } from "@/features/workspace-agent/eclipse-pet-view";
import { orchThreadRowMood, type OrchThreadRow } from "@/features/workspace-agent/orch-thread-row";
import { orchSettlePillTransition } from "@/features/workspace-agent/orch-settle-row-morph";

type OrchThreadRowViewProps = {
  thread: OrchThreadRow;
  active?: boolean;
  onSelect: () => void;
  variant?: "compact" | "settle";
  canSettle?: boolean;
  settling?: boolean;
  onSettle?: () => void;
};

export function OrchThreadRowView({
  thread,
  active = false,
  onSelect,
  variant = "compact",
  canSettle = false,
  settling = false,
  onSettle,
}: OrchThreadRowViewProps) {
  const live = thread.statusKind !== "idle";
  const maskId = `orch-thread-${thread.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const isSettle = variant === "settle";
  const showSettle = isSettle && Boolean(onSettle) && canSettle;
  const settlePinned = settling;

  const rowBody = (
    <>
      {live ? (
        <span className="flex min-w-0 items-center gap-1.5">
          {thread.statusKind === "running" ? (
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full border-[1.5px] border-[#5b5bd6]/30 border-t-[#5b5bd6] motion-safe:animate-spin"
            />
          ) : null}
          <span className="min-w-0 truncate font-mono text-[10px] leading-4 tracking-tight text-[#5b5bd6]">
            {thread.status}
          </span>
        </span>
      ) : null}
      <span className={cn("flex min-w-0 items-start gap-2.5", isSettle && "gap-3")}>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate font-medium text-foreground",
              isSettle ? "text-[13px] font-semibold leading-5" : "text-[13px] leading-5",
            )}
          >
            {thread.title}
          </span>
          {thread.meta ? (
            <span
              className={cn(
                "mt-0.5 block text-muted-foreground",
                isSettle
                  ? "line-clamp-2 text-[12px] leading-[1.35]"
                  : "truncate text-[11px] leading-4",
              )}
            >
              {thread.meta}
            </span>
          ) : null}
        </span>
        <span
          className={cn("shrink-0 text-foreground", isSettle ? "mt-0.5 size-6" : "mt-0.5 size-5")}
        >
          <EclipseGlyph mood={orchThreadRowMood(thread.statusKind)} maskId={maskId} />
        </span>
      </span>
    </>
  );

  if (!isSettle) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex w-full min-w-0 flex-col gap-0.5 rounded-[14.4px] px-2 py-1.5 text-start",
          active ? "bg-muted/80 shadow-[inset_0_0_0_1px_var(--foreground)]" : "hover:bg-muted/70",
        )}
      >
        {rowBody}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "group/row relative overflow-hidden rounded-[14.4px] border bg-card/80 shadow-sm",
        "transition-[background-color,box-shadow,border-color,transform] duration-200",
        settling && "scale-[0.985]",
        active
          ? "border-foreground/25 bg-muted/90 shadow-[inset_0_0_0_1px_var(--foreground)]"
          : "border-border/60 hover:border-border hover:bg-muted/70 dark:hover:bg-muted/55",
        settling && "border-border bg-muted/80 dark:bg-muted/65",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[14.4px] bg-foreground/0 transition-colors duration-200",
          settling && "bg-foreground/[0.08] dark:bg-foreground/[0.12]",
          !active &&
            !settling &&
            "group-hover/row:bg-foreground/[0.04] dark:group-hover/row:bg-foreground/[0.07]",
        )}
      />
      <button
        type="button"
        onClick={(event) => {
          onSelect();
          event.currentTarget.blur();
        }}
        disabled={settling}
        className="relative flex w-full min-w-0 flex-col gap-1 rounded-[14.4px] px-2.5 py-2.5 text-start disabled:cursor-default"
      >
        {rowBody}
      </button>
      {showSettle ? (
        <motion.button
          type="button"
          disabled={settling}
          aria-label={settling ? `Settling ${thread.title}` : `Settle ${thread.title}`}
          aria-busy={settling || undefined}
          transition={orchSettlePillTransition}
          whileTap={settling ? undefined : { scale: 0.94 }}
          className={cn(
            "absolute top-2 end-2 z-10 inline-flex h-7 items-center gap-1.5 rounded-[10px] px-2.5",
            "bg-foreground text-[11px] font-semibold text-background shadow-md",
            "transition-[opacity,transform,box-shadow] duration-150",
            settlePinned
              ? "pointer-events-auto translate-x-0 translate-y-0 opacity-100 shadow-lg"
              : cn(
                  "pointer-events-none opacity-0 -translate-y-1 translate-x-1",
                  "group-hover/row:pointer-events-auto group-hover/row:translate-x-0 group-hover/row:translate-y-0 group-hover/row:opacity-100 group-hover/row:shadow-lg",
                  "focus-visible:pointer-events-auto focus-visible:translate-x-0 focus-visible:translate-y-0 focus-visible:opacity-100 focus-visible:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                ),
            settling && "cursor-wait",
            "hover:bg-foreground/90",
          )}
          onClick={(event) => {
            event.stopPropagation();
            if (settling) return;
            onSettle?.();
          }}
        >
          {settling ? (
            <>
              <span
                aria-hidden
                className="size-3 shrink-0 rounded-full border-2 border-background/30 border-t-background motion-safe:animate-spin"
              />
              Settling
            </>
          ) : (
            "Settle"
          )}
        </motion.button>
      ) : null}
    </div>
  );
}
