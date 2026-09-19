import { z } from "zod";

import {
  WORKSPACE_2X2_MATRIX_ITEM_LIMIT,
  WORKSPACE_ASSUMPTION_LIMIT,
  WORKSPACE_AUTHORITY_SCORECARD_METRICS,
  WORKSPACE_BUSINESS_MODEL_CANVAS_CELL_KEYS,
  WORKSPACE_CHECKLIST_ITEM_LIMIT,
  WORKSPACE_COHORT_LIMIT,
  WORKSPACE_COHORT_STATUSES,
  WORKSPACE_CONTENT_PIPELINE_ITEM_LIMIT,
  WORKSPACE_CONTENT_PIPELINE_STATUSES,
  WORKSPACE_CONTENT_PLATFORMS,
  WORKSPACE_CONTENT_QUALITY_DIMENSIONS,
  WORKSPACE_CONTENT_ROI_ITEM_LIMIT,
  WORKSPACE_CONTENT_ROI_SORT_OPTIONS,
  WORKSPACE_COURSE_OUTCOME_LIMIT,
  WORKSPACE_COURSE_ROADMAP_COURSE_LIMIT,
  WORKSPACE_COURSE_ROADMAP_LESSON_LIMIT,
  WORKSPACE_COURSE_STATUSES,
  WORKSPACE_CUSTOM_BLOCK_FIELD_LIMIT,
  WORKSPACE_CUSTOM_BLOCK_TEMPLATE_LIMIT,
  WORKSPACE_DEAL_SCORING_DEAL_LIMIT,
  WORKSPACE_DECISION_MATRIX_CRITERIA_LIMIT,
  WORKSPACE_DECISION_MATRIX_OPTION_LIMIT,
  WORKSPACE_DELEGATION_ITEM_LIMIT,
  WORKSPACE_DELEGATION_STATUSES,
  WORKSPACE_EXPENSE_ITEM_LIMIT,
  WORKSPACE_FINANCE_PAYMENT_STATUSES,
  WORKSPACE_FORECAST_CONFIDENCE_ITEM_LIMIT,
  WORKSPACE_HABIT_GRID_DAYS,
  WORKSPACE_HABIT_GRID_HABIT_LIMIT,
  WORKSPACE_HOOK_BANK_ITEM_LIMIT,
  WORKSPACE_KANBAN_CARD_LIMIT,
  WORKSPACE_KANBAN_COLUMN_LIMIT,
  WORKSPACE_LEADERSHIP_FILTERS,
  WORKSPACE_LEADERSHIP_MEETING_LIMIT,
  WORKSPACE_LEADERSHIP_MEETING_STATUSES,
  WORKSPACE_LEADERSHIP_RHYTHMS,
  WORKSPACE_MARKETPLACE_ITEM_LIMIT,
  WORKSPACE_NODE_CONNECTION_LIMIT,
  WORKSPACE_NODE_DASHBOARD_DETAIL_LIMIT,
  WORKSPACE_NODE_LIMIT,
  WORKSPACE_NODE_TAB_LIMIT,
  WORKSPACE_NODE_TINTS,
  WORKSPACE_NODE_TYPES,
  WORKSPACE_OKR_KEY_RESULT_LIMIT,
  WORKSPACE_OKR_OBJECTIVE_LIMIT,
  WORKSPACE_PIPELINE_FUNNEL_DEAL_LIMIT,
  WORKSPACE_PROCESS_STEP_LIMIT,
  WORKSPACE_PROFITABILITY_CLIENT_LIMIT,
  WORKSPACE_PROS_CONS_ITEM_LIMIT,
  WORKSPACE_RECEIVABLE_FILTERS,
  WORKSPACE_RECEIVABLE_INVOICE_LIMIT,
  WORKSPACE_RECEIVABLE_STATUSES,
  WORKSPACE_SALES_FORECAST_BUCKETS,
  WORKSPACE_SALES_PIPELINE_STAGES,
  WORKSPACE_SALES_TEMPERATURES,
  WORKSPACE_SCORECARD_METRIC_LIMIT,
  WORKSPACE_SEAT_HEALTH_STATES,
  WORKSPACE_SEAT_LOAD_LEVELS,
  WORKSPACE_SEAT_PLANNER_FILTERS,
  WORKSPACE_SEAT_PLANNER_SEAT_LIMIT,
  WORKSPACE_SKILLS_HEAT_MAP_DIMENSIONS_LIMIT,
  WORKSPACE_SKILLS_HEAT_MAP_MEMBER_LIMIT,
  WORKSPACE_STRATEGIC_ASSUMPTION_FILTERS,
  WORKSPACE_STRATEGIC_ASSUMPTION_LINK_TYPES,
  WORKSPACE_STRATEGIC_ASSUMPTION_STATUSES,
  WORKSPACE_TAB_BLOCK_LIMIT,
  WORKSPACE_TABLE_COLUMN_LIMIT,
  WORKSPACE_TABLE_ROW_LIMIT,
  WORKSPACE_TALENT_GRID_MEMBER_LIMIT,
  WORKSPACE_TASK_DOMAINS,
  WORKSPACE_TASK_LIMIT,
  WORKSPACE_TASK_QUADRANTS,
  WORKSPACE_TIMELINE_MILESTONE_LIMIT,
  WORKSPACE_TIMELINE_MILESTONE_STATUSES,
} from "./constants";

const isoTimestampSchema = z.string().datetime();
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoMonthSchema = z.string().regex(/^\d{4}-\d{2}$/);

