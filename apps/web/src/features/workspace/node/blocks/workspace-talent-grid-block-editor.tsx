import {
  createWorkspaceTalentGridMember,
  getTalentGridBoxKey,
  getTalentGridSummary,
  workspaceTalentGridBoxLabels,
  type WorkspaceTalentGridBlock,
  type WorkspaceTalentGridBoxKey,
} from "@orch/workspace";
import { Trash2, UserPlus } from "lucide-react";
import { Fragment, useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { cn } from "@/lib/utils";

const gridRows: Array<{
  label: string;
  cells: WorkspaceTalentGridBoxKey[];
}> = [
  {
    label: "High Growth Potential",
    cells: ["enigma", "growth-star", "superstar"],
  },
  {
    label: "Moderate Growth Potential",
    cells: ["under-performer", "core-player", "high-performer"],
  },
  {
    label: "Specialized Potential",
    cells: ["risk", "average-joe", "specialist"],
  },
];

const performanceColumns = ["Building Foundation", "Solid Performance", "Excelling"];

function clampGridScore(value: string) {
  const numeric = Number(value || 3);
  return Math.min(5, Math.max(1, Math.round(numeric)));
}

function getCellClasses(key: WorkspaceTalentGridBoxKey) {
  switch (key) {
    case "superstar":
    case "growth-star":
      return "border-success/35 bg-success/10";
    case "high-performer":
    case "specialist":
      return "border-primary/35 bg-primary/5";
    case "core-player":
    case "average-joe":
      return "border-muted/35 bg-background";
    case "risk":
    case "under-performer":
      return "border-destructive/35 bg-destructive/10";
    default:
      return "border-warning/35 bg-warning/10";
  }
}

function getCellTone(
  key: WorkspaceTalentGridBoxKey,
): "success" | "default" | "secondary" | "warning" | "destructive" {
  switch (key) {
    case "superstar":
    case "growth-star":
      return "success";
    case "high-performer":
    case "specialist":
      return "default";
    case "core-player":
    case "average-joe":
      return "secondary";
    case "risk":
    case "under-performer":
      return "destructive";
    default:
      return "warning";
  }
}

function getBoxDescription(key: WorkspaceTalentGridBoxKey): string {
  const descriptions: Record<WorkspaceTalentGridBoxKey, string> = {
    superstar: "Exceeds expectations with high growth potential",
    "growth-star": "Strong performer ready for advancement",
    "high-performer": "Consistent excellence in current role",
    enigma: "High potential seeking clearer direction",
    "core-player": "Reliable contributor to team success",
    "average-joe": "Steady performer in established domain",
    "under-performer": "Support needed to reach full potential",
    specialist: "Deep expertise in focused area",
    risk: "Opportunity for role alignment discussion",
  };
  return descriptions[key] || "";
}

export function WorkspaceTalentGridBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceTalentGridBlock>) {
  const { mutateBlock } = useWorkspaceNodeEditorContext();

  const summary = useMemo(() => getTalentGridSummary(block), [block]);

  const membersByBox = useMemo(() => {
    const grouped = new Map<WorkspaceTalentGridBoxKey, WorkspaceTalentGridBlock["members"]>();

    for (const row of gridRows) {
      for (const cell of row.cells) {
        grouped.set(cell, []);
      }
    }

    for (const member of block.members) {
      const key = getTalentGridBoxKey(member.performance, member.potential);
      const current = grouped.get(key);

      if (current) {
        current.push(member);
      } else {
        grouped.set(key, [member]);
      }
    }

    return grouped;
  }, [block.members]);

  function addMember() {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "talent-grid") {
        return;
      }

      entry.members.push(createWorkspaceTalentGridMember());
    });
  }

  function removeMember(memberId: string) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "talent-grid") {
        return;
      }

      entry.members = entry.members.filter((member) => member.id !== memberId);
    });
  }

  function updateMemberName(memberId: string, value: string) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "talent-grid") {
        return;
      }
      const target = entry.members.find((candidate) => candidate.id === memberId);
      if (!target) {
        return;
      }
      target.name = value.slice(0, 120);
    });
  }

  function updateMemberRole(memberId: string, value: string) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "talent-grid") {
        return;
      }
      const target = entry.members.find((candidate) => candidate.id === memberId);
      if (!target) {
        return;
      }
      target.role = value.slice(0, 120);
    });
  }

  function updateMemberPerformance(memberId: string, value: string) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "talent-grid") {
        return;
      }
      const target = entry.members.find((candidate) => candidate.id === memberId);
      if (!target) {
        return;
      }
      target.performance = clampGridScore(value);
    });
  }

  function updateMemberPotential(memberId: string, value: string) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "talent-grid") {
        return;
      }
      const target = entry.members.find((candidate) => candidate.id === memberId);
      if (!target) {
        return;
      }
      target.potential = clampGridScore(value);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          {summary.memberCount} team · {summary.superstarCount + summary.growthStarCount} growth
          ready · {summary.corePlayerCount} core contributors ·{" "}
          <span className="text-warning">
            {summary.riskCount + summary.boxCounts["under-performer"]}
          </span>{" "}
          development focus
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="ml-auto rounded-full"
          onClick={addMember}
        >
          <UserPlus />
          Add Member
        </Button>
      </div>

      <div className="px-1">
        <p className="text-xs text-toned">
          Assess performance (1-5) and growth potential to support team development.
        </p>
      </div>

      <div className="overflow-x-auto pb-2">
        <div
          className="grid min-w-[740px] gap-2.5"
          style={{ gridTemplateColumns: "7rem repeat(3, minmax(0, 1fr))" }}
        >
          <div />

          {performanceColumns.map((column) => (
            <div
              key={column}
              className="rounded-xl border border-muted bg-muted px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-toned"
            >
              {column}
            </div>
          ))}

          {gridRows.map((row) => (
            <Fragment key={row.label}>
              <div className="flex items-center rounded-xl border border-muted bg-background px-2.5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                {row.label}
              </div>

              {row.cells.map((cell) => (
                <div
                  key={cell}
                  className={cn("min-h-[140px] rounded-xl border p-3.5", getCellClasses(cell))}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                        {workspaceTalentGridBoxLabels[cell]}
                      </p>
                      <p className="mt-1 text-[10px] leading-tight text-toned">
                        {membersByBox.get(cell)?.length ?? 0} member
                        {(membersByBox.get(cell)?.length ?? 0) !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {membersByBox.get(cell)?.map((member) => (
                      <div
                        key={member.id}
                        className="rounded-full border border-muted bg-background px-2.5 py-0.5 text-[11px] font-semibold text-foreground"
                      >
                        {member.name || "Unnamed"}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>

      {block.members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-muted bg-background py-10 text-center">
          <p className="text-sm font-semibold text-muted-foreground">No team members yet.</p>
          <p className="mt-1 text-sm text-toned">Add members to assess and develop your team.</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-4 rounded-full"
            onClick={addMember}
          >
            <UserPlus />
            Add
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {block.members.map((member) => {
            const boxKey = getTalentGridBoxKey(member.performance, member.potential);
            const boxDescription = getBoxDescription(boxKey);

            return (
              <article
                key={member.id}
                className="rounded-surface border border-muted bg-background p-surface"
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Input
                      value={member.name}
                      placeholder="Name"
                      className="w-full border-0 bg-transparent px-0 text-base font-bold text-foreground placeholder:text-muted shadow-none focus-visible:ring-0"
                      onChange={(event) => updateMemberName(member.id, event.target.value)}
                    />
                    <Input
                      value={member.role}
                      placeholder="Role"
                      className="mt-0.5 border-0 bg-transparent px-0 text-xs text-toned placeholder:text-muted shadow-none focus-visible:ring-0"
                      onChange={(event) => updateMemberRole(member.id, event.target.value)}
                    />
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={getCellTone(boxKey)} className="rounded-full">
                      {workspaceTalentGridBoxLabels[boxKey]}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-lg hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remove member"
                      onClick={() => removeMember(member.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label
                        className="text-[10px] font-bold uppercase tracking-[0.2em] text-toned"
                        htmlFor={`performance-${member.id}`}
                      >
                        Performance
                      </label>
                      <span className="text-xs font-semibold text-primary">
                        {member.performance}/5
                      </span>
                    </div>
                    <input
                      id={`performance-${member.id}`}
                      value={member.performance}
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
                      onChange={(event) => updateMemberPerformance(member.id, event.target.value)}
                    />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label
                        className="text-[10px] font-bold uppercase tracking-[0.2em] text-toned"
                        htmlFor={`potential-${member.id}`}
                      >
                        Growth Potential
                      </label>
                      <span className="text-xs font-semibold text-primary">
                        {member.potential}/5
                      </span>
                    </div>
                    <input
                      id={`potential-${member.id}`}
                      value={member.potential}
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
                      onChange={(event) => updateMemberPotential(member.id, event.target.value)}
                    />
                  </div>
                </div>

                {boxDescription ? (
                  <p className="mt-3 text-xs leading-snug text-toned">{boxDescription}</p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
