import {
  WORKSPACE_SKILLS_HEAT_MAP_DIMENSIONS_LIMIT,
  createWorkspaceId,
  createWorkspaceSkillsHeatMapDimension,
  createWorkspaceSkillsHeatMapMember,
  getSkillsHeatMapMemberAverage,
  getSkillsHeatMapSummary,
  type WorkspaceSkillsHeatMapBlock,
} from "@orch/workspace";
import { Plus, Trash2, UserPlus, X } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { BlockProgressBar } from "@/features/workspace/node/blocks/shared/block-progress-bar";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { cn } from "@/lib/utils";

function getScoreClasses(score: number) {
  if (score <= 3) {
    return "border-destructive/35 bg-destructive/10 text-destructive";
  }

  if (score <= 5) {
    return "border-warning/35 bg-warning/10 text-warning";
  }

  if (score <= 7) {
    return "border-warning/20 bg-warning/5 text-foreground";
  }

  return "border-success/35 bg-success/10 text-success";
}

export function WorkspaceSkillsHeatMapBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceSkillsHeatMapBlock>) {
  const { mutateTypedBlock } = useWorkspaceNodeEditorContext();

  const summary = useMemo(() => getSkillsHeatMapSummary(block), [block]);
  const dimensionIds = useMemo(
    () => block.dimensions.map((dimension) => dimension.id),
    [block.dimensions],
  );
  const canAddDimension = block.dimensions.length < WORKSPACE_SKILLS_HEAT_MAP_DIMENSIONS_LIMIT;

  const strongestDimensionLabel = useMemo(() => {
    if (!summary.strongestDimension) {
      return "Unclear";
    }

    return (
      block.dimensions.find((dimension) => dimension.id === summary.strongestDimension)?.label ??
      "Skill"
    );
  }, [block.dimensions, summary.strongestDimension]);

  const strongestDimensionAverage = useMemo(() => {
    if (!summary.strongestDimension) {
      return null;
    }

    return summary.averageByDimension[summary.strongestDimension] ?? 0;
  }, [summary.averageByDimension, summary.strongestDimension]);

  function mutateHeatMap(mutator: (entry: WorkspaceSkillsHeatMapBlock) => void) {
    mutateTypedBlock(tabId, block.id, "skills-heat-map", mutator);
  }

  function initializeDimensions() {
    mutateHeatMap((entry) => {
      entry.dimensions = [
        { id: "writing", label: "Writing" },
        { id: "strategy", label: "Strategy" },
        { id: "design", label: "Design" },
        { id: "analytics", label: "Analytics" },
        { id: "leadership", label: "Leadership" },
      ];

      for (const member of entry.members) {
        const nextScores: Record<string, number> = {};

        for (const dimension of entry.dimensions) {
          nextScores[dimension.id] = member.scores[dimension.id] ?? 5;
        }

        member.scores = nextScores;
      }
    });
  }

  function addDimension() {
    mutateHeatMap((entry) => {
      const dimension = createWorkspaceSkillsHeatMapDimension({
        id: createWorkspaceId("dimension"),
        label: "New Skill",
      });

      entry.dimensions.push(dimension);
    });
  }

  function removeDimension(dimensionId: string) {
    mutateHeatMap((entry) => {
      if (entry.dimensions.length <= 1) {
        return;
      }

      entry.dimensions = entry.dimensions.filter((dimension) => dimension.id !== dimensionId);

      for (const member of entry.members) {
        delete member.scores[dimensionId];
      }
    });
  }

  function updateDimensionLabel(dimensionId: string, value: string) {
    mutateHeatMap((entry) => {
      const target = entry.dimensions.find((dimension) => dimension.id === dimensionId);

      if (!target) {
        return;
      }

      target.label = value.slice(0, 80);
    });
  }

  function cycleScore(memberId: string, dimensionId: string) {
    mutateHeatMap((entry) => {
      const member = entry.members.find((candidate) => candidate.id === memberId);

      if (!member) {
        return;
      }

      const current = member.scores[dimensionId] ?? 5;
      member.scores[dimensionId] = current >= 10 ? 1 : current + 1;
    });
  }

  function addMember() {
    mutateHeatMap((entry) => {
      entry.members.push(createWorkspaceSkillsHeatMapMember(entry.dimensions));
    });
  }

  function removeMember(memberId: string) {
    mutateHeatMap((entry) => {
      entry.members = entry.members.filter((member) => member.id !== memberId);
    });
  }

  function updateMemberName(memberId: string, value: string) {
    mutateHeatMap((entry) => {
      const target = entry.members.find((member) => member.id === memberId);

      if (!target) {
        return;
      }

      target.name = value.slice(0, 120);
    });
  }

  function updateMemberRole(memberId: string, value: string) {
    mutateHeatMap((entry) => {
      const target = entry.members.find((member) => member.id === memberId);

      if (!target) {
        return;
      }

      target.role = value.slice(0, 120);
    });
  }

  function getMemberAverage(member: WorkspaceSkillsHeatMapBlock["members"][number]) {
    return getSkillsHeatMapMemberAverage(member.scores, dimensionIds);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          {summary.memberCount} team · {summary.overallAverage}/10 avg ·{" "}
          <span className="text-destructive">{summary.criticalGapCount}</span> critical gaps ·
          Strongest {strongestDimensionLabel}
          {strongestDimensionAverage === null ? "" : ` (${strongestDimensionAverage}/10)`}
        </p>
        <BlockProgressBar
          className="min-w-24 max-w-48 flex-1"
          value={summary.overallAverage}
          max={10}
        />
      </div>

      <div className="rounded-surface border border-muted bg-card p-surface">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Skills matrix</p>
            <p className="mt-1 text-sm text-toned">
              Score each team member from 1 to 10 for every skill. Higher scores indicate stronger
              capability.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {canAddDimension ? (
              <Button
                type="button"
                variant="secondary"
                className="rounded-full px-4"
                aria-label="Add skill dimension"
                onClick={addDimension}
              >
                <Plus />
                Add Skill
              </Button>
            ) : null}

            <Button
              type="button"
              variant="secondary"
              className="rounded-full px-4"
              aria-label="Add team member"
              onClick={addMember}
            >
              <UserPlus />
              Add Team Member
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <div className="rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-destructive">
            1-3 Critical gap
          </div>
          <div className="rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-warning">
            4-5 Needs support
          </div>
          <div className="rounded-full border border-warning/20 bg-warning/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground">
            6-7 Reliable
          </div>
          <div className="rounded-full border border-success/30 bg-success/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-success">
            8-10 Strength
          </div>
        </div>
      </div>

      {block.dimensions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-muted bg-background py-12 text-center">
          <p className="text-sm font-semibold text-muted-foreground">
            No skill dimensions added yet.
          </p>
          <p className="mt-2 text-sm text-toned">
            Start with a default set or add custom skills for your team.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-4 rounded-full px-4"
            aria-label="Initialize default skill dimensions"
            onClick={initializeDimensions}
          >
            <Plus />
            Initialize Default Dimensions
          </Button>
        </div>
      ) : block.members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-muted bg-background py-12 text-center">
          <p className="text-sm font-semibold text-muted-foreground">No team members added yet.</p>
          <p className="mt-2 text-sm text-toned">
            Add a team member to start scoring strengths and gaps.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-4 rounded-full px-4"
            aria-label="Add first team member"
            onClick={addMember}
          >
            <UserPlus />
            Add Team Member
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <table className="min-w-[880px] w-full border-separate border-spacing-y-3">
            <thead>
              <tr>
                <th className="px-3 pb-1 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                  Team Member
                </th>
                {block.dimensions.map((dimension) => (
                  <th key={dimension.id} className="px-3 pb-1 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <Input
                        value={dimension.label}
                        placeholder="Skill"
                        className="w-24 border-0 bg-transparent px-0 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-toned shadow-none placeholder:text-muted focus-visible:ring-0"
                        aria-label={`Skill name for ${dimension.label || "new skill"}`}
                        onChange={(event) => updateDimensionLabel(dimension.id, event.target.value)}
                      />
                      {block.dimensions.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="-mt-1 h-4 w-4 rounded-full p-0 hover:text-destructive"
                          aria-label={`Remove ${dimension.label || "skill"} skill`}
                          onClick={() => removeDimension(dimension.id)}
                        >
                          <X className="size-3" />
                        </Button>
                      ) : null}
                    </div>
                  </th>
                ))}
                <th className="px-3 pb-1 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                  Average
                </th>
                <th className="px-3 pb-1 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {block.members.map((member) => {
                const memberLabel = member.name.trim() || "Team member";
                const memberAverage = getMemberAverage(member);

                return (
                  <tr key={member.id} className="rounded-2xl border border-muted bg-background">
                    <td className="rounded-l-2xl border-y border-l border-muted bg-background px-4 py-4 align-top">
                      <Input
                        value={member.name}
                        placeholder="Name"
                        className="border-0 bg-transparent px-0 text-sm font-semibold text-foreground shadow-none placeholder:text-muted focus-visible:ring-0"
                        onChange={(event) => updateMemberName(member.id, event.target.value)}
                      />
                      <Input
                        value={member.role}
                        placeholder="Role"
                        className="mt-1 border-0 bg-transparent px-0 text-xs font-medium text-toned shadow-none placeholder:text-muted focus-visible:ring-0"
                        onChange={(event) => updateMemberRole(member.id, event.target.value)}
                      />
                    </td>

                    {block.dimensions.map((dimension) => {
                      const score = member.scores[dimension.id] ?? 5;

                      return (
                        <td
                          key={`${member.id}-${dimension.id}`}
                          className="border-y border-muted bg-background px-3 py-4 text-center"
                        >
                          <button
                            type="button"
                            className={cn(
                              "w-full rounded-xl border px-3 py-4 text-lg font-semibold tracking-tight",
                              getScoreClasses(score),
                            )}
                            aria-label={`${dimension.label} score for ${memberLabel}`}
                            onClick={() => cycleScore(member.id, dimension.id)}
                          >
                            {score}
                          </button>
                        </td>
                      );
                    })}

                    <td className="border-y border-muted bg-background px-3 py-4 text-center">
                      <div
                        className={cn(
                          "rounded-xl border px-3 py-4 text-lg font-semibold tracking-tight",
                          getScoreClasses(memberAverage),
                        )}
                      >
                        {memberAverage}
                      </div>
                    </td>

                    <td className="rounded-r-2xl border-y border-r border-muted bg-background px-3 py-4 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        className="rounded-xl hover:text-destructive"
                        aria-label={`Remove ${memberLabel}`}
                        onClick={() => removeMember(member.id)}
                      >
                        <Trash2 />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot>
              <tr>
                <td className="px-3 pt-2 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                  Team Average
                </td>
                {block.dimensions.map((dimension) => {
                  const average = summary.averageByDimension[dimension.id] ?? 0;

                  return (
                    <td key={`avg-${dimension.id}`} className="px-3 pt-2 text-center">
                      <div
                        className={cn(
                          "rounded-2xl border px-3 py-3 text-sm font-bold",
                          getScoreClasses(average),
                        )}
                      >
                        {average}
                      </div>
                    </td>
                  );
                })}
                <td className="px-3 pt-2 text-center">
                  <div
                    className={cn(
                      "rounded-2xl border px-3 py-3 text-sm font-bold",
                      getScoreClasses(summary.overallAverage),
                    )}
                  >
                    {summary.overallAverage}
                  </div>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
