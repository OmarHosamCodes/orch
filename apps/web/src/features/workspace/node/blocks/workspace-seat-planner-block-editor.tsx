import {
  createWorkspaceSeatPlannerSeat,
  getSeatPlannerSummary,
  isSeatUncovered,
  matchesSeatPlannerFilter,
  workspaceSeatPlannerFilterLabels,
  type WorkspaceSeatHealth,
  type WorkspaceSeatLoadLevel,
  type WorkspaceSeatPlannerBlock,
} from "@orch/workspace";
import { Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { BlockSelect } from "@/features/workspace/node/blocks/shared/block-select";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { cn } from "@/lib/utils";

const healthOptions: Array<{ label: string; value: WorkspaceSeatHealth }> = [
  { label: "Strong", value: "strong" },
  { label: "Fragile", value: "fragile" },
  { label: "Gap", value: "gap" },
];

const loadOptions: Array<{ label: string; value: WorkspaceSeatLoadLevel }> = [
  { label: "Underloaded", value: "underloaded" },
  { label: "Balanced", value: "balanced" },
  { label: "Overloaded", value: "overloaded" },
];

const filterOptions: Array<{ label: string; value: WorkspaceSeatPlannerBlock["filter"] }> = [
  { label: "All", value: "all" },
  { label: "Fragile", value: "fragile" },
  { label: "Overloaded", value: "overloaded" },
  { label: "Uncovered", value: "uncovered" },
];

function getSeatClasses(seat: WorkspaceSeatPlannerBlock["seats"][number]) {
  if (seat.health === "gap" || isSeatUncovered(seat)) {
    return "border-destructive/30 bg-destructive/5";
  }

  if (seat.health === "fragile" || seat.load === "overloaded") {
    return "border-warning/30 bg-warning/5";
  }

  return "border-muted bg-background";
}

export function WorkspaceSeatPlannerBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceSeatPlannerBlock>) {
  const { mutateBlock } = useWorkspaceNodeEditorContext();

  const summary = useMemo(() => getSeatPlannerSummary(block), [block]);

  const visibleSeats = useMemo(
    () => block.seats.filter((seat) => matchesSeatPlannerFilter(seat, block.filter)),
    [block.filter, block.seats],
  );

  function addSeat() {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "seat-planner") {
        return;
      }

      entry.seats.push(createWorkspaceSeatPlannerSeat());
    });
  }

  function removeSeat(seatId: string) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "seat-planner") {
        return;
      }

      entry.seats = entry.seats.filter((seat) => seat.id !== seatId);
    });
  }

  function mutateSeat(
    seatId: string,
    mutator: (seat: WorkspaceSeatPlannerBlock["seats"][number]) => void,
  ) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "seat-planner") {
        return;
      }

      const target = entry.seats.find((candidate) => candidate.id === seatId);

      if (!target) {
        return;
      }

      mutator(target);
    });
  }

  function getFilterCount(filter: WorkspaceSeatPlannerBlock["filter"]) {
    if (filter === "all") {
      return block.seats.length;
    }

    return block.seats.filter((seat) => matchesSeatPlannerFilter(seat, filter)).length;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          {summary.filledSeats} filled ·{" "}
          <span className="text-warning">{summary.fragileSeats}</span> fragile ·{" "}
          <span className="text-destructive">{summary.uncoveredSeats}</span> uncovered ·{" "}
          {summary.overloadedSeats} overloaded
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="ml-auto rounded-full"
          onClick={addSeat}
        >
          <Plus />
          Add Seat
        </Button>
      </div>

      <div className="px-1">
        <p className="text-xs text-toned">
          Clarify critical functions, fragile seats, and coverage gaps.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filterOptions.map((filter) => (
          <Button
            key={filter.value}
            type="button"
            variant={block.filter === filter.value ? "secondary" : "ghost"}
            size="sm"
            className="rounded-full px-3"
            onClick={() =>
              mutateBlock(tabId, block.id, (entry) => {
                if (entry.type !== "seat-planner") {
                  return;
                }
                entry.filter = filter.value;
              })
            }
          >
            {workspaceSeatPlannerFilterLabels[filter.value]} · {getFilterCount(filter.value)}
          </Button>
        ))}
      </div>

      {visibleSeats.length === 0 ? (
        <div className="rounded-xl border border-dashed border-muted bg-background py-10 text-center">
          {block.seats.length === 0 ? (
            <>
              <p className="text-sm font-semibold text-muted-foreground">No seats yet.</p>
              <p className="mt-1 text-sm text-toned">Add a seat to map ownership and coverage.</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-4 rounded-full"
                onClick={addSeat}
              >
                <Plus />
                Add seat
              </Button>
            </>
          ) : (
            <p className="text-sm font-semibold text-muted-foreground">
              No seats match this filter.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <table className="min-w-[1100px] w-full border-separate border-spacing-y-2">
            <thead>
              <tr>
                <th className="px-3 pb-2 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                  Seat
                </th>
                <th className="px-3 pb-2 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                  Owner
                </th>
                <th className="px-3 pb-2 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                  Function
                </th>
                <th className="px-3 pb-2 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                  Health
                </th>
                <th className="px-3 pb-2 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                  Load
                </th>
                <th className="px-3 pb-2 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                  Backup
                </th>
                <th className="px-3 pb-2 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleSeats.map((seat) => (
                <tr key={seat.id}>
                  <td
                    className={cn(
                      "rounded-l-xl border-y border-l px-3 py-3 align-top",
                      getSeatClasses(seat),
                    )}
                  >
                    <Input
                      value={seat.name}
                      placeholder="Seat name"
                      className="border-0 bg-transparent px-0 text-sm font-bold text-foreground shadow-none placeholder:text-muted focus-visible:ring-0"
                      onChange={(event) =>
                        mutateSeat(seat.id, (target) => {
                          target.name = event.target.value.slice(0, 120);
                        })
                      }
                    />
                  </td>

                  <td className={cn("border-y px-3 py-3 align-top", getSeatClasses(seat))}>
                    <Input
                      value={seat.owner}
                      placeholder="Owner"
                      className="rounded-xl"
                      onChange={(event) =>
                        mutateSeat(seat.id, (target) => {
                          target.owner = event.target.value.slice(0, 120);
                        })
                      }
                    />
                  </td>

                  <td className={cn("border-y px-3 py-3 align-top", getSeatClasses(seat))}>
                    <Input
                      value={seat.function}
                      placeholder="Function"
                      className="rounded-xl"
                      onChange={(event) =>
                        mutateSeat(seat.id, (target) => {
                          target.function = event.target.value.slice(0, 120);
                        })
                      }
                    />
                  </td>

                  <td className={cn("border-y px-3 py-3 align-top", getSeatClasses(seat))}>
                    <BlockSelect
                      value={seat.health}
                      options={healthOptions}
                      className="rounded-xl"
                      aria-label="Seat health"
                      onValueChange={(value) =>
                        mutateSeat(seat.id, (target) => {
                          target.health = value as WorkspaceSeatHealth;
                        })
                      }
                    />
                  </td>

                  <td className={cn("border-y px-3 py-3 align-top", getSeatClasses(seat))}>
                    <BlockSelect
                      value={seat.load}
                      options={loadOptions}
                      className="rounded-xl"
                      aria-label="Seat load"
                      onValueChange={(value) =>
                        mutateSeat(seat.id, (target) => {
                          target.load = value as WorkspaceSeatLoadLevel;
                        })
                      }
                    />
                  </td>

                  <td className={cn("border-y px-3 py-3 align-top", getSeatClasses(seat))}>
                    <Input
                      value={seat.backupOwner}
                      placeholder="Backup"
                      className="rounded-xl"
                      onChange={(event) =>
                        mutateSeat(seat.id, (target) => {
                          target.backupOwner = event.target.value.slice(0, 120);
                        })
                      }
                    />
                  </td>

                  <td
                    className={cn(
                      "rounded-r-xl border-y border-r px-3 py-3 text-right align-top",
                      getSeatClasses(seat),
                    )}
                  >
                    <div className="flex items-center justify-end gap-2">
                      {isSeatUncovered(seat) ? (
                        <Badge variant="destructive" className="rounded-full px-2.5 py-0.5">
                          Uncovered
                        </Badge>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-lg hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Remove seat"
                        onClick={() => removeSeat(seat.id)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-toned">
        Uncovered when owner missing, backup missing, or marked as gap.
      </p>
    </div>
  );
}
