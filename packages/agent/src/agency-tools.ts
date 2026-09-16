import { tool } from "@openrouter/sdk/lib/tool";
import { createWorkspaceId } from "@orch/workspace";
import { z } from "zod";

import { agencyActionLabel, agencyActionSchema, agencyDraftPlanSchema } from "./agency-actions";
import type { AgencyAgentRuntime, DashboardAgentToolPreset } from "./types";

export const AGENCY_LIST_DEFAULT_PAGE_SIZE = 10;
export const AGENCY_PROJECTS_DEFAULT_LIMIT = 50;
export const AGENCY_SUMMARY_TOP_N = 15;

const agencyTimeEntrySchema = z.object({
  id: z.string(),
  description: z.string(),
  projectName: z.string(),
  clientName: z.string(),
  durationSeconds: z.number().int().nonnegative(),
  startedAt: z.string(),
  endedAt: z.string(),
  isBillable: z.boolean(),
});

/** Empty string → undefined so models that emit `""` for unused filters still validate. */
const optionalFilterIdSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}, z.string().min(1).optional());

/**
 * Date-range tools: only `from`/`to` at the top level.
 * Nested optional `filter` keeps the common call to two keys so weaker models
 * stop stuffing `"memberUserId":""` into the JSON and breaking the parse.
 */
export const agencyDateRangeInputSchema = z.object({
  from: z
    .string()
    .trim()
    .min(1)
    .describe("Inclusive start date as YYYY-MM-DD. Example: 2026-08-01"),
  to: z.string().trim().min(1).describe("Inclusive end date as YYYY-MM-DD. Example: 2026-08-04"),
  filter: z
    .object({
      memberUserId: optionalFilterIdSchema.describe("Omit unless filtering to one member."),
      projectId: optionalFilterIdSchema.describe("Omit unless filtering to one project."),
      clientId: optionalFilterIdSchema.describe("Omit unless filtering to one client."),
    })
    .optional()
    .describe("Omit this object entirely unless you must filter. Never pass empty strings."),
});

export function flattenAgencyDateRangeInput(input: z.infer<typeof agencyDateRangeInputSchema>) {
  return {
    from: input.from,
    to: input.to,
    memberUserId: input.filter?.memberUserId,
    projectId: input.filter?.projectId,
    clientId: input.filter?.clientId,
  };
}

export function takeTopNWithTruncated<T>(items: T[], limit: number) {
  const capped = Math.max(0, limit);
  return {
    items: items.slice(0, capped),
    truncated: items.length > capped,
    total: items.length,
  };
}

