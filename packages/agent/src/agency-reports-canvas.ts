import type { AgencyAgentRuntime, AgentToolCall, DashboardAgentToolPreset } from "./types";
import type { AiUiArtifact } from "./ui-artifact";

/** Ask-only — Plan/Agent must not get the canned hours canvas (looks like chat leak). */
export function shouldBootstrapAgencyMonthReports(toolPreset: DashboardAgentToolPreset): boolean {
  return toolPreset === "ask";
}

/** Mode-specific nudge when Agency tools were available but unused. */
export function agencyToolRetryNote(_toolPreset: DashboardAgentToolPreset): string {
  void _toolPreset;
  return "You answered without calling Agency tools. Call get_agency_reports_summary or get_agency_time_summary with {from,to} for this month. Do not invent hours or narrate tool calls.";
}

/** Nudge when tools ran but the model skipped the canvas. */
export function agencyUiPresentRetryNote(_toolPreset: DashboardAgentToolPreset): string {
  void _toolPreset;
  return "You already called Agency tools. Reply with one short line about what you found. Do not dump JSON or markdown tables.";
}

/** Retired: Plan mode question retries are gone. */
export function agencyQuestionRetryNote(_toolPreset: DashboardAgentToolPreset): string | null {
  void _toolPreset;
  return null;
}

function hoursLabel(seconds: number): string {
  return (seconds / 3_600).toFixed(1);
}

function monthRangeUtc(now = new Date()) {
  const to = now.toISOString().slice(0, 10);
  const from = `${to.slice(0, 8)}01`;
  return { from, to };
}

type ReportsSummary = Awaited<ReturnType<AgencyAgentRuntime["getReportsSummary"]>>;

/** Schema canvas for Agency month hours when the model skips tools. */
export function buildAgencyMonthHoursArtifact(
  summary: ReportsSummary,
  from: string,
  to: string,
): AiUiArtifact {
  const projectRows = summary.byProject
    .slice(0, 12)
    .map((project) => [
      project.projectName,
      hoursLabel(project.nonWasteSeconds),
      hoursLabel(project.wasteSeconds),
      hoursLabel(project.seconds),
    ]);
  const memberRows = summary.byMember
    .slice(0, 12)
    .map((member) => [
      member.userName,
      hoursLabel(member.nonWasteSeconds),
      hoursLabel(member.wasteSeconds),
      hoursLabel(member.seconds),
    ]);

  return {
    id: `agency-hours-${from}-${to}`,
    kind: "schema",
    title: `Team hours ${from} → ${to}`,
    schema: {
      version: 1,
      root: {
        type: "stack",
        gap: "md",
        children: [
          {
            type: "pillRow",
            pills: [
              { label: `${from} → ${to}`, tone: "muted" },
              { label: `${hoursLabel(summary.composition.totalSeconds)}h total`, tone: "accent" },
            ],
          },
          {
            type: "grid",
            columns: 3,
            gap: "md",
            children: [
              {
                type: "stat",
                label: "Paid",
                value: `${hoursLabel(summary.composition.paidSeconds)}h`,
              },
              {
                type: "stat",
                label: "Waste",
                value: `${hoursLabel(summary.composition.wasteSeconds)}h`,
              },
              {
                type: "stat",
                label: "Internal",
                value: `${hoursLabel(summary.composition.internalSeconds)}h`,
              },
            ],
          },
          ...(projectRows.length > 0
            ? [
                {
                  type: "table" as const,
                  columns: ["Project", "Non-waste h", "Waste h", "Total h"],
                  rows: projectRows,
                },
              ]
            : [
                {
                  type: "callout" as const,
                  tone: "info" as const,
                  title: "No project hours",
                  body: "No tracked time in this range yet.",
                },
              ]),
          ...(memberRows.length > 0
            ? [
                {
                  type: "table" as const,
                  columns: ["Member", "Non-waste h", "Waste h", "Total h"],
                  rows: memberRows,
                },
              ]
            : []),
        ],
      },
    },
  };
}

export type AgencyReportsBootstrapResult = {
  tool: AgentToolCall;
  artifact: AiUiArtifact;
  responseText: string;
};

/**
 * When the model refuses/skips Agency tools, load this month's reports and paint the canvas.
 * ponytail: deterministic fallback — upgrade by teaching models to call tools reliably.
 */
export async function bootstrapAgencyMonthReportsCanvas(
  runtime: AgencyAgentRuntime,
  now = new Date(),
): Promise<AgencyReportsBootstrapResult> {
  const { from, to } = monthRangeUtc(now);
  const summary = await runtime.getReportsSummary({ from, to });
  const artifact = buildAgencyMonthHoursArtifact(summary, from, to);
  const tool: AgentToolCall = {
    id: `bootstrap-get_agency_reports_summary-${from}`,
    name: "get_agency_reports_summary",
    input: { from, to },
    output: summary,
    status: "completed",
    error: null,
  };
  return {
    tool,
    artifact,
    responseText: `Loaded team hours for ${from} → ${to} in the canvas.`,
  };
}
