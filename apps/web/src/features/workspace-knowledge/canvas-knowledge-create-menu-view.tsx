import {
  FileText,
  Folder,
  Layers3,
  Pin,
  Plus,
  Scale,
  StickyNote,
  Upload,
  User,
} from "lucide-react";
import { createPortal } from "react-dom";
import type { RefObject } from "react";

import {
  knowledgeCreateIconClass,
  knowledgeCreateKinds,
  knowledgeCreateLabel,
  type KnowledgeCreateKind,
} from "@/features/workspace-knowledge/knowledge-create";
import { cn } from "@/lib/utils";

export type MenuMotionState = "hidden" | "opening" | "open" | "closing";

export type CanvasKnowledgeCreateMenuViewProps = {
  open: boolean;
  x: number;
  y: number;
  unplacedCount: number;
  motionState: MenuMotionState;
  menuRef: RefObject<HTMLDivElement | null>;
  activeKind: KnowledgeCreateKind | null;
  onActiveKindChange: (kind: KnowledgeCreateKind | null) => void;
  onClose: () => void;
  onSelect: (kind: KnowledgeCreateKind) => void;
  onOpenUnplaced: () => void;
};

const RADIAL_RADIUS = 70;

function kindIcon(kind: KnowledgeCreateKind) {
  switch (kind) {
    case "note":
      return StickyNote;
    case "decision":
      return Scale;
    case "folder":
      return Folder;
    case "person":
      return User;
    case "source":
      return Upload;
    case "pin":
      return Pin;
    case "document":
      return FileText;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function radialPosition(index: number) {
  const angle = (index / knowledgeCreateKinds.length) * Math.PI * 2 - Math.PI / 2;
  return {
    x: Math.round(Math.cos(angle) * RADIAL_RADIUS),
    y: Math.round(Math.sin(angle) * RADIAL_RADIUS),
  };
}

export function CanvasKnowledgeCreateMenuView({
  x,
  y,
  unplacedCount,
  motionState,
  menuRef,
  activeKind,
  onActiveKindChange,
  onClose,
  onSelect,
  onOpenUnplaced,
}: CanvasKnowledgeCreateMenuViewProps) {
  if (motionState === "hidden" || typeof document === "undefined") return null;

  const expanded = motionState === "open";
  const closing = motionState === "closing";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvasRect = document
    .querySelector<HTMLElement>("[aria-label='Workspace canvas']")
    ?.getBoundingClientRect();
  const centerX = Math.max(116, Math.min(x, (canvasRect?.right ?? window.innerWidth) - 116));
  const centerY = Math.max(
    116,
    Math.min(y, (canvasRect?.bottom ?? window.innerHeight) - (unplacedCount > 0 ? 156 : 116)),
  );

  return createPortal(
    <div
      className={cn("fixed inset-0 z-40", closing && "pointer-events-none")}
      onClick={onClose}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div
        role="menu"
        ref={menuRef}
        aria-label="Add to canvas"
        className="absolute z-50 size-52"
        style={{
          left: centerX,
          top: centerY,
          opacity: motionState === "opening" ? 0 : 1,
          transform: `translate(-50%, -50%) scale(${motionState === "opening" ? 0.96 : 1})`,
          transition: reducedMotion
            ? "none"
            : "opacity 140ms ease-out, transform 180ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            onClose();
            return;
          }
          if (
            !["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)
          )
            return;
          const items = Array.from(
            event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=menuitem]"),
          );
          const index = items.findIndex((item) => item === document.activeElement);
          const next =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? items.length - 1
                : (index + (["ArrowUp", "ArrowLeft"].includes(event.key) ? -1 : 1) + items.length) %
                  items.length;
          event.preventDefault();
          items[next]?.focus();
        }}
      >
        <div
          className="absolute left-1/2 top-1/2 flex size-14 items-center justify-center rounded-full bg-popover text-center shadow-lg ring-1 ring-foreground/10 dark:ring-foreground/15"
          style={{
            opacity: expanded ? 1 : 0,
            transform: `translate(-50%, -50%) scale(${expanded ? 1 : 0.8})`,
            transitionProperty: "opacity, transform",
            transitionDuration: reducedMotion ? "0ms" : "160ms",
            transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {activeKind ? (
            <span className="max-w-12 text-[10px] leading-3 font-semibold text-foreground">
              {knowledgeCreateLabel(activeKind)}
            </span>
          ) : (
            <Plus className="size-4 text-muted-foreground" aria-hidden />
          )}
        </div>

        {knowledgeCreateKinds.map((kind, index) => {
          const Icon = kindIcon(kind);
          const position = radialPosition(index);
          const delay = reducedMotion
            ? 0
            : closing
              ? (knowledgeCreateKinds.length - index - 1) * 14
              : index * 18;

          return (
            <button
              key={kind}
              type="button"
              role="menuitem"
              aria-label={`Add ${knowledgeCreateLabel(kind)}`}
              className={cn(
                knowledgeCreateIconClass(kind),
                "absolute left-1/2 top-1/2 flex size-10 items-center justify-center rounded-full bg-popover shadow-md ring-1 ring-foreground/10 outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/30 motion-reduce:transition-none",
                activeKind === kind && "bg-accent text-accent-foreground ring-ring/30",
              )}
              style={{
                opacity: expanded ? 1 : 0,
                transform: expanded
                  ? "translate(-50%, -50%) scale(1)"
                  : `translate(calc(-50% - ${position.x}px), calc(-50% - ${position.y}px)) scale(0.72)`,
                left: `calc(50% + ${position.x}px)`,
                top: `calc(50% + ${position.y}px)`,
                transitionDelay: `${delay}ms`,
                transitionDuration: reducedMotion ? "0ms" : closing ? "120ms" : "180ms",
                transitionProperty: "opacity, transform, background-color, color",
                transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onBlur={() => onActiveKindChange(null)}
              onFocus={() => onActiveKindChange(kind)}
              onMouseEnter={() => onActiveKindChange(kind)}
              onMouseLeave={() => onActiveKindChange(null)}
              onClick={() => onSelect(kind)}
              title={knowledgeCreateLabel(kind)}
            >
              <Icon className="size-4" aria-hidden />
            </button>
          );
        })}

        {unplacedCount > 0 ? (
          <button
            type="button"
            role="menuitem"
            className="absolute left-1/2 top-full mt-2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-popover px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm ring-1 ring-foreground/10 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
            style={{
              opacity: expanded ? 1 : 0,
              transition: reducedMotion ? "none" : "opacity 120ms ease-out 80ms",
            }}
            onClick={onOpenUnplaced}
          >
            <Layers3 className="size-3.5" aria-hidden />
            Waiting cards <span className="text-foreground">{unplacedCount}</span>
          </button>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
