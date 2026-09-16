import { z } from "zod";

import {
  agencyProjectTaskAssigneeSchema,
  agencyProjectTaskKindSchema,
  agencyProjectTaskMemberStatusSchema,
  agencyProjectTaskSchema,
  agencyProjectTaskStatusSchema,
  agencyEntityIconKeySchema,
  agencyEntityIconSourceSchema,
} from "../../../schemas/agency-ops";

export const agencyTimeEntrySourceSchema = z.enum(["timer", "manual"]);

export const teamScopedInputSchema = z.object({
  teamId: z.string().min(1),
});

export const agencyTagSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  name: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const agencyDepartmentSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  name: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const agencyClientCategorySchema = z.enum(["internal", "external"]);

export const agencyClientSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  name: z.string().min(1),
  category: agencyClientCategorySchema,
  billableRateAmount: z.number().int().nonnegative().nullable(),
  sourceBillableRateAmount: z.number().int().nonnegative().nullable(),
  currency: z.string().min(1),
  archivedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const agencyProjectColorHueIdSchema = z.number().int().min(1).max(12);

export const agencyProjectTrashFilterSchema = z.enum(["active", "trashed", "all"]);

export const agencyProjectSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  clientId: z.string().min(1),
  clientName: z.string().min(1),
  name: z.string().min(1),
  colorHueId: agencyProjectColorHueIdSchema.nullable(),
  iconKey: agencyEntityIconKeySchema.nullable(),
  iconSource: agencyEntityIconSourceSchema,
  billableRateAmount: z.number().int().nonnegative().nullable(),
  sourceBillableRateAmount: z.number().int().nonnegative().nullable(),
  currency: z.string().length(3),
  clientBillableRateAmount: z.number().int().nonnegative().nullable(),
  clientSourceBillableRateAmount: z.number().int().nonnegative().nullable(),
  clientCurrency: z.string().length(3),
  deletedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const agencyProjectTaskBlueprintSchema = z.object({
  id: z.string().min(1),
  description: z.string(),
});

export {
  agencyProjectTaskSchema,
  agencyProjectTaskStatusSchema,
  agencyProjectTaskKindSchema,
  agencyProjectTaskMemberStatusSchema,
  agencyProjectTaskAssigneeSchema,
  agencyEntityIconKeySchema,
  agencyEntityIconSourceSchema,
};
export const agencyProjectJourneyStepSchema = z.object({
  id: z.string().min(1),
  journeyId: z.string().min(1),
  sortOrder: z.number().int(),
  label: z.string().min(1),
  stepKind: z.enum(["start", "milestone", "checkpoint", "destination"]),
  status: z.enum(["planned", "active", "done", "blocked"]),
  taskId: z.string().nullable(),
  task: agencyProjectTaskSchema.nullable().optional(),
  timeEntryCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const agencyProjectJourneySchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  steps: z.array(agencyProjectJourneyStepSchema),
  completedSteps: z.number().int().nonnegative(),
  totalSteps: z.number().int().nonnegative(),
});

export const agencyTimeEntryLinkSchema = z.object({
  id: z.string().min(1),
  url: z.string().url(),
});

