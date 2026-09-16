import { useVirtualizer } from "@tanstack/react-virtual";
import { ArchiveRestore, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef } from "react";

import { AgencySearchHighlight } from "@/features/shared/agency-search-highlight";
import {
  agencyLabelClass,
  getAgencyPageScrollElement,
  useAgencyPageScrollMargin,
} from "@/features/shared/agency-ui";
import { formatDuration } from "@/lib/utils/format-duration";
import { AgencyEntityMark } from "@/features/shared/agency-entity-mark";
import { Button } from "@/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";
import type { AgencyProjectsTableProject } from "./hooks/use-agency-projects-table";

type AgencyProjectsVirtualTableProps = {
  projects: AgencyProjectsTableProject[];
  hoursThisWeekByProject: Map<string, number>;
  budgetsByProject: Map<string, unknown>;
  budgetPctFor: (projectId: string) => number;
  budgetToneFor: (projectId: string) => string;
  searchQuery?: string;
  onSelect: (projectId: string) => void;
  isOwner: boolean;
  isProjectMutationPending: boolean;
  onRequestDelete: (project: AgencyProjectsTableProject) => void;
  onRestore: (project: AgencyProjectsTableProject) => void;
};

const ROW_HEIGHT = 52;

export function AgencyProjectsVirtualTable({
  projects,
  hoursThisWeekByProject,
  budgetsByProject,
  budgetPctFor,
  budgetToneFor,
  searchQuery = "",
  onSelect,
  isOwner,
  isProjectMutationPending,
  onRequestDelete,
  onRestore,
}: AgencyProjectsVirtualTableProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const scrollMargin = useAgencyPageScrollMargin(listRef);

  const virtualizer = useVirtualizer({
    count: projects.length,
    getScrollElement: () => getAgencyPageScrollElement(),
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
    scrollMargin,
  });

  return (
    <TooltipProvider delayDuration={300}>
      <div className="overflow-x-auto rounded-surface border border-default bg-default">
        <div
          className={cn(
            "grid min-w-[52rem] grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_5.5rem_5.5rem] border-b border-default bg-muted text-xs",
            agencyLabelClass,
          )}
        >
          <div className="px-4 py-2.5 font-bold">Project</div>
          <div className="px-3 py-2.5 font-bold">Client</div>
          <div className="px-3 py-2.5 font-bold">Budget</div>
          <div className="px-3 py-2.5 text-right font-bold">Hours · this week</div>
          <div className="px-3 py-2.5 font-bold">Status</div>
          <div className="px-3 py-2.5 text-right font-bold">
            <span className="sr-only">Actions</span>
          </div>
        </div>

        <div
          ref={listRef}
          className="relative min-w-[52rem]"
          style={{ height: `${virtualizer.getTotalSize()}px` }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const project = projects[virtualRow.index];
            if (!project) return null;
            const isTrashed = Boolean(project.deletedAt);
            const hasBudget = Boolean(budgetsByProject.get(project.id));

            return (
              <div
                key={project.id}
                className={cn(
                  "absolute top-0 left-0 grid w-full grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_5.5rem_5.5rem] border-b border-default text-xs transition-colors hover:bg-elevated/40",
                  isTrashed ? "text-muted" : "cursor-pointer",
                )}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start - scrollMargin}px)`,
                }}
                role="row"
                tabIndex={0}
                onClick={() => onSelect(project.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(project.id);
                  }
                }}
              >
                <div className="px-4 py-3" role="cell">
                  <div className="flex min-w-0 items-center gap-2">
                    <AgencyEntityMark
                      name={project.name}
                      projectId={project.id}
                      iconKey={project.iconKey}
                      colorHueId={project.colorHueId}
                    />
                    <span
                      className={cn(
                        "truncate font-bold",
                        isTrashed ? "text-muted line-through" : "text-highlighted",
                      )}
                    >
                      <AgencySearchHighlight text={project.name} query={searchQuery} />
                    </span>
                  </div>
                </div>
                <div className="px-3 py-3 text-muted" role="cell">
                  <span className="truncate">
                    <AgencySearchHighlight text={project.clientName} query={searchQuery} />
                  </span>
                </div>
                <div className="px-3 py-3" role="cell">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-elevated">
                      <div
                        className={cn(
                          "h-full rounded-full transition-[width] duration-200 ease-out motion-reduce:transition-none",
                          hasBudget ? budgetToneFor(project.id) : "bg-muted",
                        )}
                        style={{
                          width: hasBudget ? `${budgetPctFor(project.id)}%` : "0%",
                        }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right text-[11px] text-muted">
                      {hasBudget ? `${budgetPctFor(project.id)}%` : "None"}
                    </span>
                  </div>
                </div>
                <div className="px-3 py-3 text-right" role="cell">
                  <span
                    className={cn(
                      "font-mono font-bold tabular-nums",
                      (hoursThisWeekByProject.get(project.id) ?? 0) > 0
                        ? "text-highlighted"
                        : "text-dimmed",
                    )}
                  >
                    {formatDuration(hoursThisWeekByProject.get(project.id) ?? 0, "short")}
                  </span>
                </div>
                <div className="px-3 py-3" role="cell">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-1 text-[11px] font-bold",
                      isTrashed
                        ? "border border-default bg-default text-muted"
                        : "bg-elevated text-highlighted",
                    )}
                  >
                    {isTrashed ? "In trash" : "Active"}
                  </span>
                </div>
                <div className="flex items-center justify-end px-2 py-2" role="cell">
                  {isOwner ? (
                    isTrashed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            disabled={isProjectMutationPending}
                            aria-label={`Restore ${project.name}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              onRestore(project);
                            }}
                          >
                            <ArchiveRestore className="size-3.5" />
                            <span className="sr-only sm:not-sr-only sm:ml-1">Restore</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Restore from trash</TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-error hover:text-error"
                            disabled={isProjectMutationPending}
                            aria-label={`Move ${project.name} to trash`}
                            onClick={(event) => {
                              event.stopPropagation();
                              onRequestDelete(project);
                            }}
                          >
                            <Trash2 className="size-3.5" />
                            <span className="sr-only">Move to trash</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Move to trash</TooltipContent>
                      </Tooltip>
                    )
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
