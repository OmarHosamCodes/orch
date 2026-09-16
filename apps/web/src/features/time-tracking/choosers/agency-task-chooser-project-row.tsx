import { ChevronDown, Plus, Star } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

import { AgencyEntityMark } from "@/features/shared/agency-entity-mark";
import { AgencySearchHighlight } from "@/features/shared/agency-search-highlight";
import {
  agencyFocusRingClass,
  agencyTaskChooserRowActiveClass,
  agencyTaskChooserRowClass,
} from "@/features/shared/agency-ui";
import {
  chooserBaseTransition,
  chooserStarPopTransition,
  chooserTapScale,
} from "@/features/time-tracking/agency-task-chooser-motion";
import { projectHueStyle } from "@/features/shared/project-palette";
import { cn } from "@/lib/utils";

type AgencyTaskChooserProjectRowProps = {
  projectId: string;
  projectName: string;
  clientName: string;
  colorHueId?: number | null;
  iconKey?: string | null;
  taskCount: number;
  expanded: boolean;
  favorited: boolean;
  active?: boolean;
  optionId?: string;
  searchTerm: string;
  highlightSearch: boolean;
  showClientName: boolean;
  showCreateTask: boolean;
  createMuted?: boolean;
  /** Project-pick mode: row selects the project; hide expand chevron. */
  pickMode?: boolean;
  onToggle: () => void;
  onToggleFavorite: () => void;
  onCreateTask: () => void;
};

export function AgencyTaskChooserProjectRow({
  projectId,
  projectName,
  clientName,
  colorHueId,
  iconKey,
  taskCount,
  expanded,
  favorited,
  active = false,
  optionId,
  searchTerm,
  highlightSearch,
  showClientName,
  showCreateTask,
  createMuted = false,
  pickMode = false,
  onToggle,
  onToggleFavorite,
  onCreateTask,
}: AgencyTaskChooserProjectRowProps) {
  const projectStyle = projectHueStyle(projectId, colorHueId);
  const [starPopKey, setStarPopKey] = useState(0);

  return (
    <motion.div
      className={cn(agencyTaskChooserRowClass, "pr-1", active && agencyTaskChooserRowActiveClass)}
      transition={chooserBaseTransition}
    >
      <motion.button
        type="button"
        id={optionId}
        role="option"
        aria-selected={active}
        title={projectName}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left",
          agencyFocusRingClass,
        )}
        whileTap={chooserTapScale}
        transition={chooserBaseTransition}
        onClick={onToggle}
        aria-expanded={pickMode ? undefined : expanded}
      >
        <AgencyEntityMark
          name={projectName}
          projectId={projectId}
          iconKey={iconKey}
          colorHueId={colorHueId}
        />
        <span className="min-w-0 flex-1 truncate text-sm leading-snug">
          <span
            className="font-semibold text-[var(--project-hue)] dark:text-[var(--project-hue-dark)]"
            style={projectStyle}
          >
            {highlightSearch ? (
              <AgencySearchHighlight text={projectName} query={searchTerm} />
            ) : (
              projectName
            )}
          </span>
          {showClientName && clientName ? (
            <span className="font-normal text-muted-foreground">
              {" · "}
              {highlightSearch ? (
                <AgencySearchHighlight text={clientName} query={searchTerm} />
              ) : (
                clientName
              )}
            </span>
          ) : null}
        </span>
        {!pickMode ? (
          <span className="shrink-0 text-[11px] font-normal text-muted-foreground tabular-nums">
            {taskCount} {taskCount === 1 ? "task" : "tasks"}
          </span>
        ) : null}
        {!pickMode ? (
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={chooserBaseTransition}
            className="inline-flex shrink-0"
          >
            <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
          </motion.span>
        ) : null}
      </motion.button>
      <motion.button
        type="button"
        aria-label={favorited ? "Remove project from favorites" : "Add project to favorites"}
        className={cn(
          "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground",
          "[@media(hover:hover)]:pointer-events-none [@media(hover:hover)]:opacity-0 transition-opacity",
          "group-hover:pointer-events-auto group-hover:opacity-100",
          "focus-visible:pointer-events-auto focus-visible:opacity-100",
          favorited && "pointer-events-auto text-warning opacity-100",
          agencyFocusRingClass,
        )}
        whileTap={chooserTapScale}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.stopPropagation();
          setStarPopKey((key) => key + 1);
          onToggleFavorite();
        }}
      >
        <motion.span
          key={starPopKey}
          initial={starPopKey === 0 ? false : { scale: 1 }}
          animate={starPopKey === 0 ? { scale: 1 } : { scale: [1, 1.15, 1] }}
          transition={chooserStarPopTransition}
          className="inline-flex"
        >
          <Star className={cn("size-3.5", favorited && "fill-current")} aria-hidden />
        </motion.span>
      </motion.button>
      {showCreateTask && expanded ? (
        <motion.button
          type="button"
          aria-label="Create task"
          className={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-md",
            createMuted ? "text-muted-foreground" : "text-primary",
            "pointer-events-none opacity-0 transition-opacity",
            "group-hover:pointer-events-auto group-hover:opacity-100",
            "focus-visible:pointer-events-auto focus-visible:opacity-100",
            agencyFocusRingClass,
          )}
          whileTap={chooserTapScale}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
            onCreateTask();
          }}
        >
          <Plus className="size-3.5" aria-hidden />
        </motion.button>
      ) : null}
    </motion.div>
  );
}
