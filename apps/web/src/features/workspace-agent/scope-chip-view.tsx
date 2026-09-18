import { AnimatePresence, motion } from "motion/react";
import type { AgentScopeRef } from "@orch/agent/types";
import { X } from "lucide-react";

import { Badge } from "@/ui/badge";

type WorkspaceAgentScopeChipViewProps = {
  chips: AgentScopeRef[];
  onRemove: (id: string) => void;
};

function chipPrefix(kind: AgentScopeRef["kind"]) {
  switch (kind) {
    case "node":
      return "Node";
    case "tab":
      return "Tab";
    case "block":
      return "Block";
    case "timeEntry":
      return "Entry";
    case "project":
      return "Project";
    case "member":
      return "Member";
    case "client":
      return "Client";
    case "task":
      return "Task";
    case "taskMessage":
      return "Message";
    case "surface":
      return null;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

const EASE_OUT_QUART: [number, number, number, number] = [0.25, 1, 0.5, 1];

export function WorkspaceAgentScopeChipView({ chips, onRemove }: WorkspaceAgentScopeChipViewProps) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      <AnimatePresence initial={false}>
        {chips.map((chip, index) => {
          const prefix = chipPrefix(chip.kind);
          return (
            <motion.div
              key={`${chip.kind}-${chip.id}`}
              layout
              initial={{ opacity: 0, scale: 0.92, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.12 } }}
              transition={{
                duration: 0.18,
                ease: EASE_OUT_QUART,
                delay: Math.min(index, 6) * 0.03,
              }}
            >
              <Badge variant="secondary" className="gap-1 rounded-full text-secondary-foreground">
                <span>{prefix ? `${prefix} · ${chip.label}` : chip.label}</span>
                <button
                  type="button"
                  className="rounded-full p-0.5 leading-none text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  aria-label={`Remove ${chip.label} from scope`}
                  onClick={() => onRemove(chip.id)}
                >
                  <X className="size-3" aria-hidden />
                </button>
              </Badge>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