export const workspaceTaskPrioritySchema = z.enum(["low", "medium", "high"]);
export const workspaceTaskDomainSchema = z.enum(WORKSPACE_TASK_DOMAINS);
export const workspaceTaskQuadrantSchema = z.enum(WORKSPACE_TASK_QUADRANTS);
export const workspaceHabitGridDaySchema = z.enum(WORKSPACE_HABIT_GRID_DAYS);
export const workspaceTimelineMilestoneStatusSchema = z.enum(WORKSPACE_TIMELINE_MILESTONE_STATUSES);
export const workspaceNodeTintSchema = z.enum(WORKSPACE_NODE_TINTS);
export const workspaceCustomFieldTypeSchema = z.enum(["text", "number", "checkbox", "textarea"]);
export const workspacePeopleSkillDimensionSchema = z.string();
export const workspaceDelegationStatusSchema = z.enum(WORKSPACE_DELEGATION_STATUSES);
export const workspaceSalesPipelineStageSchema = z.enum(WORKSPACE_SALES_PIPELINE_STAGES);
export const workspaceSalesTemperatureSchema = z.enum(WORKSPACE_SALES_TEMPERATURES);
export const workspaceSalesForecastBucketSchema = z.enum(WORKSPACE_SALES_FORECAST_BUCKETS);
export const workspaceContentPlatformSchema = z.enum(WORKSPACE_CONTENT_PLATFORMS);
export const workspaceContentPipelineStatusSchema = z.enum(WORKSPACE_CONTENT_PIPELINE_STATUSES);
export const workspaceContentQualityDimensionSchema = z.enum(WORKSPACE_CONTENT_QUALITY_DIMENSIONS);
export const workspaceContentRoiSortSchema = z.enum(WORKSPACE_CONTENT_ROI_SORT_OPTIONS);
export const workspaceSeatHealthSchema = z.enum(WORKSPACE_SEAT_HEALTH_STATES);
export const workspaceSeatLoadLevelSchema = z.enum(WORKSPACE_SEAT_LOAD_LEVELS);
export const workspaceSeatPlannerFilterSchema = z.enum(WORKSPACE_SEAT_PLANNER_FILTERS);
export const workspaceAuthorityScoreMetricKeySchema = z.enum(WORKSPACE_AUTHORITY_SCORECARD_METRICS);
export const workspaceFinancePaymentStatusSchema = z.enum(WORKSPACE_FINANCE_PAYMENT_STATUSES);
export const workspaceReceivableStatusSchema = z.enum(WORKSPACE_RECEIVABLE_STATUSES);
export const workspaceReceivableFilterSchema = z.enum(WORKSPACE_RECEIVABLE_FILTERS);
export const workspaceCourseStatusSchema = z.enum(WORKSPACE_COURSE_STATUSES);
export const workspaceCohortStatusSchema = z.enum(WORKSPACE_COHORT_STATUSES);
export const workspaceLeadershipRhythmSchema = z.enum(WORKSPACE_LEADERSHIP_RHYTHMS);
export const workspaceLeadershipMeetingStatusSchema = z.enum(WORKSPACE_LEADERSHIP_MEETING_STATUSES);
export const workspaceLeadershipRhythmFilterSchema = z.enum(WORKSPACE_LEADERSHIP_FILTERS);
export const workspaceTeamRoleSchema = z.enum(["owner", "editor", "viewer"]);
export const workspaceNodeVisibilitySchema = z.enum(["private", "team"]);
export const workspaceNodeTypeSchema = z.enum(WORKSPACE_NODE_TYPES);

export const workspaceTaskSchema = z.object({
  id: z.string().min(1),
  text: z.string().trim().max(240),
  completed: z.boolean().default(false),
  dueDate: isoDateSchema.nullable().optional(),
  priority: workspaceTaskPrioritySchema.nullable().optional(),
  domain: workspaceTaskDomainSchema.nullable().optional(),
  urgency: z.number().int().min(1).max(10).default(5),
  importance: z.number().int().min(1).max(10).default(5),
  estimateMinutes: z.number().int().min(0).max(1440).default(30),
});

export const workspacePromptOutputSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().max(4000),
  output: z.string().max(12000),
  createdAt: isoTimestampSchema,
});

export const workspaceCourseRoadmapLessonSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().max(120),
  recorded: z.boolean().default(false),
});

export const workspaceCourseRoadmapOutcomeSchema = z.object({
  id: z.string().min(1),
  text: z.string().trim().max(200),
});

export const workspaceCourseRoadmapCourseSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().max(120),
  status: workspaceCourseStatusSchema.default("planning"),
  lessons: z
    .array(workspaceCourseRoadmapLessonSchema)
    .max(WORKSPACE_COURSE_ROADMAP_LESSON_LIMIT)
    .default([]),
  outcomes: z
    .array(workspaceCourseRoadmapOutcomeSchema)
    .max(WORKSPACE_COURSE_OUTCOME_LIMIT)
    .default([]),
});

export const workspaceDecisionItemSchema = z.object({
  id: z.string().min(1),
  text: z.string().trim().max(240),
  weight: z.number().int().min(1).max(5).default(3),
});

export const workspaceChecklistItemSchema = z.object({
  id: z.string().min(1),
  text: z.string().trim().max(240),
  completed: z.boolean().default(false),
});

export const workspaceTrackerEntrySchema = z.object({
  id: z.string().min(1),
  label: z.string().max(120).default(""),
  value: z.number().finite(),
  createdAt: isoTimestampSchema,
});

export const workspaceTableColumnSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().max(80),
});

export const workspaceTableRowSchema = z.object({
  id: z.string().min(1),
  cells: z.record(z.string(), z.string().max(4000)).default({}),
});

export const workspaceSwotCellsSchema = z.object({
  strengths: z.string().max(4000).default(""),
  weaknesses: z.string().max(4000).default(""),
  opportunities: z.string().max(4000).default(""),
  threats: z.string().max(4000).default(""),
});

