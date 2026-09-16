import { Star } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState, type PointerEvent } from "react";

import { AgencyEntityMark } from "@/features/shared/agency-entity-mark";
import { AgencySearchHighlight } from "@/features/shared/agency-search-highlight";
import {
  agencyFocusRingClass,
  agencyTaskChooserRowActiveClass,
  agencyTaskChooserRowBestMatchClass,
  agencyTaskChooserRowClass,
  agencyTaskChooserRowSelectedClass,
} from "@/features/shared/agency-ui";
import {
  CHOOSER_MS,
  chooserBaseTransition,
  chooserSelectFlashTransition,
  chooserStarPopTransition,
  chooserTapScale,
} from "@/features/time-tracking/agency-task-chooser-motion";
import { cn } from "@/lib/utils";

type AgencyTaskChooserTaskRowProps = {
  taskId: string;
  title: string;
  projectId: string;
  colorHueId?: number | null;
  iconKey?: string | null;
  selected: boolean;
  bestMatch?: boolean;
  active?: boolean;
  optionId?: string;
  favorited: boolean;
  searchTerm: string;
  highlightSearch: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
};

function prefersReducedMotionNow(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function AgencyTaskChooserTaskRow({
  taskId,
  title,
  projectId,
  colorHueId,
  iconKey,
  selected,
  bestMatch = false,
  active = false,
  optionId,
  favorited,
  searchTerm,
  highlightSearch,
  onSelect,
  onToggleFavorite,
}: AgencyTaskChooserTaskRowProps) {
  const [starPopKey, setStarPopKey] = useState(0);
  const [selecting, setSelecting] = useState(false);
  const selectFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (selectFlashTimeoutRef.current) {
        clearTimeout(selectFlashTimeoutRef.current);
      }
    };
  }, []);

  function keepPointerInsideChooser(event: PointerEvent<HTMLButtonElement>) {
    // Keep the search input's blur and Radix's dismiss layer from racing the click.
    event.preventDefault();
    event.stopPropagation();
  }

  function handleSelect() {
    if (prefersReducedMotionNow()) {
      onSelect();
      return;
    }
    if (selectFlashTimeoutRef.current) {
      clearTimeout(selectFlashTimeoutRef.current);
    }
    setSelecting(true);
    selectFlashTimeoutRef.current = setTimeout(() => {
      setSelecting(false);
      onSelect();
      selectFlashTimeoutRef.current = null;
    }, CHOOSER_MS.fast * 1000);
  }

  return (
    <motion.div
      animate={selecting ? { scale: 1.01 } : { scale: 1 }}
      transition={chooserSelectFlashTransition}
      className={cn(
        agencyTaskChooserRowClass,
        "pr-1 pl-5",
        selected && agencyTaskChooserRowSelectedClass,
        !selected && bestMatch && agencyTaskChooserRowBestMatchClass,
        !selected && active && agencyTaskChooserRowActiveClass,
        selecting && "bg-primary/15 hover:bg-primary/15",
      )}
    >
      <motion.button
        type="button"
        id={optionId}
        role="option"
        aria-selected={selected}
        title={title}
        data-selected-task={selected ? "true" : undefined}
        data-best-match-task={!selected && bestMatch ? "true" : undefined}
        data-task-id={taskId}
        className={cn(
          "flex min-w-0 flex-1 items-center rounded-md px-2 py-1.5 text-start",
          agencyFocusRingClass,
        )}
        whileTap={chooserTapScale}
        transition={chooserBaseTransition}
        onPointerDown={keepPointerInsideChooser}
        onClick={(event) => {
          event.stopPropagation();
          handleSelect();
        }}
      >
        <span
          dir="auto"
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1.5 truncate text-sm font-normal leading-snug",
            selected ? "font-medium text-primary" : "text-muted-foreground",
            !selected && bestMatch && "font-medium text-foreground",
          )}
        >
          <AgencyEntityMark
            name={title}
            projectId={projectId}
            iconKey={iconKey}
            colorHueId={colorHueId}
          />
          <span className="min-w-0 truncate">
            {highlightSearch ? <AgencySearchHighlight text={title} query={searchTerm} /> : title}
          </span>
        </span>
      </motion.button>
      <motion.button
        type="button"
        aria-label={favorited ? "Remove task from favorites" : "Add task to favorites"}
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
    </motion.div>
  );
}
