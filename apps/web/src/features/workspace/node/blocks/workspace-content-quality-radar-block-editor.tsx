import {
  WORKSPACE_CONTENT_QUALITY_DIMENSIONS,
  getContentQualityRadarSummary,
  workspaceContentQualityDimensionLabels,
  type WorkspaceContentQualityDimension,
  type WorkspaceContentQualityRadarBlock,
} from "@orch/workspace";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { BlockProgressBar } from "@/features/workspace/node/blocks/shared/block-progress-bar";
import { BlockSlider } from "@/features/workspace/node/blocks/shared/block-slider";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Input } from "@/ui/input";
import { cn } from "@/lib/utils";

const chartSize = 280;
const center = chartSize / 2;
const radius = 104;
const labelRadius = 126;

const shortLabels: Record<WorkspaceContentQualityDimension, string> = {
  hook: "Hook",
  value: "Value",
  emotion: "Emotion",
  cta: "CTA",
  platformFit: "Fit",
  brand: "Brand",
  shareability: "Share",
  scrollStop: "Stop",
  authenticity: "Real",
  storytelling: "Story",
};

const dimensionPlaybook: Record<WorkspaceContentQualityDimension, string> = {
  hook: "Lead with a clear outcome in the first line to stop the scroll.",
  value: "State the concrete takeaway in plain language within the first 15 seconds.",
  emotion: "Anchor the message to one emotion that matches the audience moment.",
  cta: "End with one direct next step and remove optional or conflicting asks.",
  platformFit: "Match format, cadence, and length to the channel where this will publish.",
  brand: "Reinforce the same voice and positioning used across your core messaging.",
  shareability: "Package the insight so someone can quote or forward it immediately.",
  scrollStop: "Use a stronger opening visual and bolder first sentence framing.",
  authenticity: "Replace generic claims with specific stories, proof, or concrete detail.",
  storytelling: "Move through setup, tension, and payoff in a tighter sequence.",
};

function clampScore(value: string | number | undefined) {
  const numeric = Number(value || 5);
  return Math.min(10, Math.max(1, Math.round(numeric)));
}

function getAverageToneClasses(averageScore: number) {
  if (averageScore >= 7) {
    return "text-success";
  }

  if (averageScore >= 5) {
    return "text-warning";
  }

  return "text-destructive";
}

function getScoreToneClasses(score: number) {
  if (score >= 8) {
    return "text-success";
  }

  if (score >= 6) {
    return "text-primary";
  }

  if (score >= 4) {
    return "text-warning";
  }

  return "text-destructive";
}

function getLabelAnchor(x: number) {
  if (x < center - 12) {
    return "end";
  }

  if (x > center + 12) {
    return "start";
  }

  return "middle";
}

function getQualityBand(averageScore: number) {
  if (averageScore >= 8) {
    return "Execution-ready";
  }

  if (averageScore >= 6.5) {
    return "Solid baseline";
  }

  if (averageScore >= 5) {
    return "Needs tightening";
  }

  return "High risk";
}

export function WorkspaceContentQualityRadarBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceContentQualityRadarBlock>) {
  const { mutateTypedBlock } = useWorkspaceNodeEditorContext();

  const summary = useMemo(() => getContentQualityRadarSummary(block), [block]);
  const qualityBand = useMemo(() => getQualityBand(summary.averageScore), [summary.averageScore]);
  const averageToneClasses = getAverageToneClasses(summary.averageScore);

  const axes = useMemo(
    () =>
      WORKSPACE_CONTENT_QUALITY_DIMENSIONS.map((dimension, index) => {
        const angle =
          (-90 + (360 / WORKSPACE_CONTENT_QUALITY_DIMENSIONS.length) * index) * (Math.PI / 180);
        const outerX = center + Math.cos(angle) * radius;
        const outerY = center + Math.sin(angle) * radius;
        const pointRadius = radius * (block.scores[dimension] / 10);
        const valueX = center + Math.cos(angle) * pointRadius;
        const valueY = center + Math.sin(angle) * pointRadius;
        const labelX = center + Math.cos(angle) * labelRadius;
        const labelY = center + Math.sin(angle) * labelRadius;

        return {
          dimension,
          outerX,
          outerY,
          valueX,
          valueY,
          labelX,
          labelY,
        };
      }),
    [block.scores],
  );

  const ringPolygons = useMemo(
    () =>
      [0.25, 0.5, 0.75, 1].map((scale) =>
        WORKSPACE_CONTENT_QUALITY_DIMENSIONS.map((_, index) => {
          const angle =
            (-90 + (360 / WORKSPACE_CONTENT_QUALITY_DIMENSIONS.length) * index) * (Math.PI / 180);
          const x = center + Math.cos(angle) * radius * scale;
          const y = center + Math.sin(angle) * radius * scale;
          return `${x},${y}`;
        }).join(" "),
      ),
    [],
  );

  const radarPolygonPoints = useMemo(
    () => axes.map((axis) => `${axis.valueX},${axis.valueY}`).join(" "),
    [axes],
  );

  const focusDimensions = useMemo(
    () =>
      [...WORKSPACE_CONTENT_QUALITY_DIMENSIONS]
        .sort((left, right) => block.scores[left] - block.scores[right])
        .slice(0, 3),
    [block.scores],
  );

  function mutateRadarBlock(mutator: (entry: WorkspaceContentQualityRadarBlock) => void) {
    mutateTypedBlock(tabId, block.id, "content-quality-radar", mutator);
  }

  function updateScore(
    dimension: WorkspaceContentQualityDimension,
    value: string | number | undefined,
  ) {
    mutateRadarBlock((entry) => {
      entry.scores[dimension] = clampScore(value);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          <span className={averageToneClasses}>{summary.averageScore}</span> average · {qualityBand}{" "}
          · Strongest{" "}
          {summary.strongestDimension
            ? workspaceContentQualityDimensionLabels[summary.strongestDimension]
            : "none"}{" "}
          · Weakest{" "}
          <span className="text-destructive">
            {summary.weakestDimension
              ? workspaceContentQualityDimensionLabels[summary.weakestDimension]
              : "none"}
          </span>
        </p>
        <BlockProgressBar
          className="min-w-24 max-w-48 flex-1"
          value={summary.averageScore}
          max={10}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <section className="rounded-surface border border-muted bg-muted p-surface">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Radar view</p>
              <p className="text-sm text-toned">
                The filled shape expands where content quality is strong and collapses where
                execution needs work.
              </p>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-toned">Score</p>
              <p
                className={cn(
                  "text-2xl font-semibold tracking-tight sm:text-3xl",
                  averageToneClasses,
                )}
              >
                {summary.averageScore}
              </p>
            </div>
          </div>

          <div className="mt-5 flex justify-center">
            <svg viewBox={`0 0 ${chartSize} ${chartSize}`} className="size-70 overflow-visible">
              {ringPolygons.map((points, index) => (
                <polygon
                  key={`ring-${index}`}
                  points={points}
                  fill="none"
                  stroke="currentColor"
                  className="text-muted"
                />
              ))}

              {axes.map((axis) => (
                <line
                  key={`axis-${axis.dimension}`}
                  x1={center}
                  y1={center}
                  x2={axis.outerX}
                  y2={axis.outerY}
                  stroke="currentColor"
                  className="text-muted"
                />
              ))}

              <polygon
                points={radarPolygonPoints}
                fill="currentColor"
                stroke="currentColor"
                className="text-primary/30"
                strokeWidth={2}
              />

              {axes.map((axis) => (
                <circle
                  key={`point-${axis.dimension}`}
                  cx={axis.valueX}
                  cy={axis.valueY}
                  r={3.5}
                  className="fill-primary"
                />
              ))}

              {axes.map((axis) => (
                <text
                  key={`label-${axis.dimension}`}
                  x={axis.labelX}
                  y={axis.labelY}
                  textAnchor={getLabelAnchor(axis.labelX)}
                  className="fill-muted-foreground/60 text-[8px] font-bold uppercase tracking-[0.2em]"
                >
                  {shortLabels[axis.dimension]}
                </text>
              ))}
            </svg>
          </div>

          <div className="mt-4 rounded-surface border border-muted bg-background p-surface">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-toned">
              Focus next
            </p>
            <div className="mt-3 space-y-2">
              {focusDimensions.map((dimension) => (
                <article
                  key={dimension}
                  className="rounded-surface border border-muted bg-background p-surface"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground">
                      {workspaceContentQualityDimensionLabels[dimension]}
                    </p>
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        getScoreToneClasses(block.scores[dimension]),
                      )}
                    >
                      {block.scores[dimension]}/10
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-toned">{dimensionPlaybook[dimension]}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-surface border border-muted bg-background p-surface">
          <div className="mb-5">
            <p className="text-sm font-semibold text-foreground">Dimension controls</p>
            <p className="text-sm text-toned">
              Score each pillar from 1 to 10. Use the benchmark note to decide what to improve
              before publishing.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {WORKSPACE_CONTENT_QUALITY_DIMENSIONS.map((dimension) => (
              <article
                key={dimension}
                className="rounded-surface border border-muted bg-muted p-surface"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">
                    {workspaceContentQualityDimensionLabels[dimension]}
                  </p>
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      getScoreToneClasses(block.scores[dimension]),
                    )}
                  >
                    {block.scores[dimension]}
                  </span>
                </div>

                <BlockSlider
                  value={block.scores[dimension]}
                  min={1}
                  max={10}
                  className="mt-4"
                  aria-label={`Score for ${workspaceContentQualityDimensionLabels[dimension]}`}
                  onChange={(event) => updateScore(dimension, event.target.value)}
                />

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                    1
                  </div>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    step={1}
                    value={String(block.scores[dimension])}
                    className="h-8 w-20 rounded-xl"
                    aria-label={`Numeric score for ${workspaceContentQualityDimensionLabels[dimension]}`}
                    onChange={(event) => updateScore(dimension, event.target.value)}
                  />
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                    10
                  </div>
                </div>

                <p className="mt-3 text-xs text-toned">{dimensionPlaybook[dimension]}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