export const workspaceHabitGridDaysSchema = z.object({
  mon: z.boolean().default(false),
  tue: z.boolean().default(false),
  wed: z.boolean().default(false),
  thu: z.boolean().default(false),
  fri: z.boolean().default(false),
  sat: z.boolean().default(false),
  sun: z.boolean().default(false),
});

export const workspaceHabitGridHabitSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().max(120),
  days: workspaceHabitGridDaysSchema,
});

export const workspaceProcessStepSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().max(160),
  completed: z.boolean().default(false),
  note: z.string().max(2000).default(""),
});

export const workspace2x2MatrixItemSchema = z.object({
  id: z.string().min(1),
  text: z.string().trim().max(200),
});

export const workspace2x2MatrixQuadrantSchema = z.object({
  name: z.string().trim().max(80),
  items: z.array(workspace2x2MatrixItemSchema).max(WORKSPACE_2X2_MATRIX_ITEM_LIMIT).default([]),
});

export const workspace2x2MatrixQuadrantsSchema = z.object({
  topLeft: workspace2x2MatrixQuadrantSchema,
  topRight: workspace2x2MatrixQuadrantSchema,
  bottomLeft: workspace2x2MatrixQuadrantSchema,
  bottomRight: workspace2x2MatrixQuadrantSchema,
});

export const workspaceTimeOrchestratorSettingsSchema = z.object({
  domains: z
    .array(workspaceTaskDomainSchema)
    .max(WORKSPACE_TASK_DOMAINS.length)
    .default([...WORKSPACE_TASK_DOMAINS]),
  includeUnassigned: z.boolean().default(true),
  quadrants: z
    .array(workspaceTaskQuadrantSchema)
    .max(WORKSPACE_TASK_QUADRANTS.length)
    .default([...WORKSPACE_TASK_QUADRANTS]),
});

export const workspaceKanbanColumnSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().max(80),
});

export const workspaceKanbanCardSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().max(240),
  description: z.string().max(4000).default(""),
  columnId: z.string().min(1),
  assignee: z.string().trim().max(120).default(""),
  dueDate: isoDateSchema.nullable().optional(),
});

export const workspaceSkillsHeatMapDimensionSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().max(80),
});

export const workspaceSkillsHeatMapScoresSchema = z
  .record(z.string(), z.number().int().min(1).max(10).default(5))
  .default({});

export const workspaceSkillsHeatMapMemberSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().max(120),
  role: z.string().trim().max(120).default(""),
  scores: workspaceSkillsHeatMapScoresSchema,
});

export const workspaceDelegationItemSchema = z.object({
  id: z.string().min(1),
  task: z.string().trim().max(160),
  from: z.string().trim().max(120).default(""),
  to: z.string().trim().max(120).default(""),
  hoursPerWeek: z.number().min(0).max(100).default(0),
  status: workspaceDelegationStatusSchema.default("stuck"),
});

export const workspaceDealScoringDealSchema = z.object({
  id: z.string().min(1),
  clientName: z.string().trim().max(120),
  valueEgp: z.number().min(0).max(1_000_000_000).default(0),
  temperature: workspaceSalesTemperatureSchema.default("warm"),
  score: z.number().int().min(0).max(100).default(50),
  stage: workspaceSalesPipelineStageSchema.default("lead"),
  nextAction: z.string().trim().max(240).default(""),
  dueDate: isoDateSchema.nullable().optional(),
});

export const workspacePipelineFunnelDealSchema = z.object({
  id: z.string().min(1),
  clientName: z.string().trim().max(120),
  valueEgp: z.number().min(0).max(1_000_000_000).default(0),
  temperature: workspaceSalesTemperatureSchema.default("warm"),
  stage: workspaceSalesPipelineStageSchema.default("lead"),
});

export const workspaceForecastConfidenceItemSchema = z.object({
  id: z.string().min(1),
  clientName: z.string().trim().max(120),
  valueEgp: z.number().min(0).max(1_000_000_000).default(0),
  bucket: workspaceSalesForecastBucketSchema.default("likely"),
  expectedCloseMonth: isoMonthSchema.nullable().optional(),
  confidence: z.number().int().min(10).max(100).default(50),
  owner: z.string().trim().max(120).default(""),
  nextAction: z.string().trim().max(240).default(""),
});

export const workspaceContentPipelineItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().max(240),
  status: workspaceContentPipelineStatusSchema.default("ideas"),
  platform: workspaceContentPlatformSchema.default("instagram"),
  assignee: z.string().trim().max(120).default(""),
});

export const workspaceContentQualityScoresSchema = z.object({
  hook: z.number().int().min(1).max(10).default(5),
  value: z.number().int().min(1).max(10).default(5),
  emotion: z.number().int().min(1).max(10).default(5),
  cta: z.number().int().min(1).max(10).default(5),
  platformFit: z.number().int().min(1).max(10).default(5),
  brand: z.number().int().min(1).max(10).default(5),
  shareability: z.number().int().min(1).max(10).default(5),
  scrollStop: z.number().int().min(1).max(10).default(5),
  authenticity: z.number().int().min(1).max(10).default(5),
  storytelling: z.number().int().min(1).max(10).default(5),
});

export const workspaceContentRoiItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().max(240),
  platform: workspaceContentPlatformSchema.default("linkedin"),
  campaign: z.string().trim().max(120).default(""),
  goal: z.string().trim().max(160).default(""),
  reach: z.number().int().min(0).max(10_000_000).default(0),
  leads: z.number().int().min(0).max(100_000).default(0),
  conversionInfluence: z.number().int().min(1).max(10).default(5),
  repurposeValue: z.number().int().min(1).max(10).default(5),
});

export const workspaceTalentGridMemberSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().max(120),
  role: z.string().trim().max(120).default(""),
  performance: z.number().int().min(1).max(5).default(3),
  potential: z.number().int().min(1).max(5).default(3),
});

export const workspaceSeatPlannerSeatSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().max(120),
  owner: z.string().trim().max(120).default(""),
  function: z.string().trim().max(120).default(""),
  health: workspaceSeatHealthSchema.default("strong"),
  load: workspaceSeatLoadLevelSchema.default("balanced"),
  backupOwner: z.string().trim().max(120).default(""),
  notes: z.string().max(2000).default(""),
});

export const workspaceTimelineMilestoneSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().max(160),
  date: isoDateSchema.nullable().optional(),
  status: workspaceTimelineMilestoneStatusSchema.default("planned"),
  note: z.string().max(2000).default(""),
});

export const workspaceScorecardMetricSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().max(120),
  value: z.number().finite().default(0),
  target: z.number().finite().default(100),
  unit: z.string().trim().max(24).default(""),
});

export const workspaceAuthorityScoreMetricValueSchema = z.object({
  value: z.number().int().min(0).max(1_000_000_000).default(0),
  target: z.number().int().min(1).max(1_000_000_000).default(1),
});

export const workspaceAuthorityScoreMetricsSchema = z.object({
  posts: workspaceAuthorityScoreMetricValueSchema.default({
    value: 0,
    target: 20,
  }),
  videos: workspaceAuthorityScoreMetricValueSchema.default({
    value: 0,
    target: 8,
  }),
  speakingGigs: workspaceAuthorityScoreMetricValueSchema.default({
    value: 0,
    target: 2,
  }),
  podcastAppearances: workspaceAuthorityScoreMetricValueSchema.default({
    value: 0,
    target: 2,
  }),
  mediaFeatures: workspaceAuthorityScoreMetricValueSchema.default({
    value: 0,
    target: 4,
  }),
  followers: workspaceAuthorityScoreMetricValueSchema.default({
    value: 0,
    target: 10_000,
  }),
});

export const workspaceHookBankItemSchema = z.object({
  id: z.string().min(1),
  category: z.string().trim().max(40).default(""),
  text: z.string().max(320).default(""),
  score: z.number().int().min(1).max(10).default(5),
});

export const workspaceMessageHousePillarSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().max(80),
  body: z.string().max(2000).default(""),
});

export const workspaceProfitabilityClientSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().max(120),
  paymentStatus: workspaceFinancePaymentStatusSchema.default("paid"),
  healthPercent: z.number().int().min(0).max(100).default(50),
  revenueEgp: z.number().min(0).max(1_000_000_000).default(0),
  costEgp: z.number().min(0).max(1_000_000_000).default(0),
});

export const workspaceExpenseItemSchema = z.object({
  id: z.string().min(1),
  category: z.string().trim().max(120),
  amountEgp: z.number().min(0).max(1_000_000_000).default(0),
});

export const workspaceReceivableInvoiceSchema = z.object({
  id: z.string().min(1),
  clientName: z.string().trim().max(120),
  amountEgp: z.number().min(0).max(1_000_000_000).default(0),
  dueDate: isoDateSchema.nullable().optional(),
  owner: z.string().trim().max(120).default(""),
  nextFollowUpDate: isoDateSchema.nullable().optional(),
  status: workspaceReceivableStatusSchema.default("due-soon"),
  notes: z.string().max(2000).default(""),
  paidAt: isoDateSchema.nullable().optional(),
});

export const workspaceCohortHealthCohortSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().max(120),
  seatsSold: z.number().int().min(0).max(10_000).default(0),
  capacity: z.number().int().min(1).max(10_000).default(25),
  revenueEgp: z.number().min(0).max(1_000_000_000).default(0),
  startDate: isoDateSchema.nullable().optional(),
  status: workspaceCohortStatusSchema.default("planning"),
  refundRisk: z.boolean().default(false),
  completionRisk: z.boolean().default(false),
});

export const workspaceLeadershipRhythmMeetingSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().max(120),
  rhythm: workspaceLeadershipRhythmSchema.default("weekly"),
  owner: z.string().trim().max(120).default(""),
  participants: z.string().trim().max(240).default(""),
  purpose: z.string().max(4000).default(""),
  durationMinutes: z.number().int().min(15).max(480).default(60),
  nextDate: isoDateSchema.nullable().optional(),
  status: workspaceLeadershipMeetingStatusSchema.default("scheduled"),
});

export const workspaceOkrKeyResultSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().max(160),
  progress: z.number().int().min(0).max(100).default(0),
});

export const workspaceOkrObjectiveSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().max(160),
  keyResults: z.array(workspaceOkrKeyResultSchema).max(WORKSPACE_OKR_KEY_RESULT_LIMIT).default([]),
});

export const workspaceDecisionMatrixCriterionSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().max(120),
  weight: z.number().int().min(1).max(10).default(5),
});

export const workspaceDecisionMatrixOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().max(80),
  scores: z.record(z.string(), z.number().int().min(0).max(10)).default({}),
});

export const workspaceBusinessModelCanvasCellKeySchema = z.enum(
  WORKSPACE_BUSINESS_MODEL_CANVAS_CELL_KEYS,
);

export const workspaceBusinessModelCanvasCellsSchema = z.object({
  keyPartners: z.string().max(4000).default(""),
  keyActivities: z.string().max(4000).default(""),
  keyResources: z.string().max(4000).default(""),
  valuePropositions: z.string().max(4000).default(""),
  customerRelationships: z.string().max(4000).default(""),
  channels: z.string().max(4000).default(""),
  customerSegments: z.string().max(4000).default(""),
  costStructure: z.string().max(4000).default(""),
  revenueStreams: z.string().max(4000).default(""),
});

