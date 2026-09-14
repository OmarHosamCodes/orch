import { Check, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/lib/utils";

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Readable labels for common canvas + agency tools. */
const TOOL_LABELS: Record<string, string> = {
  ui_present: "Painting canvas",
  ask_agency_question: "Asking a question",
  draft_agency_plan: "Drafting plan",
  draft_canvas_plan: "Drafting canvas plan",
  propose_agency_action: "Proposing change",
  propose_canvas_action: "Proposing canvas change",
  list_dashboard_nodes: "Listing nodes",
  search_dashboard: "Searching canvas",
  list_marketplace_items: "Listing marketplace",
  search_marketplace: "Searching marketplace",
  get_node_details: "Reading node",
  get_tab_details: "Reading tab",
  get_block_details: "Reading block",
  get_marketplace_item_details: "Reading marketplace item",
  create_node: "Creating node",
  replace_node: "Updating node",
  delete_node: "Deleting node",
  create_tab: "Creating tab",
  replace_tab: "Updating tab",
  delete_tab: "Deleting tab",
  create_block: "Creating block",
  patch_block: "Patching block",
  replace_block: "Updating block",
  delete_block: "Deleting block",
  fetch_web_page: "Fetching page",
  get_current_time: "Checking time",
  list_agency_time_entries: "Listing time entries",
  list_agency_projects: "Listing projects",
  list_agency_members: "Listing members",
  get_agency_time_summary: "Summarizing time",
  get_agency_reports_summary: "Summarizing reports",
};

export type WorkspaceAgentThinkingStep = {
  id: string;
  name: string;
  done: boolean;
};

function toolLabel(name: string): string {
  const known = TOOL_LABELS[name];
  if (known) return known;
  return name
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const STEP_DONE_TONE = "bg-secondary text-secondary-foreground";

/** Quiet stream-of-thought: muted timeline, active step uses primary only. */
export function WorkspaceAgentThinkingActivityView({
  steps,
  live,
}: {
  steps: WorkspaceAgentThinkingStep[];
  live: boolean;
}) {
  // MotionConfig reducedMotion="user" on the shell owns a11y motion preference.
  if (steps.length === 0 && !live) return null;

  const active = [...steps].reverse().find((s) => !s.done) ?? null;
  const doneCount = steps.filter((s) => s.done).length;
  const stepsComplete = steps.length > 0 && doneCount === steps.length;
  const working = live && !stepsComplete;
  const statusLine = active
    ? toolLabel(active.name)
    : working && steps.length === 0
      ? "Thinking"
      : stepsComplete
        ? doneCount === 1
          ? "1 step complete"
          : `${doneCount} steps complete`
        : "Working";

  return (
    <motion.details
      open={!stepsComplete}
      layout
      className={cn(
        "relative max-w-[min(100%,36rem)] overflow-hidden rounded-xl border",
        working ? "border-border bg-muted/50" : "border-border bg-muted/40",
      )}
      role="status"
      aria-label="Assistant activity"
      aria-live="polite"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
    >
      <summary className="relative flex cursor-pointer list-none items-center gap-2 px-2.5 py-2 [&::-webkit-details-marker]:hidden">
        <span className="relative flex size-5 shrink-0 items-center justify-center">
          {working ? (
            <span className="flex size-5 items-center justify-center rounded-full bg-muted text-foreground">
              <Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden />
            </span>
          ) : (
            <motion.span
              key="done-badge"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
              className="flex size-5 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
            >
              <Check className="size-3 stroke-[2.5]" aria-hidden />
            </motion.span>
          )}
        </span>
        <p
          className={cn(
            "min-w-0 flex-1 truncate text-[11px] font-semibold tracking-tight",
            working ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {statusLine}
        </p>
        {steps.length > 0 ? (
          <motion.span
            key={`${doneCount}-${steps.length}`}
            initial={{ scale: 0.9, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-medium tabular-nums text-muted-foreground",
              stepsComplete ? "bg-secondary/30" : "bg-muted",
            )}
          >
            {doneCount}/{steps.length}
          </motion.span>
        ) : null}
      </summary>

      {steps.length > 0 ? (
        <ul className="relative flex flex-col gap-0.5 border-t border-border/40 px-1.5 py-1.5">
          <AnimatePresence initial={false}>
            {steps.map((state, index) => {
              const isActive = working && state.id === active?.id;
              return (
                <motion.li
                  key={state.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    duration: 0.16,
                    delay: Math.min(index, 5) * 0.03,
                    ease: EASE_OUT_EXPO,
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-1.5 py-1 text-[11px] leading-none",
                    isActive && "bg-muted",
                    state.done && !isActive && "text-foreground/70",
                    !state.done && !isActive && "text-muted-foreground",
                  )}
                >
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    {state.done ? (
                      <span
                        className={cn(
                          "flex size-4 items-center justify-center rounded-full",
                          STEP_DONE_TONE,
                        )}
                      >
                        <Check className="size-2.5 stroke-[2.5]" aria-hidden />
                      </span>
                    ) : isActive ? (
                      <span className="relative flex size-4 items-center justify-center">
                        <Loader2
                          className="relative size-3.5 animate-spin text-foreground motion-reduce:animate-none"
                          aria-hidden
                        />
                      </span>
                    ) : (
                      <span className="size-1.5 rounded-full bg-muted-foreground/40" aria-hidden />
                    )}
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate",
                      isActive && "font-semibold text-foreground",
                      state.done && "font-medium",
                    )}
                  >
                    {toolLabel(state.name)}
                  </span>
                  <span className="sr-only">
                    {state.done ? "finished" : isActive ? "running" : "queued"}
                  </span>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      ) : null}
    </motion.details>
  );
}