function buildAgencyReadTools(runtime: AgencyAgentRuntime) {
  return [
    tool({
      name: "get_current_time",
      description: "Get the current ISO timestamp for time-sensitive planning questions.",
      inputSchema: z.object({}),
      outputSchema: z.object({
        iso: z.string(),
      }),
      execute: async () => ({
        iso: new Date().toISOString(),
      }),
    }),
    tool({
      name: "list_agency_time_entries",
      description: "List the current user's recent Agency time entries for the active team.",
      inputSchema: z.object({
        page: z.number().int().min(1).max(50).default(1),
        pageSize: z.number().int().min(1).max(100).default(AGENCY_LIST_DEFAULT_PAGE_SIZE),
      }),
      outputSchema: z.object({
        entries: z.array(agencyTimeEntrySchema),
      }),
      execute: async ({ page, pageSize }) => runtime.listMyTimeEntries({ page, pageSize }),
    }),
    tool({
      name: "list_agency_time_gaps",
      description:
        "Check uncovered time windows vs the current user's tracked entries for from/to (YYYY-MM-DD). Does not insert entries. Default the model should use today when the user omits a range.",
      inputSchema: agencyDateRangeInputSchema,
      outputSchema: z.object({
        from: z.string(),
        to: z.string(),
        trackedSeconds: z.number().int().nonnegative(),
        gapSeconds: z.number().int().nonnegative(),
        gaps: z.array(
          z.object({
            startAt: z.string(),
            endAt: z.string(),
            durationSeconds: z.number().int().nonnegative(),
            projectId: z.string().nullable(),
            taskId: z.string().nullable(),
          }),
        ),
      }),
      execute: async (input) => runtime.listTimeGaps(flattenAgencyDateRangeInput(input)),
    }),
    tool({
      name: "get_agency_client_bill",
      description:
        "Read one client's composed bill for a period (current + carry). Amounts are integer minor units. Does not export or send.",
      inputSchema: z.object({
        clientId: z.string().trim().min(1),
        periodStart: z.string().datetime(),
        periodEnd: z.string().datetime(),
      }),
      outputSchema: z.object({
        clientId: z.string(),
        clientName: z.string().nullable(),
        amount: z.number().int(),
        remainingAmount: z.number().int(),
        wasteAmount: z.number().int(),
        lines: z.array(
          z.object({
            id: z.string(),
            kind: z.enum(["invoice", "ready"]),
            isCarry: z.boolean(),
            periodStart: z.string(),
            periodEnd: z.string(),
            amount: z.number().int(),
            remainingAmount: z.number().int(),
          }),
        ),
      }),
      execute: async (input) => runtime.getClientBill(input),
    }),
    tool({
      name: "list_member_profile_alerts",
      description:
        "List member profile alerts (Needs-action) for a user on the active team. Defaults to the current user.",
      inputSchema: z.object({
        userId: z
          .string()
          .trim()
          .min(1)
          .optional()
          .describe("Member user id; defaults to the current user."),
      }),
      outputSchema: z.object({
        alerts: z.array(
          z.object({
            id: z.string(),
            kind: z.string(),
            title: z.string(),
            dateKey: z.string().nullable(),
            entryIds: z.array(z.string()),
          }),
        ),
        canManageAlerts: z.boolean(),
      }),
      execute: async (input) => runtime.listMemberAlerts(input),
    }),
    tool({
      name: "get_agency_time_entry",
      description: "Read one Agency time entry by id for the current user.",
      inputSchema: z.object({
        entryId: z.string().trim().min(1),
      }),
      outputSchema: z.object({
        entry: z
          .object({
            id: z.string(),
            description: z.string(),
            projectId: z.string(),
            projectName: z.string(),
            clientName: z.string(),
            taskId: z.string().nullable(),
            durationSeconds: z.number().int().nonnegative(),
            startedAt: z.string(),
            endedAt: z.string(),
            isBillable: z.boolean(),
            isWaste: z.boolean(),
          })
          .nullable(),
      }),
      execute: async ({ entryId }) => runtime.getTimeEntry({ entryId }),
    }),
    tool({
      name: "get_agency_active_timer",
      description: "Read the current user's active Agency timer, if any.",
      inputSchema: z.object({}),
      outputSchema: z.object({
        timer: z
          .object({
            id: z.string(),
            projectId: z.string().nullable(),
            taskId: z.string().nullable(),
            description: z.string(),
            startedAt: z.string(),
            isBillable: z.boolean(),
          })
          .nullable(),
      }),
      execute: async () => runtime.getActiveTimer(),
    }),
    tool({
      name: "list_agency_projects",
      description: "List Agency projects and their clients for the active team.",
      inputSchema: z.object({
        clientId: optionalFilterIdSchema.describe("Omit unless filtering to one client."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(200)
          .default(AGENCY_PROJECTS_DEFAULT_LIMIT)
          .describe("Max projects to return."),
      }),
      outputSchema: z.object({
        projects: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            clientId: z.string(),
            clientName: z.string(),
          }),
        ),
        truncated: z.boolean(),
        total: z.number().int().nonnegative(),
      }),
      execute: async ({ clientId, limit }) => {
        const result = await runtime.listProjects(clientId ? { clientId } : {});
        const sliced = takeTopNWithTruncated(result.projects, limit);
        return {
          projects: sliced.items,
          truncated: sliced.truncated,
          total: sliced.total,
        };
      },
    }),
    tool({
      name: "list_agency_clients",
      description: "List Agency clients for the active team.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(200).default(50),
      }),
      outputSchema: z.object({
        clients: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            category: z.string(),
          }),
        ),
        truncated: z.boolean(),
        total: z.number().int().nonnegative(),
      }),
      execute: async ({ limit }) => runtime.listClients({ limit }),
    }),
    tool({
      name: "list_agency_tags",
      description: "List Agency tags for the active team.",
      inputSchema: z.object({}),
      outputSchema: z.object({
        tags: z.array(z.object({ id: z.string(), name: z.string() })),
      }),
      execute: async () => runtime.listTags(),
    }),
    tool({
      name: "list_agency_project_tasks",
      description: "List tasks for one Agency project.",
      inputSchema: z.object({
        projectId: z.string().trim().min(1),
        page: z.number().int().min(1).max(50).default(1),
        pageSize: z.number().int().min(1).max(100).default(25),
      }),
      outputSchema: z.object({
        tasks: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            status: z.string(),
            projectId: z.string(),
          }),
        ),
        truncated: z.boolean(),
        total: z.number().int().nonnegative(),
      }),
      execute: async ({ projectId, page, pageSize }) =>
        runtime.listProjectTasks({ projectId, page, pageSize }),
    }),
    tool({
      name: "list_agency_members",
      description: "List members and roles for the active Agency team (no emails).",
      inputSchema: z.object({}),
      outputSchema: z.object({
        members: z.array(
          z.object({
            userId: z.string(),
            name: z.string(),
            role: z.string(),
          }),
        ),
      }),
      execute: async () => runtime.listMembers(),
    }),
    tool({
      name: "get_agency_time_summary",
      description:
        "Per-member tracked seconds for a date range. Pass only {from,to} as YYYY-MM-DD. For project/client breakdowns use get_agency_reports_summary.",
      inputSchema: agencyDateRangeInputSchema,
      outputSchema: z.object({
        totalSeconds: z.number().int().nonnegative(),
        members: z.array(
          z.object({
            userId: z.string(),
            name: z.string(),
            seconds: z.number().int().nonnegative(),
            isTiming: z.boolean(),
          }),
        ),
        truncated: z.boolean(),
        totalMembers: z.number().int().nonnegative(),
      }),
      execute: async (input) => {
        const result = await runtime.getTimeSummary(flattenAgencyDateRangeInput(input));
        const sliced = takeTopNWithTruncated(result.members, AGENCY_SUMMARY_TOP_N);
        return {
          totalSeconds: result.totalSeconds,
          members: sliced.items,
          truncated: sliced.truncated,
          totalMembers: sliced.total,
        };
      },
    }),
    tool({
      name: "get_agency_reports_summary",
      description:
        "Hours by client, project, and member for a date range. Prefer this for project/client comparisons. Pass only {from,to} as YYYY-MM-DD unless filtering.",
      inputSchema: agencyDateRangeInputSchema,
      outputSchema: z.object({
        totalSeconds: z.number().int().nonnegative(),
        composition: z.object({
          paidSeconds: z.number().int().nonnegative(),
          wasteSeconds: z.number().int().nonnegative(),
          internalSeconds: z.number().int().nonnegative(),
          totalSeconds: z.number().int().nonnegative(),
        }),
        byClient: z.array(
          z.object({
            clientId: z.string(),
            clientName: z.string(),
            seconds: z.number().int().nonnegative(),
          }),
        ),
        byProject: z.array(
          z.object({
            projectId: z.string(),
            projectName: z.string(),
            clientName: z.string(),
            seconds: z.number().int().nonnegative(),
            wasteSeconds: z.number().int().nonnegative(),
            nonWasteSeconds: z.number().int().nonnegative(),
          }),
        ),
        byMember: z.array(
          z.object({
            userId: z.string(),
            userName: z.string(),
            seconds: z.number().int().nonnegative(),
            wasteSeconds: z.number().int().nonnegative(),
            nonWasteSeconds: z.number().int().nonnegative(),
          }),
        ),
        truncated: z.boolean(),
      }),
      execute: async (input) => {
        const result = await runtime.getReportsSummary(flattenAgencyDateRangeInput(input));
        const byClient = takeTopNWithTruncated(result.byClient, AGENCY_SUMMARY_TOP_N);
        const byProject = takeTopNWithTruncated(result.byProject, AGENCY_SUMMARY_TOP_N);
        const byMember = takeTopNWithTruncated(result.byMember, AGENCY_SUMMARY_TOP_N);
        return {
          totalSeconds: result.totalSeconds,
          composition: result.composition,
          byClient: byClient.items,
          byProject: byProject.items,
          byMember: byMember.items,
          truncated: byClient.truncated || byProject.truncated || byMember.truncated,
        };
      },
    }),
  ];
}