export const workspaceStrategicAssumptionStatusSchema = z.enum(
  WORKSPACE_STRATEGIC_ASSUMPTION_STATUSES,
);

export const workspaceStrategicAssumptionLinkTypeSchema = z.enum(
  WORKSPACE_STRATEGIC_ASSUMPTION_LINK_TYPES,
);

export const workspaceStrategicAssumptionFilterSchema = z.enum(
  WORKSPACE_STRATEGIC_ASSUMPTION_FILTERS,
);

export const workspaceStrategicAssumptionSchema = z.object({
  id: z.string().min(1),
  statement: z.string().trim().max(240),
  linkType: workspaceStrategicAssumptionLinkTypeSchema.default("none"),
  linkId: z.string().nullable().optional(),
  owner: z.string().trim().max(120).default(""),
  reviewDate: isoDateSchema.nullable().optional(),
  confidence: z.number().int().min(1).max(5).default(3),
  status: workspaceStrategicAssumptionStatusSchema.default("validating"),
  evidenceNotes: z.string().max(4000).default(""),
});

export const workspaceCustomBlockFieldSchema = z.object({
  id: z.string().min(1),
  key: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().trim().min(1).max(80),
  type: workspaceCustomFieldTypeSchema,
});

export const workspaceCustomBlockFormulaSchema = z.object({
  label: z.string().trim().min(1).max(80),
  expression: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-zA-Z0-9_+\-*/().\s]+$/),
});

export const workspaceCustomBlockTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  fields: z.array(workspaceCustomBlockFieldSchema).min(1).max(WORKSPACE_CUSTOM_BLOCK_FIELD_LIMIT),
  includeNotes: z.boolean().default(false),
  formula: workspaceCustomBlockFormulaSchema.nullable().optional(),
  aiPromptTemplate: z.string().max(2000).nullable().optional(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});

export const workspaceCustomBlockValueSchema = z.union([
  z.string().max(4000),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

const workspaceBlockBaseSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().max(120),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});

export const workspaceTaskListBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("task-list"),
  tasks: z.array(workspaceTaskSchema).max(WORKSPACE_TASK_LIMIT).default([]),
});

export const workspaceNotesBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("notes"),
  body: z.string().max(20000).default(""),
});

export const workspaceTableBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("table"),
  columns: z.array(workspaceTableColumnSchema).min(1).max(WORKSPACE_TABLE_COLUMN_LIMIT),
  rows: z.array(workspaceTableRowSchema).max(WORKSPACE_TABLE_ROW_LIMIT).default([]),
});

export const workspaceChecklistBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("checklist"),
  items: z.array(workspaceChecklistItemSchema).max(WORKSPACE_CHECKLIST_ITEM_LIMIT).default([]),
});

export const workspaceDecisionBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("decision"),
  pros: z.array(workspaceDecisionItemSchema).max(30).default([]),
  cons: z.array(workspaceDecisionItemSchema).max(30).default([]),
  recommendation: z.string().max(4000).default(""),
});

export const workspaceProsConsBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("pros-cons"),
  pros: z.array(workspaceDecisionItemSchema).max(WORKSPACE_PROS_CONS_ITEM_LIMIT).default([]),
  cons: z.array(workspaceDecisionItemSchema).max(WORKSPACE_PROS_CONS_ITEM_LIMIT).default([]),
});

export const workspaceSwotBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("swot"),
  cells: workspaceSwotCellsSchema.default({
    strengths: "",
    weaknesses: "",
    opportunities: "",
    threats: "",
  }),
});

export const workspaceTrackerBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("tracker"),
  goal: z.number().finite().nullable().optional(),
  entries: z.array(workspaceTrackerEntrySchema).max(60).default([]),
});

export const workspaceAiPromptBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("ai-prompt"),
  includeContext: z.boolean().default(true),
  prompt: z.string().max(4000).default(""),
  latestOutput: z.string().max(12000).default(""),
  outputHistory: z.array(workspacePromptOutputSchema).max(20).default([]),
});

export const workspaceHabitGridBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("habit-grid"),
  habits: z.array(workspaceHabitGridHabitSchema).max(WORKSPACE_HABIT_GRID_HABIT_LIMIT).default([]),
});

export const workspaceProcessBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("process"),
  steps: z.array(workspaceProcessStepSchema).max(WORKSPACE_PROCESS_STEP_LIMIT).default([]),
});

export const workspace2x2MatrixBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("2x2-matrix"),
  xAxisLabel: z.string().trim().max(80).default("Effort"),
  xStartLabel: z.string().trim().max(60).default("Low"),
  xEndLabel: z.string().trim().max(60).default("High"),
  yAxisLabel: z.string().trim().max(80).default("Impact"),
  yStartLabel: z.string().trim().max(60).default("Low"),
  yEndLabel: z.string().trim().max(60).default("High"),
  quadrants: workspace2x2MatrixQuadrantsSchema.default({
    topLeft: {
      name: "Quick wins",
      items: [],
    },
    topRight: {
      name: "Major bets",
      items: [],
    },
    bottomLeft: {
      name: "Fill-ins",
      items: [],
    },
    bottomRight: {
      name: "Avoid",
      items: [],
    },
  }),
});

export const workspaceCourseRoadmapBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("course-roadmap"),
  courses: z
    .array(workspaceCourseRoadmapCourseSchema)
    .max(WORKSPACE_COURSE_ROADMAP_COURSE_LIMIT)
    .default([]),
});

export const workspaceLearningOutcomesMatrixBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("learning-outcomes-matrix"),
  courseBlockId: z.string().nullable().optional(),
  courseId: z.string().nullable().optional(),
  prompt: z.string().max(4000).default(""),
  latestOutput: z.string().max(12000).default(""),
  outputHistory: z.array(workspacePromptOutputSchema).max(20).default([]),
});

export const workspaceTimeOrchestratorBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("time-orchestrator"),
  settings: workspaceTimeOrchestratorSettingsSchema.default({
    domains: [...WORKSPACE_TASK_DOMAINS],
    includeUnassigned: true,
    quadrants: [...WORKSPACE_TASK_QUADRANTS],
  }),
});

export const workspaceCohortHealthDashboardBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("cohort-health-dashboard"),
  cohorts: z.array(workspaceCohortHealthCohortSchema).max(WORKSPACE_COHORT_LIMIT).default([]),
});

export const workspaceEisenhowerMatrixBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("eisenhower-matrix"),
  tasks: z.array(workspaceTaskSchema).max(WORKSPACE_TASK_LIMIT).default([]),
  settings: workspaceTimeOrchestratorSettingsSchema.default({
    domains: [...WORKSPACE_TASK_DOMAINS],
    includeUnassigned: true,
    quadrants: [...WORKSPACE_TASK_QUADRANTS],
  }),
  latestBattlePlan: z.string().max(12000).default(""),
  battlePlanUpdatedAt: isoTimestampSchema.nullable().optional(),
});

export const workspaceLeadershipRhythmPlannerBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("leadership-rhythm-planner"),
  filter: workspaceLeadershipRhythmFilterSchema.default("all"),
  meetings: z
    .array(workspaceLeadershipRhythmMeetingSchema)
    .max(WORKSPACE_LEADERSHIP_MEETING_LIMIT)
    .default([]),
});

export const workspaceKanbanBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("kanban"),
  columns: z.array(workspaceKanbanColumnSchema).min(1).max(WORKSPACE_KANBAN_COLUMN_LIMIT),
  cards: z.array(workspaceKanbanCardSchema).max(WORKSPACE_KANBAN_CARD_LIMIT),
});

export const workspaceTimelineBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("timeline"),
  milestones: z
    .array(workspaceTimelineMilestoneSchema)
    .max(WORKSPACE_TIMELINE_MILESTONE_LIMIT)
    .default([]),
});

export const workspaceSkillsHeatMapBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("skills-heat-map"),
  dimensions: z
    .array(workspaceSkillsHeatMapDimensionSchema)
    .max(WORKSPACE_SKILLS_HEAT_MAP_DIMENSIONS_LIMIT)
    .default([]),
  members: z
    .array(workspaceSkillsHeatMapMemberSchema)
    .max(WORKSPACE_SKILLS_HEAT_MAP_MEMBER_LIMIT)
    .default([]),
});

export const workspaceDelegationMatrixBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("delegation-matrix"),
  hourlyRate: z.number().min(0).max(100000).default(500),
  items: z.array(workspaceDelegationItemSchema).max(WORKSPACE_DELEGATION_ITEM_LIMIT).default([]),
});

export const workspaceTalentGridBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("talent-grid"),
  members: z
    .array(workspaceTalentGridMemberSchema)
    .max(WORKSPACE_TALENT_GRID_MEMBER_LIMIT)
    .default([]),
});

export const workspaceSeatPlannerBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("seat-planner"),
  filter: workspaceSeatPlannerFilterSchema.default("all"),
  seats: z.array(workspaceSeatPlannerSeatSchema).max(WORKSPACE_SEAT_PLANNER_SEAT_LIMIT).default([]),
});

export const workspaceDealScoringMatrixBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("deal-scoring-matrix"),
  deals: z.array(workspaceDealScoringDealSchema).max(WORKSPACE_DEAL_SCORING_DEAL_LIMIT).default([]),
});

export const workspacePipelineFunnelBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("pipeline-funnel"),
  deals: z
    .array(workspacePipelineFunnelDealSchema)
    .max(WORKSPACE_PIPELINE_FUNNEL_DEAL_LIMIT)
    .default([]),
});

export const workspaceForecastConfidenceBoardBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("forecast-confidence-board"),
  targetRevenueEgp: z.number().min(0).max(1_000_000_000).default(50_000),
  deals: z
    .array(workspaceForecastConfidenceItemSchema)
    .max(WORKSPACE_FORECAST_CONFIDENCE_ITEM_LIMIT)
    .default([]),
});

export const workspaceContentPipelineBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("content-pipeline"),
  items: z
    .array(workspaceContentPipelineItemSchema)
    .max(WORKSPACE_CONTENT_PIPELINE_ITEM_LIMIT)
    .default([]),
});

export const workspaceContentQualityRadarBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("content-quality-radar"),
  scores: workspaceContentQualityScoresSchema.default({
    hook: 5,
    value: 5,
    emotion: 5,
    cta: 5,
    platformFit: 5,
    brand: 5,
    shareability: 5,
    scrollStop: 5,
    authenticity: 5,
    storytelling: 5,
  }),
});

export const workspaceContentRoiTrackerBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("content-roi-tracker"),
  sortBy: workspaceContentRoiSortSchema.default("roi"),
  items: z.array(workspaceContentRoiItemSchema).max(WORKSPACE_CONTENT_ROI_ITEM_LIMIT).default([]),
});

export const workspaceAuthorityScorecardBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("authority-scorecard"),
  metrics: workspaceAuthorityScoreMetricsSchema.default({
    posts: {
      value: 0,
      target: 20,
    },
    videos: {
      value: 0,
      target: 8,
    },
    speakingGigs: {
      value: 0,
      target: 2,
    },
    podcastAppearances: {
      value: 0,
      target: 2,
    },
    mediaFeatures: {
      value: 0,
      target: 4,
    },
    followers: {
      value: 0,
      target: 10_000,
    },
  }),
});