export const agencyTimeEntrySchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  userId: z.string().min(1),
  userName: z.string().min(1),
  projectId: z.string().min(1),
  taskId: z.string().nullable(),
  taskTitle: z.string().nullable(),
  taskIconKey: agencyEntityIconKeySchema.nullable(),
  taskIsWaste: z.boolean().nullable(),
  projectName: z.string().min(1),
  colorHueId: agencyProjectColorHueIdSchema.nullable(),
  projectIconKey: agencyEntityIconKeySchema.nullable(),
  clientId: z.string().min(1),
  clientName: z.string().min(1),
  tags: z.array(agencyTagSchema),
  links: z.array(agencyTimeEntryLinkSchema),
  source: agencyTimeEntrySourceSchema,
  description: z.string(),
  isBillable: z.boolean(),
  isWaste: z.boolean(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  durationSeconds: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const agencyActiveTimerSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  userId: z.string().min(1),
  /** Empty when the timer was started before a project/task was chosen. */
  projectId: z.string(),
  taskId: z.string().nullable(),
  taskTitle: z.string().nullable(),
  taskIconKey: agencyEntityIconKeySchema.nullable(),
  projectName: z.string(),
  colorHueId: agencyProjectColorHueIdSchema.nullable(),
  projectIconKey: agencyEntityIconKeySchema.nullable(),
  tags: z.array(agencyTagSchema),
  links: z.array(agencyTimeEntryLinkSchema),
  description: z.string(),
  isBillable: z.boolean(),
  startedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const reportsSummarySchema = z.object({
  totalHours: z.number().nonnegative(),
  totalEntries: z.number().int().nonnegative(),
  timeDistributionByClient: z.array(
    z.object({
      clientId: z.string().min(1),
      clientName: z.string().min(1),
      hours: z.number().nonnegative(),
    }),
  ),
  timeDistributionByProject: z.array(
    z.object({
      projectId: z.string().min(1),
      projectName: z.string().min(1),
      colorHueId: agencyProjectColorHueIdSchema.nullable(),
      iconKey: agencyEntityIconKeySchema.nullable(),
      clientId: z.string().min(1),
      clientName: z.string().min(1),
      hours: z.number().nonnegative(),
    }),
  ),
  teamActivity: z.array(
    z.object({
      userId: z.string().min(1),
      userName: z.string().min(1),
      userEmail: z.email(),
      hours: z.number().nonnegative(),
    }),
  ),
});

export const reportsDashboardSummarySchema = reportsSummarySchema.extend({
  totalSeconds: z.number().int().nonnegative(),
  projectShareMetrics: z.object({
    externalSeconds: z.number().int().nonnegative(),
    internalSeconds: z.number().int().nonnegative(),
    internalBillableSeconds: z.number().int().nonnegative(),
    paidSeconds: z.number().int().nonnegative(),
  }),
  activeTimerCount: z.number().int().nonnegative(),
  topClient: z
    .object({
      clientId: z.string().min(1),
      clientName: z.string().min(1),
      seconds: z.number().int().nonnegative(),
    })
    .nullable(),
  topProject: z
    .object({
      projectId: z.string().min(1),
      projectName: z.string().min(1),
      clientId: z.string().min(1),
      clientName: z.string().min(1),
      seconds: z.number().int().nonnegative(),
    })
    .nullable(),
  dailyBuckets: z.array(
    z.object({
      date: z.string().min(1),
      totalSeconds: z.number().int().nonnegative(),
      segments: z.array(
        z.object({
          projectId: z.string().min(1),
          projectName: z.string().min(1),
          clientName: z.string().min(1),
          seconds: z.number().int().nonnegative(),
        }),
      ),
    }),
  ),
  teamMembers: z.array(
    z.object({
      userId: z.string().min(1),
      userName: z.string().min(1),
      userEmail: z.email(),
      avatar: z.string().nullable(),
      isActive: z.boolean(),
      totalSeconds: z.number().int().nonnegative(),
      latestEntry: z
        .object({
          projectName: z.string().min(1),
          clientName: z.string().min(1),
          description: z.string(),
          startedAt: z.string().datetime(),
        })
        .nullable(),
      projectBreakdown: z.array(
        z.object({
          projectId: z.string().min(1),
          projectName: z.string().min(1),
          clientName: z.string().min(1),
          seconds: z.number().int().nonnegative(),
        }),
      ),
    }),
  ),
});

export const reportsInputSchema = teamScopedInputSchema.extend({
  from: z.string().datetime(),
  to: z.string().datetime(),
  clientId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
  memberUserId: z.string().min(1).optional(),
  clientIds: z.array(z.string().min(1)).optional(),
  projectIds: z.array(z.string().min(1)).optional(),
  memberUserIds: z.array(z.string().min(1)).optional(),
});

export const reportsPreviewClientSchema = z.object({
  clientId: z.string().min(1),
  clientName: z.string().min(1),
  totalSeconds: z.number().int().nonnegative(),
  totalEntries: z.number().int().nonnegative(),
  amount: z.number().int().nonnegative().nullable(),
  amountCurrency: z.string().min(1).nullable(),
  entries: z.array(agencyTimeEntrySchema),
});

export const reportsPreviewSchema = z.object({
  totals: z.object({
    totalSeconds: z.number().int().nonnegative(),
    totalEntries: z.number().int().nonnegative(),
    paidSeconds: z.number().int().nonnegative(),
    wasteSeconds: z.number().int().nonnegative(),
    internalSeconds: z.number().int().nonnegative(),
    internalBillableSeconds: z.number().int().nonnegative(),
    externalSeconds: z.number().int().nonnegative(),
  }),
  totalClientCount: z.number().int().nonnegative(),
  omittedClientCount: z.number().int().nonnegative(),
  clients: z.array(reportsPreviewClientSchema),
});

export const savedReportActivityActionSchema = z.enum([
  "created",
  "renamed",
  "entries_excluded",
  "entries_restored",
  "entry_edited",
  "waste_toggled",
  "exported",
]);

export const savedReportSnapshotInputSchema = teamScopedInputSchema.extend({
  name: z.string().trim().min(1).max(240),
  rangePreset: z.string().min(1),
  customFromDate: z.string().optional(),
  customToDate: z.string().optional(),
  rangeFrom: z.string().datetime(),
  rangeTo: z.string().datetime(),
  clientId: z.string().optional(),
  projectId: z.string().optional(),
  memberUserId: z.string().optional(),
  fieldIds: z.array(z.string().min(1)),
});

export const savedReportRecordSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  name: z.string().min(1),
  rangePreset: z.string().min(1),
  customFromDate: z.string(),
  customToDate: z.string(),
  rangeFrom: z.string().datetime(),
  rangeTo: z.string().datetime(),
  clientId: z.string(),
  projectId: z.string(),
  memberUserId: z.string(),
  fieldIds: z.array(z.string().min(1)),
  excludedEntryIds: z.array(z.string().min(1)),
  createdByUserName: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const savedReportListItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  rangeFrom: z.string().datetime(),
  rangeTo: z.string().datetime(),
  clientId: z.string(),
  projectId: z.string(),
  memberUserId: z.string(),
  createdByUserName: z.string().min(1),
  updatedAt: z.string().datetime(),
});

export const savedReportActivityRecordSchema = z.object({
  id: z.string().min(1),
  action: savedReportActivityActionSchema,
  payload: z.record(z.string(), z.unknown()),
  actorUserName: z.string().min(1),
  createdAt: z.string().datetime(),
});

export const timeSummarySchema = z.object({
  totalSeconds: z.number().int().nonnegative(),
  activeCount: z.number().int().nonnegative(),
  teamMembers: z.array(
    z.object({
      id: z.string().min(1),
      avatar: z.string().nullable(),
      name: z.string(),
      email: z.email(),
      isActive: z.boolean(),
      totalSeconds: z.number().int().nonnegative(),
      latestEntry: z
        .object({
          projectName: z.string(),
          description: z.string(),
        })
        .nullable(),
    }),
  ),
});