function buildAgencyPlanTool() {
  return tool({
    name: "draft_agency_plan",
    description:
      "Draft a multi-step Agency change plan. Does not write data. User must Confirm in the UI to materialize proposals. Each step is { label, action } where action is { type, ...fields } and type is one of time_entry.create|update|delete, timer.start|stop|update, project.create|update|archive|restore, task.create|update|delete, tag.create|delete, client.create|update|archive.",
    inputSchema: z.object({
      title: z.string().trim().min(1).max(160),
      summary: z.string().trim().min(1).max(1_000),
      steps: z
        .array(
          z.object({
            label: z.string().trim().min(1).max(200),
            // Opaque at schema layer — full action union validated in execute (provider schema limits).
            action: z.any(),
          }),
        )
        .min(1)
        .max(20),
    }),
    outputSchema: agencyDraftPlanSchema,
    execute: async ({ title, summary, steps }) =>
      agencyDraftPlanSchema.parse({
        planId: createWorkspaceId("aplan"),
        title,
        summary,
        steps,
      }),
  });
}

function buildAgencyProposeTool(runtime: AgencyAgentRuntime) {
  return tool({
    name: "propose_agency_action",
    description:
      "Propose one Agency write with before/after. Does not apply the write. The user must Approve or Reject. action is { type, ...fields } with type time_entry.*|timer.*|project.*|task.*|tag.*|client.*.",
    inputSchema: z.object({
      // Opaque at schema layer — agencyActionSchema.parse in execute.
      action: z.any(),
      label: z.string().trim().min(1).max(200).optional(),
    }),
    outputSchema: z.object({
      proposalId: z.string(),
      status: z.literal("pending"),
      action: agencyActionSchema,
      before: z.unknown(),
      after: z.unknown(),
      label: z.string(),
      note: z.string(),
    }),
    execute: async ({ action, label }) => {
      const parsedAction = agencyActionSchema.parse(action);
      const proposal = await runtime.createProposal({
        action: parsedAction,
        label: label ?? agencyActionLabel(parsedAction),
      });
      return {
        ...proposal,
        action: agencyActionSchema.parse(proposal.action),
        note: "Pending approval. Tell the user to Approve or Reject.",
      };
    },
  });
}

export function buildAgencyAgentTools(
  runtime: AgencyAgentRuntime,
  _preset: DashboardAgentToolPreset = "agent",
) {
  void _preset;
  return [
    ...buildAgencyReadTools(runtime),
    buildAgencyPlanTool(),
    buildAgencyProposeTool(runtime),
  ];
}