export const workspaceHookBankBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("hook-bank"),
  hooks: z.array(workspaceHookBankItemSchema).max(WORKSPACE_HOOK_BANK_ITEM_LIMIT).default([]),
  lastGeneratedAt: isoTimestampSchema.nullable().optional(),
});

export const workspaceMessageHouseBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("message-house"),
  brandPromise: z.string().max(4000).default(""),
  pillars: z.array(workspaceMessageHousePillarSchema).length(3),
  audiencePains: z.string().max(4000).default(""),
  proofPoints: z.string().max(4000).default(""),
  voicePrinciples: z.string().max(4000).default(""),
  latestStressTest: z.string().max(12000).default(""),
  stressTestUpdatedAt: isoTimestampSchema.nullable().optional(),
});

export const workspaceScorecardBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("scorecard"),
  metrics: z
    .array(workspaceScorecardMetricSchema)
    .max(WORKSPACE_SCORECARD_METRIC_LIMIT)
    .default([]),
});

export const workspaceOkrTrackerBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("okr-tracker"),
  objectives: z.array(workspaceOkrObjectiveSchema).max(WORKSPACE_OKR_OBJECTIVE_LIMIT).default([]),
});

export const workspaceDecisionMatrixBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("decision-matrix"),
  question: z.string().max(240).default(""),
  criteria: z
    .array(workspaceDecisionMatrixCriterionSchema)
    .min(1)
    .max(WORKSPACE_DECISION_MATRIX_CRITERIA_LIMIT),
  options: z
    .array(workspaceDecisionMatrixOptionSchema)
    .min(1)
    .max(WORKSPACE_DECISION_MATRIX_OPTION_LIMIT),
});

export const workspaceBusinessModelCanvasBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("business-model-canvas"),
  cells: workspaceBusinessModelCanvasCellsSchema.default({
    keyPartners: "",
    keyActivities: "",
    keyResources: "",
    valuePropositions: "",
    customerRelationships: "",
    channels: "",
    customerSegments: "",
    costStructure: "",
    revenueStreams: "",
  }),
  analysis: z.string().max(6000).default(""),
  analysisUpdatedAt: isoTimestampSchema.nullable().optional(),
});

export const workspaceAssumptionTrackerBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("assumption-tracker"),
  filter: workspaceStrategicAssumptionFilterSchema.default("all"),
  assumptions: z
    .array(workspaceStrategicAssumptionSchema)
    .max(WORKSPACE_ASSUMPTION_LIMIT)
    .default([]),
});

export const workspaceProfitabilityCashFlowBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("profitability-cash-flow"),
  clients: z
    .array(workspaceProfitabilityClientSchema)
    .max(WORKSPACE_PROFITABILITY_CLIENT_LIMIT)
    .default([]),
  expenses: z.array(workspaceExpenseItemSchema).max(WORKSPACE_EXPENSE_ITEM_LIMIT).default([]),
});

export const workspacePricingSimulatorBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("pricing-simulator"),
  activeClients: z.number().int().min(1).max(50).default(4),
  hoursPerClientPerMonth: z.number().int().min(5).max(100).default(24),
  hourlyRateEgp: z.number().int().min(100).max(2_000).default(650),
  monthlyOverheadEgp: z.number().int().min(10_000).max(200_000).default(85_000),
  targetMarginPercent: z.number().int().min(10).max(80).default(35),
});

export const workspaceCollectionsTrackerBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("collections-tracker"),
  filter: workspaceReceivableFilterSchema.default("all"),
  invoices: z
    .array(workspaceReceivableInvoiceSchema)
    .max(WORKSPACE_RECEIVABLE_INVOICE_LIMIT)
    .default([]),
});

export const workspaceCustomBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("custom"),
  definitionId: z.string().min(1),
  values: z.record(z.string(), workspaceCustomBlockValueSchema).default({}),
  notes: z.string().max(4000).default(""),
  latestAiOutput: z.string().max(12000).default(""),
  outputHistory: z.array(workspacePromptOutputSchema).max(20).default([]),
});

export const workspaceBlockSchema = z.discriminatedUnion("type", [
  workspaceTaskListBlockSchema,
  workspaceNotesBlockSchema,
  workspaceTableBlockSchema,
  workspaceChecklistBlockSchema,
  workspaceDecisionBlockSchema,
  workspaceProsConsBlockSchema,
  workspaceSwotBlockSchema,
  workspaceTrackerBlockSchema,
  workspaceAiPromptBlockSchema,
  workspaceHabitGridBlockSchema,
  workspaceProcessBlockSchema,
  workspace2x2MatrixBlockSchema,
  workspaceCourseRoadmapBlockSchema,
  workspaceLearningOutcomesMatrixBlockSchema,
  workspaceTimeOrchestratorBlockSchema,
  workspaceCohortHealthDashboardBlockSchema,
  workspaceEisenhowerMatrixBlockSchema,
  workspaceLeadershipRhythmPlannerBlockSchema,
  workspaceKanbanBlockSchema,
  workspaceTimelineBlockSchema,
  workspaceSkillsHeatMapBlockSchema,
  workspaceDelegationMatrixBlockSchema,
  workspaceTalentGridBlockSchema,
  workspaceSeatPlannerBlockSchema,
  workspaceDealScoringMatrixBlockSchema,
  workspacePipelineFunnelBlockSchema,
  workspaceForecastConfidenceBoardBlockSchema,
  workspaceContentPipelineBlockSchema,
  workspaceContentQualityRadarBlockSchema,
  workspaceContentRoiTrackerBlockSchema,
  workspaceAuthorityScorecardBlockSchema,
  workspaceHookBankBlockSchema,
  workspaceMessageHouseBlockSchema,
  workspaceScorecardBlockSchema,
  workspaceOkrTrackerBlockSchema,
  workspaceDecisionMatrixBlockSchema,
  workspaceBusinessModelCanvasBlockSchema,
  workspaceAssumptionTrackerBlockSchema,
  workspaceProfitabilityCashFlowBlockSchema,
  workspacePricingSimulatorBlockSchema,
  workspaceCollectionsTrackerBlockSchema,
  workspaceCustomBlockSchema,
]);

export const workspaceNodeTabSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().max(80),
  blocks: z.array(workspaceBlockSchema).max(WORKSPACE_TAB_BLOCK_LIMIT).default([]),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});

export const workspaceNodeViewStateSchema = z.object({
  activeTabId: z.string().min(1).nullable().optional(),
  notePreviewState: z.record(z.string(), z.boolean()).default({}),
});

export const workspaceNodeConnectionSchema = z.object({
  targetNodeId: z.string().min(1),
});

export const workspaceNodeDashboardFeaturedBlockSchema = z.object({
  tabId: z.string().min(1),
  blockId: z.string().min(1),
});

export const workspaceNodeDashboardSchema = z.object({
  tint: workspaceNodeTintSchema.default("neutral"),
  featuredBlocks: z
    .array(workspaceNodeDashboardFeaturedBlockSchema)
    .max(WORKSPACE_NODE_DASHBOARD_DETAIL_LIMIT)
    .default([]),
});

export const workspaceAgencyRefSchema = z.object({
  teamId: z.string().min(1),
  projectId: z.string().min(1).optional(),
  taskId: z.string().min(1).optional(),
});

export const workspaceNodeSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().trim().min(1).max(120),
    content: z.string().max(4000).default(""),
    nodeType: workspaceNodeTypeSchema.default("standard"),
    ownerUserId: z.string().min(1).nullable().optional(),
    visibility: workspaceNodeVisibilitySchema.default("private"),
    teamId: z.string().min(1).nullable().optional(),
    agencyRef: workspaceAgencyRefSchema.nullable().optional(),
    x: z.number().finite(),
    y: z.number().finite(),
    width: z.number().positive(),
    height: z.number().positive(),
    label: z.string().max(120).optional(),
    minWidth: z.number().positive().optional(),
    minHeight: z.number().positive().optional(),
    createdAt: isoTimestampSchema,
    updatedAt: isoTimestampSchema,
    tabs: z.array(workspaceNodeTabSchema).max(WORKSPACE_NODE_TAB_LIMIT).default([]),
    customBlockTemplates: z
      .array(workspaceCustomBlockTemplateSchema)
      .max(WORKSPACE_CUSTOM_BLOCK_TEMPLATE_LIMIT)
      .default([]),
    connections: z
      .array(workspaceNodeConnectionSchema)
      .max(WORKSPACE_NODE_CONNECTION_LIMIT)
      .default([]),
    viewState: workspaceNodeViewStateSchema.default({
      activeTabId: null,
      notePreviewState: {},
    }),
    dashboard: workspaceNodeDashboardSchema.default({
      tint: "neutral",
      featuredBlocks: [],
    }),
  })
  .superRefine((node, ctx) => {
    if (!node.agencyRef) return;
    if (node.visibility !== "team") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["agencyRef"],
        message: "agencyRef is only valid on team-visible nodes",
      });
    }
    if (!node.teamId || node.teamId !== node.agencyRef.teamId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["agencyRef", "teamId"],
        message: "agencyRef.teamId must match the node teamId",
      });
    }
  });

export const workspaceSaveInputSchema = z.object({
  canvasWorkspaceId: z.string().min(1),
  nodes: z.array(workspaceNodeSchema).max(WORKSPACE_NODE_LIMIT),
});

export const workspaceMarketplacePayloadSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("node"),
    node: workspaceNodeSchema,
  }),
  z.object({
    kind: z.literal("tab"),
    tab: workspaceNodeTabSchema,
    customBlockTemplates: z
      .array(workspaceCustomBlockTemplateSchema)
      .max(WORKSPACE_CUSTOM_BLOCK_TEMPLATE_LIMIT)
      .default([]),
  }),
  z.object({
    kind: z.literal("block"),
    block: workspaceBlockSchema,
    customBlockTemplates: z
      .array(workspaceCustomBlockTemplateSchema)
      .max(WORKSPACE_CUSTOM_BLOCK_TEMPLATE_LIMIT)
      .default([]),
  }),
]);

export const workspaceMarketplaceItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().max(240).default(""),
  payload: workspaceMarketplacePayloadSchema,
  createdByUserId: z.string().min(1).nullable().optional(),
  createdByName: z.string().trim().min(1).max(120).default("Unknown"),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});

export const workspaceMarketplaceSaveInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().max(240).optional(),
  payload: workspaceMarketplacePayloadSchema,
});

export const workspaceMarketplaceListSchema = z.object({
  items: z.array(workspaceMarketplaceItemSchema).max(WORKSPACE_MARKETPLACE_ITEM_LIMIT).default([]),
});

export const workspaceMarketplaceListInputSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(50).default(20),
  kind: z.enum(["all", "node", "tab", "block"]).default("all"),
  search: z.string().max(120).optional(),
});

export const workspaceMarketplaceListOutputSchema = z.object({
  items: z.array(workspaceMarketplaceItemSchema),
  nextCursor: z.string().nullable(),
});
