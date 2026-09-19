import { assertNever } from "@orch/config/assert-never";
import {
  DEFAULT_WORKSPACE_NODE_HEIGHT,
  DEFAULT_WORKSPACE_NODE_MIN_HEIGHT,
  DEFAULT_WORKSPACE_NODE_MIN_WIDTH,
  DEFAULT_WORKSPACE_NODE_WIDTH,
} from "./constants";
import { createWorkspaceContentQualityScoreMap } from "./content";
import { createWorkspaceSkillsScoreMap } from "./people";
import {
  workspace2x2MatrixBlockSchema,
  workspace2x2MatrixItemSchema,
  workspace2x2MatrixQuadrantSchema,
  workspace2x2MatrixQuadrantsSchema,
  workspaceAiPromptBlockSchema,
  workspaceAssumptionTrackerBlockSchema,
  workspaceAuthorityScoreMetricsSchema,
  workspaceAuthorityScorecardBlockSchema,
  workspaceBlockSchema,
  workspaceBusinessModelCanvasBlockSchema,
  workspaceChecklistBlockSchema,
  workspaceChecklistItemSchema,
  workspaceCohortHealthCohortSchema,
  workspaceCohortHealthDashboardBlockSchema,
  workspaceCollectionsTrackerBlockSchema,
  workspaceContentPipelineBlockSchema,
  workspaceContentPipelineItemSchema,
  workspaceContentQualityRadarBlockSchema,
  workspaceContentQualityScoresSchema,
  workspaceContentRoiItemSchema,
  workspaceContentRoiTrackerBlockSchema,
  workspaceCourseRoadmapBlockSchema,
  workspaceCourseRoadmapCourseSchema,
  workspaceCourseRoadmapLessonSchema,
  workspaceCourseRoadmapOutcomeSchema,
  workspaceCustomBlockSchema,
  workspaceCustomBlockTemplateSchema,
  workspaceDealScoringDealSchema,
  workspaceDealScoringMatrixBlockSchema,
  workspaceDecisionBlockSchema,
  workspaceDecisionItemSchema,
  workspaceDecisionMatrixBlockSchema,
  workspaceDecisionMatrixCriterionSchema,
  workspaceDecisionMatrixOptionSchema,
  workspaceDelegationItemSchema,
  workspaceDelegationMatrixBlockSchema,
  workspaceEisenhowerMatrixBlockSchema,
  workspaceExpenseItemSchema,
  workspaceForecastConfidenceBoardBlockSchema,
  workspaceForecastConfidenceItemSchema,
  workspaceHabitGridBlockSchema,
  workspaceHabitGridDaysSchema,
  workspaceHabitGridHabitSchema,
  workspaceHookBankBlockSchema,
  workspaceHookBankItemSchema,
  workspaceKanbanBlockSchema,
  workspaceKanbanCardSchema,
  workspaceKanbanColumnSchema,
  workspaceLeadershipRhythmMeetingSchema,
  workspaceLeadershipRhythmPlannerBlockSchema,
  workspaceLearningOutcomesMatrixBlockSchema,
  workspaceMessageHouseBlockSchema,
  workspaceMessageHousePillarSchema,
  workspaceNodeConnectionSchema,
  workspaceNodeDashboardSchema,
  workspaceNodeSchema,
  workspaceNodeTabSchema,
  workspaceNodeViewStateSchema,
  workspaceNotesBlockSchema,
  workspaceOkrKeyResultSchema,
  workspaceOkrObjectiveSchema,
  workspaceOkrTrackerBlockSchema,
  workspacePipelineFunnelBlockSchema,
  workspacePipelineFunnelDealSchema,
  workspacePricingSimulatorBlockSchema,
  workspaceProcessBlockSchema,
  workspaceProcessStepSchema,
  workspaceProfitabilityCashFlowBlockSchema,
  workspaceProfitabilityClientSchema,
  workspacePromptOutputSchema,
  workspaceProsConsBlockSchema,
  workspaceReceivableInvoiceSchema,
  workspaceScorecardBlockSchema,
  workspaceScorecardMetricSchema,
  workspaceSeatPlannerBlockSchema,
  workspaceSeatPlannerSeatSchema,
  workspaceSkillsHeatMapBlockSchema,
  workspaceSkillsHeatMapDimensionSchema,
  workspaceSkillsHeatMapMemberSchema,
  workspaceStrategicAssumptionSchema,
  workspaceSwotBlockSchema,
  workspaceSwotCellsSchema,
  workspaceTableBlockSchema,
  workspaceTableColumnSchema,
  workspaceTableRowSchema,
  workspaceTalentGridBlockSchema,
  workspaceTalentGridMemberSchema,
  workspaceTaskListBlockSchema,
  workspaceTaskSchema,
  workspaceTimeOrchestratorBlockSchema,
  workspaceTimelineBlockSchema,
  workspaceTimelineMilestoneSchema,
  workspaceTrackerBlockSchema,
} from "./schemas";
import { getNowIsoString } from "./shared";
import {
  createWorkspaceLeadershipRhythmFilter,
  createWorkspaceTimeOrchestratorSettings,
} from "./tasks";
import type {
  Workspace2x2MatrixBlock,
  Workspace2x2MatrixItem,
  Workspace2x2MatrixQuadrant,
  Workspace2x2MatrixQuadrants,
  WorkspaceAiPromptBlock,
  WorkspaceAssumptionTrackerBlock,
  WorkspaceAuthorityScoreMetrics,
  WorkspaceAuthorityScorecardBlock,
  WorkspaceBlock,
  WorkspaceBusinessModelCanvasBlock,
  WorkspaceChecklistBlock,
  WorkspaceChecklistItem,
  WorkspaceCohortHealthCohort,
  WorkspaceCohortHealthDashboardBlock,
  WorkspaceCollectionsTrackerBlock,
  WorkspaceContentPipelineBlock,
  WorkspaceContentPipelineItem,
  WorkspaceContentQualityRadarBlock,
  WorkspaceContentQualityScores,
  WorkspaceContentRoiItem,
  WorkspaceContentRoiTrackerBlock,
  WorkspaceCourseRoadmapBlock,
  WorkspaceCourseRoadmapCourse,
  WorkspaceCourseRoadmapLesson,
  WorkspaceCourseRoadmapOutcome,
  WorkspaceCustomBlock,
  WorkspaceCustomBlockField,
  WorkspaceCustomBlockTemplate,
  WorkspaceDealScoringDeal,
  WorkspaceDealScoringMatrixBlock,
  WorkspaceDecisionBlock,
  WorkspaceDecisionItem,
  WorkspaceDecisionMatrixBlock,
  WorkspaceDecisionMatrixCriterion,
  WorkspaceDecisionMatrixOption,
  WorkspaceDelegationItem,
  WorkspaceDelegationMatrixBlock,
  WorkspaceEisenhowerMatrixBlock,
  WorkspaceExpenseItem,
  WorkspaceForecastConfidenceBoardBlock,
  WorkspaceForecastConfidenceItem,
  WorkspaceHabitGridBlock,
  WorkspaceHabitGridDays,
  WorkspaceHabitGridHabit,
  WorkspaceHookBankBlock,
  WorkspaceHookBankItem,
  WorkspaceKanbanBlock,
  WorkspaceKanbanCard,
  WorkspaceKanbanColumn,
  WorkspaceLeadershipRhythmMeeting,
  WorkspaceLeadershipRhythmPlannerBlock,
  WorkspaceLearningOutcomesMatrixBlock,
  WorkspaceMessageHouseBlock,
  WorkspaceMessageHousePillar,
  WorkspaceNode,
  WorkspaceNodeConnection,
  WorkspaceNodeDashboard,
  WorkspaceNodeTab,
  WorkspaceNodeViewState,
  WorkspaceNotesBlock,
  WorkspaceOkrKeyResult,
  WorkspaceOkrObjective,
  WorkspaceOkrTrackerBlock,
  WorkspacePipelineFunnelBlock,
  WorkspacePipelineFunnelDeal,
  WorkspacePricingSimulatorBlock,
  WorkspaceProcessBlock,
  WorkspaceProcessStep,
  WorkspaceProfitabilityCashFlowBlock,
  WorkspaceProfitabilityClient,
  WorkspacePromptOutput,
  WorkspaceProsConsBlock,
  WorkspaceReceivableInvoice,
  WorkspaceScorecardBlock,
  WorkspaceScorecardMetric,
  WorkspaceSeatPlannerBlock,
  WorkspaceSeatPlannerSeat,
  WorkspaceSkillsHeatMapBlock,
  WorkspaceSkillsHeatMapDimension,
  WorkspaceSkillsHeatMapMember,
  WorkspaceStrategicAssumption,
  WorkspaceSwotBlock,
  WorkspaceSwotCells,
  WorkspaceTableBlock,
  WorkspaceTableColumn,
  WorkspaceTableRow,
  WorkspaceTalentGridBlock,
  WorkspaceTalentGridMember,
  WorkspaceTask,
  WorkspaceTaskListBlock,
  WorkspaceTimeOrchestratorBlock,
  WorkspaceTimelineBlock,
  WorkspaceTimelineMilestone,
  WorkspaceTrackerBlock,
} from "./types";

export * from "./block-categories";
export * from "./brand";
export * from "./constants";
export * from "./content";
export * from "./dashboard";
export * from "./education";
export * from "./finance";
export * from "./general";
export * from "./people";
export * from "./sales";
export * from "./schemas";
export * from "./knowledge";
export * from "./strategy";
export * from "./tasks";
export * from "./types";

export function createWorkspaceId(prefix = "item") {
  const randomUuid = globalThis.crypto?.randomUUID?.();

  if (randomUuid) {
    return `${prefix}-${randomUuid}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function legacyCanvasWorkspaceId(userId: string) {
  return `cws-legacy-${userId}`;
}

export function createWorkspaceTask(partial: Partial<WorkspaceTask> = {}): WorkspaceTask {
  return workspaceTaskSchema.parse({
    id: partial.id ?? createWorkspaceId("task"),
    text: partial.text ?? "New task",
    completed: partial.completed ?? false,
    dueDate: partial.dueDate ?? null,
    priority: partial.priority ?? "medium",
    domain: partial.domain ?? null,
    urgency: partial.urgency ?? 5,
    importance: partial.importance ?? 5,
    estimateMinutes: partial.estimateMinutes ?? 30,
  });
}

export function createWorkspaceChecklistItem(
  partial: Partial<WorkspaceChecklistItem> = {},
): WorkspaceChecklistItem {
  return workspaceChecklistItemSchema.parse({
    id: partial.id ?? createWorkspaceId("checklist"),
    text: partial.text ?? "Checklist item",
    completed: partial.completed ?? false,
  });
}

export function createWorkspaceTableColumn(
  partial: Partial<WorkspaceTableColumn> = {},
): WorkspaceTableColumn {
  return workspaceTableColumnSchema.parse({
    id: partial.id ?? createWorkspaceId("column"),
    label: partial.label ?? "Column",
  });
}

function createWorkspaceTableCellMap(
  columns: Array<Pick<WorkspaceTableColumn, "id"> | string>,
  cells: Record<string, string> | undefined,
) {
  return Object.fromEntries(
    columns.map((column) => {
      const columnId = typeof column === "string" ? column : column.id;
      return [columnId, cells?.[columnId] ?? ""];
    }),
  );
}

export function createWorkspaceTableRow(
  partial: Partial<WorkspaceTableRow> = {},
  columns: Array<Pick<WorkspaceTableColumn, "id"> | string> = [],
): WorkspaceTableRow {
  return workspaceTableRowSchema.parse({
    id: partial.id ?? createWorkspaceId("row"),
    cells: createWorkspaceTableCellMap(columns, partial.cells),
  });
}

function createWorkspaceSwotCells(partial: Partial<WorkspaceSwotCells> = {}): WorkspaceSwotCells {
  return workspaceSwotCellsSchema.parse({
    strengths: partial.strengths ?? "",
    weaknesses: partial.weaknesses ?? "",
    opportunities: partial.opportunities ?? "",
    threats: partial.threats ?? "",
  });
}

export function createWorkspaceProsConsItem(
  partial: Partial<WorkspaceDecisionItem> = {},
): WorkspaceDecisionItem {
  return workspaceDecisionItemSchema.parse({
    id: partial.id ?? createWorkspaceId("pros-cons"),
    text: partial.text ?? "Point",
    weight: partial.weight ?? 3,
  });
}

export function createWorkspaceHabitGridDays(
  partial: Partial<WorkspaceHabitGridDays> = {},
): WorkspaceHabitGridDays {
  return workspaceHabitGridDaysSchema.parse({
    mon: partial.mon ?? false,
    tue: partial.tue ?? false,
    wed: partial.wed ?? false,
    thu: partial.thu ?? false,
    fri: partial.fri ?? false,
    sat: partial.sat ?? false,
    sun: partial.sun ?? false,
  });
}

export function createWorkspaceHabitGridHabit(
  partial: Partial<WorkspaceHabitGridHabit> = {},
): WorkspaceHabitGridHabit {
  return workspaceHabitGridHabitSchema.parse({
    id: partial.id ?? createWorkspaceId("habit"),
    name: partial.name ?? "Habit",
    days: createWorkspaceHabitGridDays(partial.days),
  });
}

export function createWorkspaceProcessStep(
  partial: Partial<WorkspaceProcessStep> = {},
): WorkspaceProcessStep {
  return workspaceProcessStepSchema.parse({
    id: partial.id ?? createWorkspaceId("step"),
    title: partial.title ?? "Step",
    completed: partial.completed ?? false,
    note: partial.note ?? "",
  });
}

export function createWorkspace2x2MatrixItem(
  partial: Partial<Workspace2x2MatrixItem> = {},
): Workspace2x2MatrixItem {
  return workspace2x2MatrixItemSchema.parse({
    id: partial.id ?? createWorkspaceId("matrix-item"),
    text: partial.text ?? "Item",
  });
}

export function createWorkspace2x2MatrixQuadrant(
  partial: Partial<Workspace2x2MatrixQuadrant> = {},
): Workspace2x2MatrixQuadrant {
  return workspace2x2MatrixQuadrantSchema.parse({
    name: partial.name ?? "Quadrant",
    items: partial.items ?? [],
  });
}

function createWorkspace2x2MatrixQuadrants(
  partial: Partial<Workspace2x2MatrixQuadrants> = {},
): Workspace2x2MatrixQuadrants {
  return workspace2x2MatrixQuadrantsSchema.parse({
    topLeft: createWorkspace2x2MatrixQuadrant({
      name: partial.topLeft?.name ?? "Quick wins",
      items: partial.topLeft?.items ?? [],
    }),
    topRight: createWorkspace2x2MatrixQuadrant({
      name: partial.topRight?.name ?? "Major bets",
      items: partial.topRight?.items ?? [],
    }),
    bottomLeft: createWorkspace2x2MatrixQuadrant({
      name: partial.bottomLeft?.name ?? "Fill-ins",
      items: partial.bottomLeft?.items ?? [],
    }),
    bottomRight: createWorkspace2x2MatrixQuadrant({
      name: partial.bottomRight?.name ?? "Avoid",
      items: partial.bottomRight?.items ?? [],
    }),
  });
}

export function createWorkspaceCourseRoadmapLesson(
  partial: Partial<WorkspaceCourseRoadmapLesson> = {},
): WorkspaceCourseRoadmapLesson {
  return workspaceCourseRoadmapLessonSchema.parse({
    id: partial.id ?? createWorkspaceId("lesson"),
    title: partial.title ?? "New lesson",
    recorded: partial.recorded ?? false,
  });
}

export function createWorkspaceCourseRoadmapOutcome(
  partial: Partial<WorkspaceCourseRoadmapOutcome> = {},
): WorkspaceCourseRoadmapOutcome {
  return workspaceCourseRoadmapOutcomeSchema.parse({
    id: partial.id ?? createWorkspaceId("outcome"),
    text: partial.text ?? "Outcome",
  });
}

export function createWorkspaceCourseRoadmapCourse(
  partial: Partial<WorkspaceCourseRoadmapCourse> = {},
): WorkspaceCourseRoadmapCourse {
  return workspaceCourseRoadmapCourseSchema.parse({
    id: partial.id ?? createWorkspaceId("course"),
    name: partial.name ?? "New course",
    status: partial.status ?? "planning",
    lessons: partial.lessons ?? [createWorkspaceCourseRoadmapLesson({ title: "Lesson 1" })],
    outcomes: partial.outcomes ?? [
      createWorkspaceCourseRoadmapOutcome({ text: "Primary learning outcome" }),
    ],
  });
}

export function createWorkspaceSkillsHeatMapMember(
  dimensions: WorkspaceSkillsHeatMapDimension[],
  partial: Partial<WorkspaceSkillsHeatMapMember> = {},
): WorkspaceSkillsHeatMapMember {
  return workspaceSkillsHeatMapMemberSchema.parse({
    id: partial.id ?? createWorkspaceId("person"),
    name: partial.name ?? "New team member",
    role: partial.role ?? "",
    scores: createWorkspaceSkillsScoreMap(dimensions, partial.scores),
  });
}

export function createWorkspaceDelegationItem(
  partial: Partial<WorkspaceDelegationItem> = {},
): WorkspaceDelegationItem {
  return workspaceDelegationItemSchema.parse({
    id: partial.id ?? createWorkspaceId("delegation"),
    task: partial.task ?? "Task to delegate",
    from: partial.from ?? "Ahmed",
    to: partial.to ?? "",
    hoursPerWeek: partial.hoursPerWeek ?? 2,
    status: partial.status ?? "stuck",
  });
}

export function createWorkspaceDealScoringDeal(
  partial: Partial<WorkspaceDealScoringDeal> = {},
): WorkspaceDealScoringDeal {
  return workspaceDealScoringDealSchema.parse({
    id: partial.id ?? createWorkspaceId("deal"),
    clientName: partial.clientName ?? "New deal",
    valueEgp: partial.valueEgp ?? 0,
    temperature: partial.temperature ?? "warm",
    score: partial.score ?? 50,
    stage: partial.stage ?? "lead",
    nextAction: partial.nextAction ?? "",
    dueDate: partial.dueDate ?? null,
  });
}

export function createWorkspacePipelineFunnelDeal(
  partial: Partial<WorkspacePipelineFunnelDeal> = {},
): WorkspacePipelineFunnelDeal {
  return workspacePipelineFunnelDealSchema.parse({
    id: partial.id ?? createWorkspaceId("funnel-deal"),
    clientName: partial.clientName ?? "New deal",
    valueEgp: partial.valueEgp ?? 0,
    temperature: partial.temperature ?? "warm",
    stage: partial.stage ?? "lead",
  });
}

export function createWorkspaceForecastConfidenceItem(
  partial: Partial<WorkspaceForecastConfidenceItem> = {},
): WorkspaceForecastConfidenceItem {
  return workspaceForecastConfidenceItemSchema.parse({
    id: partial.id ?? createWorkspaceId("forecast"),
    clientName: partial.clientName ?? "New forecast deal",
    valueEgp: partial.valueEgp ?? 0,
    bucket: partial.bucket ?? "likely",
    expectedCloseMonth: partial.expectedCloseMonth ?? null,
    confidence: partial.confidence ?? 50,
    owner: partial.owner ?? "",
    nextAction: partial.nextAction ?? "",
  });
}

export function createWorkspaceContentPipelineItem(
  partial: Partial<WorkspaceContentPipelineItem> = {},
): WorkspaceContentPipelineItem {
  return workspaceContentPipelineItemSchema.parse({
    id: partial.id ?? createWorkspaceId("content"),
    title: partial.title ?? "New content piece",
    status: partial.status ?? "ideas",
    platform: partial.platform ?? "instagram",
    assignee: partial.assignee ?? "",
  });
}

export function createWorkspaceContentQualityScores(
  partial: Partial<WorkspaceContentQualityScores> = {},
): WorkspaceContentQualityScores {
  return workspaceContentQualityScoresSchema.parse(createWorkspaceContentQualityScoreMap(partial));
}

export function createWorkspaceContentRoiItem(
  partial: Partial<WorkspaceContentRoiItem> = {},
): WorkspaceContentRoiItem {
  return workspaceContentRoiItemSchema.parse({
    id: partial.id ?? createWorkspaceId("content-roi"),
    title: partial.title ?? "New content piece",
    platform: partial.platform ?? "linkedin",
    campaign: partial.campaign ?? "",
    goal: partial.goal ?? "",
    reach: partial.reach ?? 0,
    leads: partial.leads ?? 0,
    conversionInfluence: partial.conversionInfluence ?? 5,
    repurposeValue: partial.repurposeValue ?? 5,
  });
}

export function createWorkspaceHookBankItem(
  partial: Partial<WorkspaceHookBankItem> = {},
): WorkspaceHookBankItem {
  return workspaceHookBankItemSchema.parse({
    id: partial.id ?? createWorkspaceId("hook"),
    category: partial.category ?? "",
    text: partial.text ?? "",
    score: partial.score ?? 5,
  });
}

export function createWorkspaceMessageHousePillar(
  partial: Partial<WorkspaceMessageHousePillar> = {},
): WorkspaceMessageHousePillar {
  return workspaceMessageHousePillarSchema.parse({
    id: partial.id ?? createWorkspaceId("pillar"),
    title: partial.title ?? "Pillar",
    body: partial.body ?? "",
  });
}

export function createWorkspaceProfitabilityClient(
  partial: Partial<WorkspaceProfitabilityClient> = {},
): WorkspaceProfitabilityClient {
  return workspaceProfitabilityClientSchema.parse({
    id: partial.id ?? createWorkspaceId("client"),
    name: partial.name ?? "Client",
    paymentStatus: partial.paymentStatus ?? "paid",
    healthPercent: partial.healthPercent ?? 65,
    revenueEgp: partial.revenueEgp ?? 0,
    costEgp: partial.costEgp ?? 0,
  });
}

export function createWorkspaceExpenseItem(
  partial: Partial<WorkspaceExpenseItem> = {},
): WorkspaceExpenseItem {
  return workspaceExpenseItemSchema.parse({
    id: partial.id ?? createWorkspaceId("expense"),
    category: partial.category ?? "Expense",
    amountEgp: partial.amountEgp ?? 0,
  });
}

export function createWorkspaceReceivableInvoice(
  partial: Partial<WorkspaceReceivableInvoice> = {},
): WorkspaceReceivableInvoice {
  return workspaceReceivableInvoiceSchema.parse({
    id: partial.id ?? createWorkspaceId("invoice"),
    clientName: partial.clientName ?? "Client",
    amountEgp: partial.amountEgp ?? 0,
    dueDate: partial.dueDate ?? null,
    owner: partial.owner ?? "",
    nextFollowUpDate: partial.nextFollowUpDate ?? null,
    status: partial.status ?? "due-soon",
    notes: partial.notes ?? "",
    paidAt: partial.paidAt ?? null,
  });
}

export function createWorkspaceCohortHealthCohort(
  partial: Partial<WorkspaceCohortHealthCohort> = {},
): WorkspaceCohortHealthCohort {
  return workspaceCohortHealthCohortSchema.parse({
    id: partial.id ?? createWorkspaceId("cohort"),
    name: partial.name ?? "New cohort",
    seatsSold: partial.seatsSold ?? 0,
    capacity: partial.capacity ?? 20,
    revenueEgp: partial.revenueEgp ?? 0,
    startDate: partial.startDate ?? null,
    status: partial.status ?? "planning",
    refundRisk: partial.refundRisk ?? false,
    completionRisk: partial.completionRisk ?? false,
  });
}

export function createWorkspaceLeadershipRhythmMeeting(
  partial: Partial<WorkspaceLeadershipRhythmMeeting> = {},
): WorkspaceLeadershipRhythmMeeting {
  return workspaceLeadershipRhythmMeetingSchema.parse({
    id: partial.id ?? createWorkspaceId("meeting"),
    name: partial.name ?? "Leadership meeting",
    rhythm: partial.rhythm ?? "weekly",
    owner: partial.owner ?? "",
    participants: partial.participants ?? "",
    purpose: partial.purpose ?? "",
    durationMinutes: partial.durationMinutes ?? 60,
    nextDate: partial.nextDate ?? null,
    status: partial.status ?? "scheduled",
  });
}

export function createWorkspaceTalentGridMember(
  partial: Partial<WorkspaceTalentGridMember> = {},
): WorkspaceTalentGridMember {
  return workspaceTalentGridMemberSchema.parse({
    id: partial.id ?? createWorkspaceId("talent"),
    name: partial.name ?? "New team member",
    role: partial.role ?? "",
    performance: partial.performance ?? 3,
    potential: partial.potential ?? 3,
  });
}

export function createWorkspaceSeatPlannerSeat(
  partial: Partial<WorkspaceSeatPlannerSeat> = {},
): WorkspaceSeatPlannerSeat {
  return workspaceSeatPlannerSeatSchema.parse({
    id: partial.id ?? createWorkspaceId("seat"),
    name: partial.name ?? "Critical seat",
    owner: partial.owner ?? "",
    function: partial.function ?? "",
    health: partial.health ?? "strong",
    load: partial.load ?? "balanced",
    backupOwner: partial.backupOwner ?? "",
    notes: partial.notes ?? "",
  });
}

export function createWorkspaceKanbanColumn(
  partial: Partial<WorkspaceKanbanColumn> = {},
): WorkspaceKanbanColumn {
  return workspaceKanbanColumnSchema.parse({
    id: partial.id ?? createWorkspaceId("column"),
    title: partial.title ?? "New column",
  });
}

export function createWorkspaceKanbanCard(
  partial: Partial<WorkspaceKanbanCard> & { columnId: string },
): WorkspaceKanbanCard {
  return workspaceKanbanCardSchema.parse({
    id: partial.id ?? createWorkspaceId("card"),
    title: partial.title ?? "New card",
    description: partial.description ?? "",
    columnId: partial.columnId,
    assignee: partial.assignee ?? "",
    dueDate: partial.dueDate ?? null,
  });
}

export function createWorkspaceTimelineMilestone(
  partial: Partial<WorkspaceTimelineMilestone> = {},
): WorkspaceTimelineMilestone {
  return workspaceTimelineMilestoneSchema.parse({
    id: partial.id ?? createWorkspaceId("milestone"),
    title: partial.title ?? "Milestone",
    date: partial.date ?? null,
    status: partial.status ?? "planned",
    note: partial.note ?? "",
  });
}

export function createWorkspaceScorecardMetric(
  partial: Partial<WorkspaceScorecardMetric> = {},
): WorkspaceScorecardMetric {
  return workspaceScorecardMetricSchema.parse({
    id: partial.id ?? createWorkspaceId("metric"),
    label: partial.label ?? "Metric",
    value: partial.value ?? 0,
    target: partial.target ?? 100,
    unit: partial.unit ?? "",
  });
}

export function createWorkspaceOkrKeyResult(
  partial: Partial<WorkspaceOkrKeyResult> = {},
): WorkspaceOkrKeyResult {
  return workspaceOkrKeyResultSchema.parse({
    id: partial.id ?? createWorkspaceId("key-result"),
    title: partial.title ?? "New key result",
    progress: partial.progress ?? 0,
  });
}

export function createWorkspaceOkrObjective(
  partial: Partial<WorkspaceOkrObjective> = {},
): WorkspaceOkrObjective {
  return workspaceOkrObjectiveSchema.parse({
    id: partial.id ?? createWorkspaceId("objective"),
    title: partial.title ?? "New objective",
    keyResults: partial.keyResults ?? [],
  });
}

export function createWorkspaceDecisionMatrixCriterion(
  partial: Partial<WorkspaceDecisionMatrixCriterion> = {},
): WorkspaceDecisionMatrixCriterion {
  return workspaceDecisionMatrixCriterionSchema.parse({
    id: partial.id ?? createWorkspaceId("criterion"),
    label: partial.label ?? "New criterion",
    weight: partial.weight ?? 5,
  });
}

export function createWorkspaceDecisionMatrixOption(
  partial: Partial<WorkspaceDecisionMatrixOption> = {},
): WorkspaceDecisionMatrixOption {
  return workspaceDecisionMatrixOptionSchema.parse({
    id: partial.id ?? createWorkspaceId("option"),
    label: partial.label ?? "Option",
    scores: partial.scores ?? {},
  });
}

export function createWorkspaceStrategicAssumption(
  partial: Partial<WorkspaceStrategicAssumption> = {},
): WorkspaceStrategicAssumption {
  return workspaceStrategicAssumptionSchema.parse({
    id: partial.id ?? createWorkspaceId("assumption"),
    statement: partial.statement ?? "New assumption",
    linkType: partial.linkType ?? "none",
    linkId: partial.linkId ?? null,
    owner: partial.owner ?? "",
    reviewDate: partial.reviewDate ?? null,
    confidence: partial.confidence ?? 3,
    status: partial.status ?? "validating",
    evidenceNotes: partial.evidenceNotes ?? "",
  });
}

function getDecisionMatrixDefaultCriteria() {
  return [
    createWorkspaceDecisionMatrixCriterion({
      label: "Revenue Impact",
      weight: 5,
    }),
    createWorkspaceDecisionMatrixCriterion({
      label: "Time to Execute",
      weight: 3,
    }),
    createWorkspaceDecisionMatrixCriterion({
      label: "Risk Level",
      weight: 4,
    }),
  ];
}

function createDecisionMatrixScoreMap(
  criteria: WorkspaceDecisionMatrixCriterion[],
  scores: number[],
) {
  return Object.fromEntries(criteria.map((criterion, index) => [criterion.id, scores[index] ?? 5]));
}

function getBusinessModelCanvasDefaultCells() {
  return {
    keyPartners: "",
    keyActivities:
      "Deliver cohort-based practical marketing programs\nPublish authority-building content each week\nRun conversion-focused consulting and advisory sessions",
    keyResources: "",
    valuePropositions:
      "Practical senior-level marketing training with real case studies\nClearer execution systems for operators, founders, and teams",
    customerRelationships: "",
    channels: "",
    customerSegments: "",
    costStructure: "",
    revenueStreams: "",
  } satisfies WorkspaceBusinessModelCanvasBlock["cells"];
}

function getSkillsHeatMapDefaultDimensions(): WorkspaceSkillsHeatMapDimension[] {
  return [
    { id: "writing", label: "Writing" },
    { id: "strategy", label: "Strategy" },
    { id: "design", label: "Design" },
    { id: "analytics", label: "Analytics" },
    { id: "leadership", label: "Leadership" },
  ];
}

function getSkillsHeatMapDefaultMembers(dimensions: WorkspaceSkillsHeatMapDimension[]) {
  return [
    createWorkspaceSkillsHeatMapMember(dimensions, {
      name: "Sarah",
      role: "Content Strategist",
      scores: {
        writing: 9,
        strategy: 7,
        design: 5,
        analytics: 6,
        leadership: 6,
      },
    }),
    createWorkspaceSkillsHeatMapMember(dimensions, {
      name: "Omar",
      role: "Growth Lead",
      scores: {
        writing: 7,
        strategy: 9,
        design: 4,
        analytics: 8,
        leadership: 7,
      },
    }),
    createWorkspaceSkillsHeatMapMember(dimensions, {
      name: "Nour",
      role: "Designer",
      scores: {
        writing: 5,
        strategy: 6,
        design: 9,
        analytics: 5,
        leadership: 6,
      },
    }),
    createWorkspaceSkillsHeatMapMember(dimensions, {
      name: "Karim",
      role: "Analyst",
      scores: {
        writing: 4,
        strategy: 7,
        design: 3,
        analytics: 9,
        leadership: 5,
      },
    }),
    createWorkspaceSkillsHeatMapMember(dimensions, {
      name: "Layla",
      role: "Operations Manager",
      scores: {
        writing: 6,
        strategy: 8,
        design: 4,
        analytics: 7,
        leadership: 9,
      },
    }),
  ];
}

function getDelegationMatrixDefaultItems() {
  return [
    createWorkspaceDelegationItem({
      task: "Social scheduling",
      from: "Ahmed",
      to: "Sarah",
      hoursPerWeek: 3,
      status: "stuck",
    }),
    createWorkspaceDelegationItem({
      task: "Client reporting",
      from: "Ahmed",
      to: "Karim",
      hoursPerWeek: 5,
      status: "stuck",
    }),
    createWorkspaceDelegationItem({
      task: "Content approvals",
      from: "Ahmed",
      to: "Layla",
      hoursPerWeek: 4,
      status: "transitioning",
    }),
  ];
}

function getDealScoringMatrixDefaultDeals() {
  return [
    createWorkspaceDealScoringDeal({
      clientName: "TechCo",
      valueEgp: 15_000,
      temperature: "hot",
      score: 82,
      stage: "consultation",
      nextAction: "Send revised scope after the discovery call.",
      dueDate: "2026-04-03",
    }),
    createWorkspaceDealScoringDeal({
      clientName: "FoodBrand",
      valueEgp: 8_000,
      temperature: "warm",
      score: 55,
      stage: "lead",
      nextAction: "Book intro call with the brand manager.",
      dueDate: "2026-04-07",
    }),
    createWorkspaceDealScoringDeal({
      clientName: "EduStart",
      valueEgp: 22_000,
      temperature: "hot",
      score: 90,
      stage: "proposal",
      nextAction: "Push commercial approval and confirm procurement path.",
      dueDate: "2026-04-01",
    }),
  ];
}

function getPipelineFunnelDefaultDeals() {
  return [
    createWorkspacePipelineFunnelDeal({
      clientName: "TechCo",
      valueEgp: 15_000,
      temperature: "hot",
      stage: "consultation",
    }),
    createWorkspacePipelineFunnelDeal({
      clientName: "FoodBrand",
      valueEgp: 8_000,
      temperature: "warm",
      stage: "lead",
    }),
    createWorkspacePipelineFunnelDeal({
      clientName: "EduStart",
      valueEgp: 22_000,
      temperature: "hot",
      stage: "proposal",
    }),
  ];
}

function getForecastConfidenceDefaultItems() {
  return [
    createWorkspaceForecastConfidenceItem({
      clientName: "TechCo",
      valueEgp: 15_000,
      bucket: "commit",
      expectedCloseMonth: "2026-04",
      confidence: 85,
      owner: "Omar",
      nextAction: "Finalize legal redlines and sign the MSA.",
    }),
    createWorkspaceForecastConfidenceItem({
      clientName: "EduStart",
      valueEgp: 22_000,
      bucket: "likely",
      expectedCloseMonth: "2026-05",
      confidence: 70,
      owner: "Layla",
      nextAction: "Secure final buyer approval after budget review.",
    }),
    createWorkspaceForecastConfidenceItem({
      clientName: "FoodBrand",
      valueEgp: 8_000,
      bucket: "at-risk",
      expectedCloseMonth: "2026-04",
      confidence: 35,
      owner: "Sarah",
      nextAction: "Recover the stalled thread with a revised proposal.",
    }),
  ];
}

function getContentPipelineDefaultItems() {
  return [
    createWorkspaceContentPipelineItem({
      title: "Founder POV on why content calendars stall after week three",
      status: "review",
      platform: "linkedin",
      assignee: "Omar",
    }),
    createWorkspaceContentPipelineItem({
      title: "3 hook variations for the onboarding retention reel",
      status: "draft",
      platform: "instagram",
      assignee: "Nour",
    }),
    createWorkspaceContentPipelineItem({
      title: "Customer win breakdown from the retention audit sprint",
      status: "published",
      platform: "tiktok",
      assignee: "Sarah",
    }),
  ];
}

function getContentQualityRadarDefaultScores() {
  return createWorkspaceContentQualityScores({
    hook: 7,
    value: 8,
    emotion: 6,
    cta: 5,
    platformFit: 6,
    brand: 8,
    shareability: 4,
    scrollStop: 7,
    authenticity: 9,
    storytelling: 6,
  });
}

function getContentRoiTrackerDefaultItems() {
  return [
    createWorkspaceContentRoiItem({
      title: "LinkedIn authority post on retention diagnostics",
      platform: "linkedin",
      campaign: "Q2 Authority Push",
      goal: "Book founder discovery calls",
      reach: 2_600,
      leads: 11,
      conversionInfluence: 9,
      repurposeValue: 8,
    }),
    createWorkspaceContentRoiItem({
      title: "TikTok educational video on onboarding teardown mistakes",
      platform: "tiktok",
      campaign: "Demand Capture Sprint",
      goal: "Drive newsletter signups",
      reach: 18_000,
      leads: 4,
      conversionInfluence: 6,
      repurposeValue: 7,
    }),
    createWorkspaceContentRoiItem({
      title: "Instagram carousel recapping the product launch checklist",
      platform: "instagram",
      campaign: "Feature Awareness",
      goal: "Increase profile visits",
      reach: 6_200,
      leads: 1,
      conversionInfluence: 4,
      repurposeValue: 4,
    }),
  ];
}

function getAuthorityScorecardDefaultMetrics(): WorkspaceAuthorityScoreMetrics {
  return workspaceAuthorityScoreMetricsSchema.parse({
    posts: {
      value: 12,
      target: 20,
    },
    videos: {
      value: 4,
      target: 8,
    },
    speakingGigs: {
      value: 1,
      target: 2,
    },
    podcastAppearances: {
      value: 0,
      target: 2,
    },
    mediaFeatures: {
      value: 2,
      target: 4,
    },
    followers: {
      value: 5_400,
      target: 10_000,
    },
  });
}

function getHookBankDefaultItems() {
  return [
    createWorkspaceHookBankItem({
      category: "pattern-interrupt",
      text: "The reason your content is underperforming is probably the metric you're celebrating.",
      score: 9,
    }),
    createWorkspaceHookBankItem({
      category: "mistake",
      text: "Most founders don't have a content problem. They have a message discipline problem.",
      score: 9,
    }),
    createWorkspaceHookBankItem({
      category: "insider",
      text: "Behind every strong authority brand is a boring message system nobody sees.",
      score: 8,
    }),
    createWorkspaceHookBankItem({
      category: "investment",
      text: "If you can't explain the ROI of a post before publishing it, you're not building an asset.",
      score: 8,
    }),
    createWorkspaceHookBankItem({
      category: "contrarian",
      text: "More content is rarely the answer. Better hooks and tighter proof usually are.",
      score: 7,
    }),
    createWorkspaceHookBankItem({
      category: "proof",
      text: "The fastest way to sound premium is to replace opinions with receipts.",
      score: 8,
    }),
  ];
}

function getMessageHouseDefaultPillars() {
  return [
    createWorkspaceMessageHousePillar({
      title: "Practical Depth",
      body: "School of Marketing teaches execution-ready marketing systems, not recycled theory.",
    }),
    createWorkspaceMessageHousePillar({
      title: "Operator Credibility",
      body: "Every lesson is grounded in real client delivery, campaign mistakes, and commercial tradeoffs.",
    }),
    createWorkspaceMessageHousePillar({
      title: "Clearer Growth Decisions",
      body: "The brand helps founders and marketers prioritize what moves revenue instead of busywork.",
    }),
  ];
}

function getProfitabilityCashFlowDefaultClients() {
  return [
    createWorkspaceProfitabilityClient({
      name: "TechCo",
      paymentStatus: "paid",
      healthPercent: 88,
      revenueEgp: 90_000,
      costEgp: 32_000,
    }),
    createWorkspaceProfitabilityClient({
      name: "FoodBrand",
      paymentStatus: "partial",
      healthPercent: 64,
      revenueEgp: 58_000,
      costEgp: 29_000,
    }),
    createWorkspaceProfitabilityClient({
      name: "EduStart",
      paymentStatus: "paid",
      healthPercent: 79,
      revenueEgp: 72_000,
      costEgp: 24_000,
    }),
    createWorkspaceProfitabilityClient({
      name: "ClinicOne",
      paymentStatus: "overdue",
      healthPercent: 46,
      revenueEgp: 44_000,
      costEgp: 23_000,
    }),
  ];
}

function getProfitabilityCashFlowDefaultExpenses() {
  return [
    createWorkspaceExpenseItem({
      category: "Salaries",
      amountEgp: 62_000,
    }),
    createWorkspaceExpenseItem({
      category: "Tools",
      amountEgp: 11_500,
    }),
    createWorkspaceExpenseItem({
      category: "Office",
      amountEgp: 7_000,
    }),
    createWorkspaceExpenseItem({
      category: "Marketing",
      amountEgp: 16_000,
    }),
  ];
}

function getCollectionsTrackerDefaultInvoices() {
  return [
    createWorkspaceReceivableInvoice({
      clientName: "TechCo",
      amountEgp: 28_000,
      dueDate: "2026-03-18",
      owner: "Layla",
      nextFollowUpDate: "2026-03-20",
      status: "paid",
      notes: "Collected after contract milestone signoff.",
      paidAt: "2026-03-19",
    }),
    createWorkspaceReceivableInvoice({
      clientName: "EduStart",
      amountEgp: 36_000,
      dueDate: "2026-04-01",
      owner: "Karim",
      nextFollowUpDate: "2026-03-31",
      status: "due-soon",
      notes: "Invoice sent and procurement requested purchase order copy.",
    }),
    createWorkspaceReceivableInvoice({
      clientName: "FoodBrand",
      amountEgp: 22_000,
      dueDate: "2026-03-24",
      owner: "Layla",
      nextFollowUpDate: "2026-03-30",
      status: "partial",
      notes: "Half collected. Waiting on the remaining balance after final asset delivery.",
    }),
    createWorkspaceReceivableInvoice({
      clientName: "ClinicOne",
      amountEgp: 41_000,
      dueDate: "2026-03-11",
      owner: "Omar",
      nextFollowUpDate: "2026-03-30",
      status: "overdue",
      notes: "Escalate to founder if payment remains open after the next follow-up.",
    }),
  ];
}

function getCourseRoadmapDefaultCourses() {
  return [
    createWorkspaceCourseRoadmapCourse({
      name: "Content Marketing Mastery",
      status: "in-progress",
      lessons: [
        createWorkspaceCourseRoadmapLesson({
          title: "Module 1: Market Positioning Foundations",
          recorded: true,
        }),
        createWorkspaceCourseRoadmapLesson({
          title: "Module 2: Audience Research and Insight Mining",
          recorded: true,
        }),
        createWorkspaceCourseRoadmapLesson({
          title: "Module 3: Offer-Messaging Alignment",
        }),
        createWorkspaceCourseRoadmapLesson({
          title: "Module 4: Content Systems and Editorial Planning",
        }),
        createWorkspaceCourseRoadmapLesson({
          title: "Module 5: Distribution and Repurposing",
        }),
        createWorkspaceCourseRoadmapLesson({
          title: "Module 6: Measurement and Optimization",
        }),
      ],
      outcomes: [
        createWorkspaceCourseRoadmapOutcome({
          text: "Build a content strategy linked to a commercial goal.",
        }),
        createWorkspaceCourseRoadmapOutcome({
          text: "Translate audience insight into stronger content angles and offers.",
        }),
        createWorkspaceCourseRoadmapOutcome({
          text: "Run a repeatable system for planning, publishing, and reviewing content.",
        }),
      ],
    }),
    createWorkspaceCourseRoadmapCourse({
      name: "Agency Growth Blueprint",
      status: "planning",
      lessons: [
        createWorkspaceCourseRoadmapLesson({
          title: "Module 1: Agency Positioning and Offer Clarity",
        }),
        createWorkspaceCourseRoadmapLesson({
          title: "Module 2: Productized Services",
        }),
        createWorkspaceCourseRoadmapLesson({
          title: "Module 3: Lead Generation Systems",
        }),
        createWorkspaceCourseRoadmapLesson({
          title: "Module 4: Sales Calls and Qualification",
        }),
        createWorkspaceCourseRoadmapLesson({
          title: "Module 5: Delivery Capacity and Team Design",
        }),
        createWorkspaceCourseRoadmapLesson({
          title: "Module 6: Pricing and Margin Discipline",
        }),
        createWorkspaceCourseRoadmapLesson({
          title: "Module 7: Retention and Expansion",
        }),
        createWorkspaceCourseRoadmapLesson({
          title: "Module 8: Operating Rhythm and Reporting",
        }),
      ],
      outcomes: [
        createWorkspaceCourseRoadmapOutcome({
          text: "Package agency services around measurable outcomes instead of custom chaos.",
        }),
        createWorkspaceCourseRoadmapOutcome({
          text: "Install a sales and delivery rhythm that supports profitable growth.",
        }),
        createWorkspaceCourseRoadmapOutcome({
          text: "Spot capacity and pricing problems before they damage cash flow.",
        }),
      ],
    }),
  ];
}

function getCohortHealthDefaultCohorts() {
  return [
    createWorkspaceCohortHealthCohort({
      name: "Content Marketing Mastery Q2",
      seatsSold: 18,
      capacity: 25,
      revenueEgp: 270_000,
      startDate: "2026-04-21",
      status: "selling",
      refundRisk: false,
      completionRisk: false,
    }),
    createWorkspaceCohortHealthCohort({
      name: "Agency Growth Blueprint Q2",
      seatsSold: 6,
      capacity: 20,
      revenueEgp: 90_000,
      startDate: "2026-05-12",
      status: "selling",
      refundRisk: true,
      completionRisk: true,
    }),
  ];
}

function getEisenhowerMatrixDefaultTasks() {
  return [
    createWorkspaceTask({
      text: "Approve EduStart proposal revisions",
      domain: "sales",
      urgency: 9,
      importance: 9,
      estimateMinutes: 45,
      dueDate: "2026-03-30",
      priority: "high",
    }),
    createWorkspaceTask({
      text: "Finalize Content Marketing Mastery module 3 recording brief",
      domain: "education",
      urgency: 8,
      importance: 8,
      estimateMinutes: 90,
      dueDate: "2026-03-31",
      priority: "high",
    }),
    createWorkspaceTask({
      text: "Review Q2 hiring scorecards for growth operator candidates",
      domain: "people",
      urgency: 5,
      importance: 8,
      estimateMinutes: 60,
      dueDate: "2026-04-02",
      priority: "medium",
    }),
    createWorkspaceTask({
      text: "Draft April authority content themes",
      domain: "content",
      urgency: 6,
      importance: 7,
      estimateMinutes: 120,
      dueDate: "2026-04-03",
      priority: "medium",
    }),
    createWorkspaceTask({
      text: "Clean up low-value finance reporting requests",
      domain: "finance",
      urgency: 7,
      importance: 3,
      estimateMinutes: 40,
      dueDate: "2026-03-29",
      priority: "low",
    }),
  ];
}

function getLeadershipRhythmDefaultMeetings() {
  return [
    createWorkspaceLeadershipRhythmMeeting({
      name: "Weekly Leadership Meeting",
      rhythm: "weekly",
      owner: "Omar",
      participants: "Leadership team",
      purpose: "Review priorities, blockers, and execution commitments for the week.",
      durationMinutes: 60,
      nextDate: "2026-03-30",
      status: "scheduled",
    }),
    createWorkspaceLeadershipRhythmMeeting({
      name: "Sales Forecast Review",
      rhythm: "weekly",
      owner: "Omar",
      participants: "Sales lead, finance lead",
      purpose: "Stress-test the forecast, next closes, and blocked deals.",
      durationMinutes: 45,
      nextDate: "2026-04-01",
      status: "scheduled",
    }),
    createWorkspaceLeadershipRhythmMeeting({
      name: "Finance Review",
      rhythm: "monthly",
      owner: "Karim",
      participants: "Founder, finance lead",
      purpose: "Review margin, collections, and budget pressure points.",
      durationMinutes: 60,
      nextDate: "2026-03-25",
      status: "missed",
    }),
    createWorkspaceLeadershipRhythmMeeting({
      name: "Hiring Review",
      rhythm: "monthly",
      owner: "Layla",
      participants: "Founder, people lead",
      purpose: "Decide on open roles, candidate flow, and seat coverage risks.",
      durationMinutes: 50,
      nextDate: "2026-04-08",
      status: "scheduled",
    }),
    createWorkspaceLeadershipRhythmMeeting({
      name: "Strategic Review",
      rhythm: "quarterly",
      owner: "Omar",
      participants: "Leadership team",
      purpose: "Revisit strategic bets, operating assumptions, and quarter-level shifts.",
      durationMinutes: 120,
      nextDate: "2026-04-15",
      status: "needs-reschedule",
    }),
  ];
}

function getTalentGridDefaultMembers() {
  return [
    createWorkspaceTalentGridMember({
      name: "Sarah",
      role: "Content Strategist",
      performance: 4,
      potential: 5,
    }),
    createWorkspaceTalentGridMember({
      name: "Omar",
      role: "Growth Lead",
      performance: 5,
      potential: 4,
    }),
    createWorkspaceTalentGridMember({
      name: "Nour",
      role: "Designer",
      performance: 4,
      potential: 4,
    }),
    createWorkspaceTalentGridMember({
      name: "Karim",
      role: "Analyst",
      performance: 3,
      potential: 5,
    }),
    createWorkspaceTalentGridMember({
      name: "Layla",
      role: "Operations Manager",
      performance: 3,
      potential: 3,
    }),
  ];
}

function getSeatPlannerDefaultSeats() {
  return [
    createWorkspaceSeatPlannerSeat({
      name: "CEO",
      owner: "Ahmed",
      function: "Vision, capital allocation, key relationships",
      health: "strong",
      load: "overloaded",
      backupOwner: "Layla",
      notes: "Founder is still the escalation path for most cross-functional decisions.",
    }),
    createWorkspaceSeatPlannerSeat({
      name: "Sales Lead",
      owner: "Omar",
      function: "Pipeline ownership, proposals, weekly forecasting",
      health: "fragile",
      load: "balanced",
      backupOwner: "",
      notes: "Single-threaded sales knowledge and no clear backup for live deals.",
    }),
    createWorkspaceSeatPlannerSeat({
      name: "Content Lead",
      owner: "Sarah",
      function: "Editorial calendar, distribution, case-study production",
      health: "strong",
      load: "balanced",
      backupOwner: "Nour",
      notes: "Execution is steady and documented.",
    }),
    createWorkspaceSeatPlannerSeat({
      name: "Operations / PMO",
      owner: "",
      function: "Delivery system, meeting cadence, cross-team follow-through",
      health: "gap",
      load: "balanced",
      backupOwner: "",
      notes: "Critical coordination work is spread informally across the founder and ops support.",
    }),
    createWorkspaceSeatPlannerSeat({
      name: "Finance Admin",
      owner: "Layla",
      function: "Collections, invoices, cash reporting",
      health: "strong",
      load: "balanced",
      backupOwner: "Karim",
      notes: "Stable seat with basic redundancy in place.",
    }),
  ];
}

function getMessageHouseDefaultBrandPromise() {
  return "School of Marketing helps serious operators turn scattered marketing effort into practical systems that compound authority and revenue.";
}

function normalizeMessageHousePillars(pillars: WorkspaceMessageHousePillar[] | undefined) {
  const defaults = getMessageHouseDefaultPillars();
  const source = pillars && pillars.length > 0 ? pillars.slice(0, 3) : defaults;

  return Array.from({ length: 3 }, (_, index) => {
    const fallback = defaults[index]!;
    const current = source[index];

    return createWorkspaceMessageHousePillar({
      id: current?.id ?? fallback.id,
      title: current?.title ?? fallback.title,
      body: current?.body ?? fallback.body,
    });
  });
}

function normalizeAuthorityScoreMetrics(
  metrics: Partial<WorkspaceAuthorityScoreMetrics> | undefined,
) {
  return workspaceAuthorityScoreMetricsSchema.parse({
    ...getAuthorityScorecardDefaultMetrics(),
    ...metrics,
  });
}

function getTableDefaultColumns() {
  return [
    createWorkspaceTableColumn({ label: "Item" }),
    createWorkspaceTableColumn({ label: "Owner" }),
    createWorkspaceTableColumn({ label: "Notes" }),
  ];
}

function getProcessDefaultSteps() {
  return [
    createWorkspaceProcessStep({ title: "Define" }),
    createWorkspaceProcessStep({ title: "Execute" }),
    createWorkspaceProcessStep({ title: "Review" }),
  ];
}

export function createWorkspaceTaskListBlock(
  partial: Partial<WorkspaceTaskListBlock> = {},
): WorkspaceTaskListBlock {
  const timestamp = getNowIsoString();

  return workspaceTaskListBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "task-list",
    title: partial.title ?? "Task list",
    tasks: partial.tasks ?? [],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceNotesBlock(
  partial: Partial<WorkspaceNotesBlock> = {},
): WorkspaceNotesBlock {
  const timestamp = getNowIsoString();

  return workspaceNotesBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "notes",
    title: partial.title ?? "Notes",
    body: partial.body ?? "",
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceTableBlock(
  partial: Partial<WorkspaceTableBlock> = {},
): WorkspaceTableBlock {
  const timestamp = getNowIsoString();
  const columns = partial.columns?.length ? partial.columns : getTableDefaultColumns();

  return workspaceTableBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "table",
    title: partial.title ?? "Table",
    columns,
    rows: partial.rows ?? [],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceChecklistBlock(
  partial: Partial<WorkspaceChecklistBlock> = {},
): WorkspaceChecklistBlock {
  const timestamp = getNowIsoString();

  return workspaceChecklistBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "checklist",
    title: partial.title ?? "Checklist",
    items: partial.items ?? [],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceDecisionBlock(
  partial: Partial<WorkspaceDecisionBlock> = {},
): WorkspaceDecisionBlock {
  const timestamp = getNowIsoString();

  return workspaceDecisionBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "decision",
    title: partial.title ?? "Decision",
    pros: partial.pros ?? [],
    cons: partial.cons ?? [],
    recommendation: partial.recommendation ?? "",
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceProsConsBlock(
  partial: Partial<WorkspaceProsConsBlock> = {},
): WorkspaceProsConsBlock {
  const timestamp = getNowIsoString();

  return workspaceProsConsBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "pros-cons",
    title: partial.title ?? "Pros & cons",
    pros: partial.pros ?? [],
    cons: partial.cons ?? [],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceSwotBlock(
  partial: Partial<WorkspaceSwotBlock> = {},
): WorkspaceSwotBlock {
  const timestamp = getNowIsoString();

  return workspaceSwotBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "swot",
    title: partial.title ?? "SWOT analysis",
    cells: createWorkspaceSwotCells(partial.cells),
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceTrackerBlock(
  partial: Partial<WorkspaceTrackerBlock> = {},
): WorkspaceTrackerBlock {
  const timestamp = getNowIsoString();

  return workspaceTrackerBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "tracker",
    title: partial.title ?? "Tracker",
    goal: partial.goal ?? null,
    entries: partial.entries ?? [],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceAiPromptBlock(
  partial: Partial<WorkspaceAiPromptBlock> = {},
): WorkspaceAiPromptBlock {
  const timestamp = getNowIsoString();

  return workspaceAiPromptBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "ai-prompt",
    title: partial.title ?? "Prompt",
    includeContext: partial.includeContext ?? true,
    prompt: partial.prompt ?? "",
    latestOutput: partial.latestOutput ?? "",
    outputHistory: partial.outputHistory ?? [],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceHabitGridBlock(
  partial: Partial<WorkspaceHabitGridBlock> = {},
): WorkspaceHabitGridBlock {
  const timestamp = getNowIsoString();

  return workspaceHabitGridBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "habit-grid",
    title: partial.title ?? "Habit grid",
    habits: partial.habits ?? [],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceProcessBlock(
  partial: Partial<WorkspaceProcessBlock> = {},
): WorkspaceProcessBlock {
  const timestamp = getNowIsoString();

  return workspaceProcessBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "process",
    title: partial.title ?? "Process",
    steps: partial.steps ?? getProcessDefaultSteps(),
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspace2x2MatrixBlock(
  partial: Partial<Workspace2x2MatrixBlock> = {},
): Workspace2x2MatrixBlock {
  const timestamp = getNowIsoString();

  return workspace2x2MatrixBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "2x2-matrix",
    title: partial.title ?? "2x2 matrix",
    xAxisLabel: partial.xAxisLabel ?? "Effort",
    xStartLabel: partial.xStartLabel ?? "Low",
    xEndLabel: partial.xEndLabel ?? "High",
    yAxisLabel: partial.yAxisLabel ?? "Impact",
    yStartLabel: partial.yStartLabel ?? "Low",
    yEndLabel: partial.yEndLabel ?? "High",
    quadrants: createWorkspace2x2MatrixQuadrants(partial.quadrants),
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceCourseRoadmapBlock(
  partial: Partial<WorkspaceCourseRoadmapBlock> = {},
): WorkspaceCourseRoadmapBlock {
  const timestamp = getNowIsoString();

  return workspaceCourseRoadmapBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "course-roadmap",
    title: partial.title ?? "Course roadmap",
    courses: partial.courses ?? getCourseRoadmapDefaultCourses(),
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceLearningOutcomesMatrixBlock(
  partial: Partial<WorkspaceLearningOutcomesMatrixBlock> = {},
): WorkspaceLearningOutcomesMatrixBlock {
  const timestamp = getNowIsoString();

  return workspaceLearningOutcomesMatrixBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "learning-outcomes-matrix",
    title: partial.title ?? "Outcomes matrix",
    courseBlockId: partial.courseBlockId ?? null,
    courseId: partial.courseId ?? null,
    prompt:
      partial.prompt ??
      "Design a learning outcomes matrix for my Content Marketing Mastery course.",
    latestOutput: partial.latestOutput ?? "",
    outputHistory: partial.outputHistory ?? [],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceTimeOrchestratorBlock(
  partial: Partial<WorkspaceTimeOrchestratorBlock> = {},
): WorkspaceTimeOrchestratorBlock {
  const timestamp = getNowIsoString();

  return workspaceTimeOrchestratorBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "time-orchestrator",
    title: partial.title ?? "Time orchestrator",
    settings: createWorkspaceTimeOrchestratorSettings(partial.settings),
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceCohortHealthDashboardBlock(
  partial: Partial<WorkspaceCohortHealthDashboardBlock> = {},
): WorkspaceCohortHealthDashboardBlock {
  const timestamp = getNowIsoString();

  return workspaceCohortHealthDashboardBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "cohort-health-dashboard",
    title: partial.title ?? "Cohort health dashboard",
    cohorts: partial.cohorts ?? getCohortHealthDefaultCohorts(),
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceEisenhowerMatrixBlock(
  partial: Partial<WorkspaceEisenhowerMatrixBlock> = {},
): WorkspaceEisenhowerMatrixBlock {
  const timestamp = getNowIsoString();

  return workspaceEisenhowerMatrixBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "eisenhower-matrix",
    title: partial.title ?? "Eisenhower matrix",
    tasks: partial.tasks ?? getEisenhowerMatrixDefaultTasks(),
    settings: createWorkspaceTimeOrchestratorSettings(partial.settings),
    latestBattlePlan: partial.latestBattlePlan ?? "",
    battlePlanUpdatedAt: partial.battlePlanUpdatedAt ?? null,
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceLeadershipRhythmPlannerBlock(
  partial: Partial<WorkspaceLeadershipRhythmPlannerBlock> = {},
): WorkspaceLeadershipRhythmPlannerBlock {
  const timestamp = getNowIsoString();

  return workspaceLeadershipRhythmPlannerBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "leadership-rhythm-planner",
    title: partial.title ?? "Leadership rhythm planner",
    filter: partial.filter ?? createWorkspaceLeadershipRhythmFilter(undefined),
    meetings: partial.meetings ?? getLeadershipRhythmDefaultMeetings(),
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceKanbanBlock(
  partial: Partial<WorkspaceKanbanBlock> = {},
): WorkspaceKanbanBlock {
  const timestamp = getNowIsoString();
  const columns =
    partial.columns && partial.columns.length > 0
      ? partial.columns
      : [
          createWorkspaceKanbanColumn({ title: "Backlog" }),
          createWorkspaceKanbanColumn({ title: "In progress" }),
          createWorkspaceKanbanColumn({ title: "Done" }),
        ];

  return workspaceKanbanBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "kanban",
    title: partial.title ?? "Kanban board",
    columns,
    cards: partial.cards ?? [],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceTimelineBlock(
  partial: Partial<WorkspaceTimelineBlock> = {},
): WorkspaceTimelineBlock {
  const timestamp = getNowIsoString();

  return workspaceTimelineBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "timeline",
    title: partial.title ?? "Timeline",
    milestones: partial.milestones ?? [],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceSkillsHeatMapBlock(
  partial: Partial<WorkspaceSkillsHeatMapBlock> = {},
): WorkspaceSkillsHeatMapBlock {
  const timestamp = getNowIsoString();
  const dimensions = partial.dimensions ?? getSkillsHeatMapDefaultDimensions();

  return workspaceSkillsHeatMapBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "skills-heat-map",
    title: partial.title ?? "Skills heat map",
    dimensions,
    members: partial.members ?? getSkillsHeatMapDefaultMembers(dimensions),
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceDelegationMatrixBlock(
  partial: Partial<WorkspaceDelegationMatrixBlock> = {},
): WorkspaceDelegationMatrixBlock {
  const timestamp = getNowIsoString();

  return workspaceDelegationMatrixBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "delegation-matrix",
    title: partial.title ?? "Delegation matrix",
    hourlyRate: partial.hourlyRate ?? 500,
    items: partial.items ?? getDelegationMatrixDefaultItems(),
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceTalentGridBlock(
  partial: Partial<WorkspaceTalentGridBlock> = {},
): WorkspaceTalentGridBlock {
  const timestamp = getNowIsoString();

  return workspaceTalentGridBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "talent-grid",
    title: partial.title ?? "9-box talent grid",
    members: partial.members ?? getTalentGridDefaultMembers(),
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceSeatPlannerBlock(
  partial: Partial<WorkspaceSeatPlannerBlock> = {},
): WorkspaceSeatPlannerBlock {
  const timestamp = getNowIsoString();

  return workspaceSeatPlannerBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "seat-planner",
    title: partial.title ?? "Seat ownership planner",
    filter: partial.filter ?? "all",
    seats: partial.seats ?? getSeatPlannerDefaultSeats(),
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceDealScoringMatrixBlock(
  partial: Partial<WorkspaceDealScoringMatrixBlock> = {},
): WorkspaceDealScoringMatrixBlock {
  const timestamp = getNowIsoString();

  return workspaceDealScoringMatrixBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "deal-scoring-matrix",
    title: partial.title ?? "Deal scoring matrix",
    deals: partial.deals ?? getDealScoringMatrixDefaultDeals(),
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspacePipelineFunnelBlock(
  partial: Partial<WorkspacePipelineFunnelBlock> = {},
): WorkspacePipelineFunnelBlock {
  const timestamp = getNowIsoString();

  return workspacePipelineFunnelBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "pipeline-funnel",
    title: partial.title ?? "Pipeline funnel",
    deals: partial.deals ?? getPipelineFunnelDefaultDeals(),
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceForecastConfidenceBoardBlock(
  partial: Partial<WorkspaceForecastConfidenceBoardBlock> = {},
): WorkspaceForecastConfidenceBoardBlock {
  const timestamp = getNowIsoString();

  return workspaceForecastConfidenceBoardBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "forecast-confidence-board",
    title: partial.title ?? "Forecast confidence board",
    targetRevenueEgp: partial.targetRevenueEgp ?? 50_000,
    deals: partial.deals ?? getForecastConfidenceDefaultItems(),
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceContentPipelineBlock(
  partial: Partial<WorkspaceContentPipelineBlock> = {},
): WorkspaceContentPipelineBlock {
  const timestamp = getNowIsoString();

  return workspaceContentPipelineBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "content-pipeline",
    title: partial.title ?? "Content pipeline",
    items: partial.items ?? getContentPipelineDefaultItems(),
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceContentQualityRadarBlock(
  partial: Partial<WorkspaceContentQualityRadarBlock> = {},
): WorkspaceContentQualityRadarBlock {
  const timestamp = getNowIsoString();

  return workspaceContentQualityRadarBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "content-quality-radar",
    title: partial.title ?? "Content quality radar",
    scores: partial.scores ?? getContentQualityRadarDefaultScores(),
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceContentRoiTrackerBlock(
  partial: Partial<WorkspaceContentRoiTrackerBlock> = {},
): WorkspaceContentRoiTrackerBlock {
  const timestamp = getNowIsoString();

  return workspaceContentRoiTrackerBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "content-roi-tracker",
    title: partial.title ?? "Content ROI tracker",
    sortBy: partial.sortBy ?? "roi",
    items: partial.items ?? getContentRoiTrackerDefaultItems(),
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceAuthorityScorecardBlock(
  partial: Partial<WorkspaceAuthorityScorecardBlock> = {},
): WorkspaceAuthorityScorecardBlock {
  const timestamp = getNowIsoString();

  return workspaceAuthorityScorecardBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "authority-scorecard",
    title: partial.title ?? "Authority scorecard",
    metrics: normalizeAuthorityScoreMetrics(partial.metrics),
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceHookBankBlock(
  partial: Partial<WorkspaceHookBankBlock> = {},
): WorkspaceHookBankBlock {
  const timestamp = getNowIsoString();

  return workspaceHookBankBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "hook-bank",
    title: partial.title ?? "Hook bank",
    hooks: partial.hooks ?? getHookBankDefaultItems(),
    lastGeneratedAt: partial.lastGeneratedAt ?? null,
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceMessageHouseBlock(
  partial: Partial<WorkspaceMessageHouseBlock> = {},
): WorkspaceMessageHouseBlock {
  const timestamp = getNowIsoString();

  return workspaceMessageHouseBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "message-house",
    title: partial.title ?? "Message house",
    brandPromise: partial.brandPromise ?? getMessageHouseDefaultBrandPromise(),
    pillars: normalizeMessageHousePillars(partial.pillars),
    audiencePains: partial.audiencePains ?? "",
    proofPoints: partial.proofPoints ?? "",
    voicePrinciples: partial.voicePrinciples ?? "",
    latestStressTest: partial.latestStressTest ?? "",
    stressTestUpdatedAt: partial.stressTestUpdatedAt ?? null,
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceScorecardBlock(
  partial: Partial<WorkspaceScorecardBlock> = {},
): WorkspaceScorecardBlock {
  const timestamp = getNowIsoString();

  return workspaceScorecardBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "scorecard",
    title: partial.title ?? "Scorecard",
    metrics: partial.metrics ?? [],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceOkrTrackerBlock(
  partial: Partial<WorkspaceOkrTrackerBlock> = {},
): WorkspaceOkrTrackerBlock {
  const timestamp = getNowIsoString();

  return workspaceOkrTrackerBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "okr-tracker",
    title: partial.title ?? "OKR tracker",
    objectives: partial.objectives ?? [
      createWorkspaceOkrObjective({
        title: "Scale to 250K EGP/month",
        keyResults: [
          createWorkspaceOkrKeyResult({ title: "Close 3 retainers", progress: 33 }),
          createWorkspaceOkrKeyResult({ title: "Average deal size reaches 18K", progress: 60 }),
          createWorkspaceOkrKeyResult({ title: "Keep churn below 10%", progress: 80 }),
        ],
      }),
      createWorkspaceOkrObjective({
        title: "Launch course Q2",
        keyResults: [
          createWorkspaceOkrKeyResult({ title: "Finalize curriculum", progress: 70 }),
          createWorkspaceOkrKeyResult({ title: "Record 6 modules", progress: 33 }),
          createWorkspaceOkrKeyResult({ title: "Ship sales funnel", progress: 10 }),
        ],
      }),
    ],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceDecisionMatrixBlock(
  partial: Partial<WorkspaceDecisionMatrixBlock> = {},
): WorkspaceDecisionMatrixBlock {
  const timestamp = getNowIsoString();
  const criteria = partial.criteria ?? getDecisionMatrixDefaultCriteria();

  return workspaceDecisionMatrixBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "decision-matrix",
    title: partial.title ?? "Decision matrix",
    question: partial.question ?? "What decision are you making?",
    criteria,
    options: partial.options ?? [
      createWorkspaceDecisionMatrixOption({
        label: "Option A",
        scores: createDecisionMatrixScoreMap(criteria, [8, 5, 7]),
      }),
      createWorkspaceDecisionMatrixOption({
        label: "Option B",
        scores: createDecisionMatrixScoreMap(criteria, [6, 8, 5]),
      }),
    ],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceBusinessModelCanvasBlock(
  partial: Partial<WorkspaceBusinessModelCanvasBlock> = {},
): WorkspaceBusinessModelCanvasBlock {
  const timestamp = getNowIsoString();

  return workspaceBusinessModelCanvasBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "business-model-canvas",
    title: partial.title ?? "Business model canvas",
    cells: partial.cells ?? getBusinessModelCanvasDefaultCells(),
    analysis: partial.analysis ?? "",
    analysisUpdatedAt: partial.analysisUpdatedAt ?? null,
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceAssumptionTrackerBlock(
  partial: Partial<WorkspaceAssumptionTrackerBlock> = {},
): WorkspaceAssumptionTrackerBlock {
  const timestamp = getNowIsoString();

  return workspaceAssumptionTrackerBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "assumption-tracker",
    title: partial.title ?? "Assumption tracker",
    filter: partial.filter ?? "all",
    assumptions: partial.assumptions ?? [
      createWorkspaceStrategicAssumption({
        statement: "Senior marketers will pay premium for practical training",
        status: "validating",
        confidence: 4,
        owner: "Growth lead",
        reviewDate: "2026-04-12",
        evidenceNotes: "Discovery calls show demand for practical case-based material.",
      }),
      createWorkspaceStrategicAssumption({
        statement: "Content-led demand can fill the next cohort",
        status: "at-risk",
        confidence: 3,
        owner: "Content lead",
        reviewDate: "2026-04-05",
        evidenceNotes: "Organic pipeline is inconsistent and CAC benchmarks are not proven yet.",
      }),
      createWorkspaceStrategicAssumption({
        statement: "Agency case studies will strengthen conversion rate",
        status: "confirmed",
        confidence: 5,
        owner: "Sales lead",
        reviewDate: "2026-04-20",
        evidenceNotes:
          "Recent calls referenced proof and closed faster after seeing outcome stories.",
      }),
    ],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceProfitabilityCashFlowBlock(
  partial: Partial<WorkspaceProfitabilityCashFlowBlock> = {},
): WorkspaceProfitabilityCashFlowBlock {
  const timestamp = getNowIsoString();

  return workspaceProfitabilityCashFlowBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "profitability-cash-flow",
    title: partial.title ?? "Profitability & cash flow",
    clients: partial.clients ?? getProfitabilityCashFlowDefaultClients(),
    expenses: partial.expenses ?? getProfitabilityCashFlowDefaultExpenses(),
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspacePricingSimulatorBlock(
  partial: Partial<WorkspacePricingSimulatorBlock> = {},
): WorkspacePricingSimulatorBlock {
  const timestamp = getNowIsoString();

  return workspacePricingSimulatorBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "pricing-simulator",
    title: partial.title ?? "Pricing simulator",
    activeClients: partial.activeClients ?? 4,
    hoursPerClientPerMonth: partial.hoursPerClientPerMonth ?? 24,
    hourlyRateEgp: partial.hourlyRateEgp ?? 650,
    monthlyOverheadEgp: partial.monthlyOverheadEgp ?? 85_000,
    targetMarginPercent: partial.targetMarginPercent ?? 35,
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceCollectionsTrackerBlock(
  partial: Partial<WorkspaceCollectionsTrackerBlock> = {},
): WorkspaceCollectionsTrackerBlock {
  const timestamp = getNowIsoString();

  return workspaceCollectionsTrackerBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "collections-tracker",
    title: partial.title ?? "Collections & receivables tracker",
    filter: partial.filter ?? "all",
    invoices: partial.invoices ?? getCollectionsTrackerDefaultInvoices(),
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceCustomBlockTemplate(
  partial: Partial<WorkspaceCustomBlockTemplate> & {
    fields: WorkspaceCustomBlockField[];
    name: string;
  },
): WorkspaceCustomBlockTemplate {
  const timestamp = getNowIsoString();

  return workspaceCustomBlockTemplateSchema.parse({
    id: partial.id ?? createWorkspaceId("template"),
    name: partial.name,
    fields: partial.fields,
    includeNotes: partial.includeNotes ?? false,
    formula: partial.formula ?? null,
    aiPromptTemplate: partial.aiPromptTemplate ?? null,
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceCustomBlock(
  template: WorkspaceCustomBlockTemplate,
  partial: Partial<WorkspaceCustomBlock> = {},
): WorkspaceCustomBlock {
  const timestamp = getNowIsoString();
  const values =
    partial.values ??
    Object.fromEntries(
      template.fields.map((field) => [
        field.key,
        field.type === "checkbox" ? false : field.type === "number" ? 0 : "",
      ]),
    );

  return workspaceCustomBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "custom",
    title: partial.title ?? template.name,
    definitionId: partial.definitionId ?? template.id,
    values,
    notes: partial.notes ?? "",
    latestAiOutput: partial.latestAiOutput ?? "",
    outputHistory: partial.outputHistory ?? [],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceNodeTab(partial: Partial<WorkspaceNodeTab> = {}): WorkspaceNodeTab {
  const timestamp = getNowIsoString();

  return workspaceNodeTabSchema.parse({
    id: partial.id ?? createWorkspaceId("tab"),
    title: partial.title ?? "New tab",
    blocks: partial.blocks ?? [],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceNodeViewState(
  partial: Partial<WorkspaceNodeViewState> = {},
): WorkspaceNodeViewState {
  return workspaceNodeViewStateSchema.parse({
    activeTabId: partial.activeTabId ?? null,
    notePreviewState: partial.notePreviewState ?? {},
  });
}

export function createWorkspaceNodeDashboard(
  partial: Partial<WorkspaceNodeDashboard> = {},
): WorkspaceNodeDashboard {
  return workspaceNodeDashboardSchema.parse({
    tint: partial.tint ?? "neutral",
    featuredBlocks: partial.featuredBlocks ?? [],
  });
}

function normalizeWorkspaceNodeConnections(
  nodeId: string,
  connections: WorkspaceNodeConnection[],
): WorkspaceNodeConnection[] {
  const seenTargetIds = new Set<string>();
  const nextConnections: WorkspaceNodeConnection[] = [];

  for (const connection of connections) {
    const parsed = workspaceNodeConnectionSchema.parse(connection);

    if (parsed.targetNodeId === nodeId || seenTargetIds.has(parsed.targetNodeId)) {
      continue;
    }

    seenTargetIds.add(parsed.targetNodeId);
    nextConnections.push(parsed);
  }

  return nextConnections;
}

export function createWorkspaceNode(
  partial: Partial<WorkspaceNode> & {
    title: string;
  },
): WorkspaceNode {
  const timestamp = getNowIsoString();
  const content = partial.content ?? "";
  const nodeId = partial.id ?? createWorkspaceId("node");

  return normalizeWorkspaceNode({
    id: nodeId,
    title: partial.title,
    content,
    nodeType: partial.nodeType ?? "standard",
    ownerUserId: partial.ownerUserId ?? null,
    visibility: partial.visibility ?? "private",
    teamId: partial.teamId ?? null,
    agencyRef: partial.agencyRef ?? null,
    label: partial.label ?? partial.title,
    x: partial.x ?? 0,
    y: partial.y ?? 0,
    width: partial.width ?? DEFAULT_WORKSPACE_NODE_WIDTH,
    height: partial.height ?? DEFAULT_WORKSPACE_NODE_HEIGHT,
    minWidth: partial.minWidth ?? DEFAULT_WORKSPACE_NODE_MIN_WIDTH,
    minHeight: partial.minHeight ?? DEFAULT_WORKSPACE_NODE_MIN_HEIGHT,
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
    tabs: partial.tabs ?? [createDefaultWorkspaceTab("Overview", content)],
    customBlockTemplates: partial.customBlockTemplates ?? [],
    connections: normalizeWorkspaceNodeConnections(nodeId, partial.connections ?? []),
    viewState: partial.viewState ?? {
      activeTabId: partial.tabs?.[0]?.id ?? null,
      notePreviewState: {},
    },
    dashboard: partial.dashboard ?? {
      tint: "neutral",
      featuredBlocks: [],
    },
  });
}

export function createDefaultWorkspaceTab(title = "Overview", body = "") {
  return createWorkspaceNodeTab({
    title,
    blocks: [createWorkspaceNotesBlock({ title: "Notes", body })],
  });
}

function normalizeWorkspaceTableBlock(
  block: WorkspaceTableBlock | (Partial<WorkspaceTableBlock> & { type: "table" }),
) {
  const columns =
    block.columns && block.columns.length > 0
      ? block.columns.map((column) => workspaceTableColumnSchema.parse(column))
      : createWorkspaceTableBlock().columns;

  return workspaceTableBlockSchema.parse({
    ...block,
    columns,
    rows: (block.rows ?? []).map((row) =>
      workspaceTableRowSchema.parse({
        ...row,
        cells: createWorkspaceTableCellMap(columns, row.cells),
      }),
    ),
  });
}

function normalizeWorkspace2x2MatrixBlock(
  block: Workspace2x2MatrixBlock | (Partial<Workspace2x2MatrixBlock> & { type: "2x2-matrix" }),
) {
  return workspace2x2MatrixBlockSchema.parse({
    ...block,
    xAxisLabel: block.xAxisLabel ?? "Effort",
    xStartLabel: block.xStartLabel ?? "Low",
    xEndLabel: block.xEndLabel ?? "High",
    yAxisLabel: block.yAxisLabel ?? "Impact",
    yStartLabel: block.yStartLabel ?? "Low",
    yEndLabel: block.yEndLabel ?? "High",
    quadrants: createWorkspace2x2MatrixQuadrants(block.quadrants),
  });
}

function normalizeWorkspaceKanbanBlock(
  block: WorkspaceKanbanBlock | (Partial<WorkspaceKanbanBlock> & { type: "kanban" }),
) {
  const columns =
    block.columns && block.columns.length > 0
      ? block.columns.map((column) => workspaceKanbanColumnSchema.parse(column))
      : createWorkspaceKanbanBlock().columns;
  const fallbackColumnId = columns[0]!.id;
  const validColumnIds = new Set(columns.map((column) => column.id));

  return workspaceKanbanBlockSchema.parse({
    ...block,
    columns,
    cards: (block.cards ?? []).map((card) => ({
      ...card,
      columnId: validColumnIds.has(card.columnId) ? card.columnId : fallbackColumnId,
    })),
  });
}

function normalizeWorkspaceDecisionMatrixBlock(
  block:
    | WorkspaceDecisionMatrixBlock
    | (Partial<WorkspaceDecisionMatrixBlock> & { type: "decision-matrix" }),
) {
  const criteria =
    block.criteria && block.criteria.length > 0
      ? block.criteria.map((criterion) => workspaceDecisionMatrixCriterionSchema.parse(criterion))
      : getDecisionMatrixDefaultCriteria();
  const validCriterionIds = new Set(criteria.map((criterion) => criterion.id));
  const options =
    block.options && block.options.length > 0
      ? block.options.map((option) =>
          workspaceDecisionMatrixOptionSchema.parse({
            ...option,
            scores: Object.fromEntries(
              criteria.map((criterion) => [criterion.id, option.scores?.[criterion.id] ?? 5]),
            ),
          }),
        )
      : createWorkspaceDecisionMatrixBlock({ criteria }).options;

  return workspaceDecisionMatrixBlockSchema.parse({
    ...block,
    question: block.question ?? "",
    criteria,
    options: options.map((option) => ({
      ...option,
      scores: Object.fromEntries(
        Object.entries(option.scores).filter(([criterionId]) => validCriterionIds.has(criterionId)),
      ),
    })),
  });
}

function normalizeWorkspaceSkillsHeatMapBlock(
  block:
    | WorkspaceSkillsHeatMapBlock
    | (Partial<WorkspaceSkillsHeatMapBlock> & { type: "skills-heat-map" }),
) {
  const dimensions =
    block.dimensions && block.dimensions.length > 0
      ? block.dimensions.map((dimension) => workspaceSkillsHeatMapDimensionSchema.parse(dimension))
      : getSkillsHeatMapDefaultDimensions();

  return workspaceSkillsHeatMapBlockSchema.parse({
    ...block,
    dimensions,
    members: (block.members ?? []).map((member) => ({
      ...member,
      scores: createWorkspaceSkillsScoreMap(dimensions, member.scores),
    })),
  });
}

function normalizeWorkspaceDelegationMatrixBlock(
  block:
    | WorkspaceDelegationMatrixBlock
    | (Partial<WorkspaceDelegationMatrixBlock> & { type: "delegation-matrix" }),
) {
  return workspaceDelegationMatrixBlockSchema.parse({
    ...block,
    hourlyRate: block.hourlyRate ?? 500,
    items: block.items ?? [],
  });
}

function normalizeWorkspaceTalentGridBlock(
  block: WorkspaceTalentGridBlock | (Partial<WorkspaceTalentGridBlock> & { type: "talent-grid" }),
) {
  return workspaceTalentGridBlockSchema.parse({
    ...block,
    members: block.members ?? [],
  });
}

function normalizeWorkspaceSeatPlannerBlock(
  block:
    | WorkspaceSeatPlannerBlock
    | (Partial<WorkspaceSeatPlannerBlock> & { type: "seat-planner" }),
) {
  return workspaceSeatPlannerBlockSchema.parse({
    ...block,
    filter: block.filter ?? "all",
    seats: block.seats ?? [],
  });
}

export function normalizeWorkspaceNodeTab(tab: WorkspaceNodeTab): WorkspaceNodeTab {
  const parsed = workspaceNodeTabSchema.parse({
    ...tab,
    blocks: tab.blocks ?? [],
  });

  return {
    ...parsed,
    blocks: parsed.blocks
      .map((block) => {
        try {
          return normalizeWorkspaceBlock(block);
        } catch {
          // Filter out blocks with unknown/unsupported types
          return null;
        }
      })
      .filter((block): block is WorkspaceBlock => block !== null),
  };
}

export function normalizeWorkspaceBlock(block: WorkspaceBlock): WorkspaceBlock {
  switch (block.type) {
    case "task-list":
      return workspaceTaskListBlockSchema.parse({
        ...block,
        tasks: block.tasks ?? [],
      });
    case "notes":
      return workspaceNotesBlockSchema.parse({
        ...block,
        body: block.body ?? "",
      });
    case "table":
      return normalizeWorkspaceTableBlock(block);
    case "checklist":
      return workspaceChecklistBlockSchema.parse({
        ...block,
        items: block.items ?? [],
      });
    case "decision":
      return workspaceDecisionBlockSchema.parse({
        ...block,
        pros: block.pros ?? [],
        cons: block.cons ?? [],
        recommendation: block.recommendation ?? "",
      });
    case "pros-cons":
      return workspaceProsConsBlockSchema.parse({
        ...block,
        pros: block.pros ?? [],
        cons: block.cons ?? [],
      });
    case "swot":
      return workspaceSwotBlockSchema.parse({
        ...block,
        cells: createWorkspaceSwotCells(block.cells),
      });
    case "tracker":
      return workspaceTrackerBlockSchema.parse({
        ...block,
        goal: block.goal ?? null,
        entries: block.entries ?? [],
      });
    case "ai-prompt":
      return workspaceAiPromptBlockSchema.parse({
        ...block,
        includeContext: block.includeContext ?? true,
        prompt: block.prompt ?? "",
        latestOutput: block.latestOutput ?? "",
        outputHistory: block.outputHistory ?? [],
      });
    case "habit-grid":
      return workspaceHabitGridBlockSchema.parse({
        ...block,
        habits: (block.habits ?? []).map((habit) => ({
          ...habit,
          days: createWorkspaceHabitGridDays(habit.days),
        })),
      });
    case "process":
      return workspaceProcessBlockSchema.parse({
        ...block,
        steps: block.steps ?? [],
      });
    case "2x2-matrix":
      return normalizeWorkspace2x2MatrixBlock(block);
    case "course-roadmap":
      return workspaceCourseRoadmapBlockSchema.parse({
        ...block,
        courses: block.courses ?? [],
      });
    case "learning-outcomes-matrix":
      return workspaceLearningOutcomesMatrixBlockSchema.parse({
        ...block,
        courseBlockId: block.courseBlockId ?? null,
        courseId: block.courseId ?? null,
        prompt: block.prompt ?? "",
        latestOutput: block.latestOutput ?? "",
        outputHistory: block.outputHistory ?? [],
      });
    case "time-orchestrator":
      return workspaceTimeOrchestratorBlockSchema.parse({
        ...block,
        settings: createWorkspaceTimeOrchestratorSettings(block.settings),
      });
    case "cohort-health-dashboard":
      return workspaceCohortHealthDashboardBlockSchema.parse({
        ...block,
        cohorts: block.cohorts ?? [],
      });
    case "eisenhower-matrix":
      return workspaceEisenhowerMatrixBlockSchema.parse({
        ...block,
        tasks: block.tasks ?? [],
        settings: createWorkspaceTimeOrchestratorSettings(block.settings),
        latestBattlePlan: block.latestBattlePlan ?? "",
        battlePlanUpdatedAt: block.battlePlanUpdatedAt ?? null,
      });
    case "leadership-rhythm-planner":
      return workspaceLeadershipRhythmPlannerBlockSchema.parse({
        ...block,
        filter: createWorkspaceLeadershipRhythmFilter(block.filter),
        meetings: block.meetings ?? [],
      });
    case "kanban":
      return normalizeWorkspaceKanbanBlock(block);
    case "timeline":
      return workspaceTimelineBlockSchema.parse({
        ...block,
        milestones: block.milestones ?? [],
      });
    case "skills-heat-map":
      return normalizeWorkspaceSkillsHeatMapBlock(block);
    case "delegation-matrix":
      return normalizeWorkspaceDelegationMatrixBlock(block);
    case "talent-grid":
      return normalizeWorkspaceTalentGridBlock(block);
    case "seat-planner":
      return normalizeWorkspaceSeatPlannerBlock(block);
    case "deal-scoring-matrix":
      return workspaceDealScoringMatrixBlockSchema.parse({
        ...block,
        deals: block.deals ?? [],
      });
    case "pipeline-funnel":
      return workspacePipelineFunnelBlockSchema.parse({
        ...block,
        deals: block.deals ?? [],
      });
    case "forecast-confidence-board":
      return workspaceForecastConfidenceBoardBlockSchema.parse({
        ...block,
        targetRevenueEgp: block.targetRevenueEgp ?? 50_000,
        deals: block.deals ?? [],
      });
    case "content-pipeline":
      return workspaceContentPipelineBlockSchema.parse({
        ...block,
        items: block.items ?? [],
      });
    case "content-quality-radar":
      return workspaceContentQualityRadarBlockSchema.parse({
        ...block,
        scores: createWorkspaceContentQualityScores(block.scores),
      });
    case "content-roi-tracker":
      return workspaceContentRoiTrackerBlockSchema.parse({
        ...block,
        sortBy: block.sortBy ?? "roi",
        items: block.items ?? [],
      });
    case "authority-scorecard":
      return workspaceAuthorityScorecardBlockSchema.parse({
        ...block,
        metrics: normalizeAuthorityScoreMetrics(block.metrics),
      });
    case "hook-bank":
      return workspaceHookBankBlockSchema.parse({
        ...block,
        hooks: block.hooks ?? [],
        lastGeneratedAt: block.lastGeneratedAt ?? null,
      });
    case "message-house":
      return workspaceMessageHouseBlockSchema.parse({
        ...block,
        brandPromise: block.brandPromise ?? "",
        pillars: normalizeMessageHousePillars(block.pillars),
        audiencePains: block.audiencePains ?? "",
        proofPoints: block.proofPoints ?? "",
        voicePrinciples: block.voicePrinciples ?? "",
        latestStressTest: block.latestStressTest ?? "",
        stressTestUpdatedAt: block.stressTestUpdatedAt ?? null,
      });
    case "scorecard":
      return workspaceScorecardBlockSchema.parse({
        ...block,
        metrics: block.metrics ?? [],
      });
    case "okr-tracker":
      return workspaceOkrTrackerBlockSchema.parse({
        ...block,
        objectives: block.objectives ?? [],
      });
    case "decision-matrix":
      return normalizeWorkspaceDecisionMatrixBlock(block);
    case "business-model-canvas":
      return workspaceBusinessModelCanvasBlockSchema.parse({
        ...block,
        cells: {
          ...getBusinessModelCanvasDefaultCells(),
          ...block.cells,
        },
        analysis: block.analysis ?? "",
        analysisUpdatedAt: block.analysisUpdatedAt ?? null,
      });
    case "assumption-tracker":
      return workspaceAssumptionTrackerBlockSchema.parse({
        ...block,
        filter: block.filter ?? "all",
        assumptions: block.assumptions ?? [],
      });
    case "profitability-cash-flow":
      return workspaceProfitabilityCashFlowBlockSchema.parse({
        ...block,
        clients: block.clients ?? [],
        expenses: block.expenses ?? [],
      });
    case "pricing-simulator":
      return workspacePricingSimulatorBlockSchema.parse({
        ...block,
        activeClients: block.activeClients ?? 4,
        hoursPerClientPerMonth: block.hoursPerClientPerMonth ?? 24,
        hourlyRateEgp: block.hourlyRateEgp ?? 650,
        monthlyOverheadEgp: block.monthlyOverheadEgp ?? 85_000,
        targetMarginPercent: block.targetMarginPercent ?? 35,
      });
    case "collections-tracker":
      return workspaceCollectionsTrackerBlockSchema.parse({
        ...block,
        filter: block.filter ?? "all",
        invoices: block.invoices ?? [],
      });
    case "custom":
      return workspaceCustomBlockSchema.parse({
        ...block,
        values: block.values ?? {},
        notes: block.notes ?? "",
        latestAiOutput: block.latestAiOutput ?? "",
        outputHistory: block.outputHistory ?? [],
      });
    default:
      return assertNever(block);
  }
}

const LEGACY_AGENCY_BLOCK_TYPES = new Set([
  "agency-project-manager",
  "agency-time-tracker",
  "agency-time-entries-log",
  "agency-time-summary",
  "agency-settings",
  "agency-billing-report",
]);

function isLegacyAgencyBlock(block: unknown): boolean {
  const type = (block as Record<string, unknown>).type;
  return typeof type === "string" && LEGACY_AGENCY_BLOCK_TYPES.has(type);
}

export function normalizeWorkspaceNode(node: WorkspaceNode): WorkspaceNode {
  const nodeRecord = node as Record<string, unknown>;
  const rawTabs = Array.isArray(nodeRecord.tabs) ? (nodeRecord.tabs as unknown[]) : [];
  const sanitizedTabs = rawTabs.map((tab: unknown) => {
    const tabRecord = tab as Record<string, unknown>;
    const tabBlocks = Array.isArray(tabRecord.blocks)
      ? (tabRecord.blocks as unknown[]).filter(
          (block: unknown) =>
            !isLegacyAgencyBlock(block) && workspaceBlockSchema.safeParse(block).success,
        )
      : [];

    return {
      ...tabRecord,
      blocks: tabBlocks,
    };
  });

  const parsed = workspaceNodeSchema.parse({
    ...node,
    content: node.content ?? "",
    nodeType: node.nodeType ?? "standard",
    ownerUserId: node.ownerUserId ?? null,
    visibility: node.visibility ?? "private",
    teamId: node.teamId ?? null,
    agencyRef: node.agencyRef ?? null,
    tabs: sanitizedTabs,
    customBlockTemplates: node.customBlockTemplates ?? [],
    connections: node.connections ?? [],
    viewState: node.viewState ?? {},
    dashboard: node.dashboard ?? {},
  });

  const tabs =
    parsed.tabs.length > 0
      ? parsed.tabs.map((tab) => normalizeWorkspaceNodeTab(tab))
      : [createDefaultWorkspaceTab("Overview", parsed.content)];
  const validTabIds = new Set(tabs.map((tab) => tab.id));
  const noteBlockIds = new Set(
    tabs.flatMap((tab) =>
      tab.blocks.flatMap((block) => (block.type === "notes" ? [block.id] : [])),
    ),
  );
  const activeTabId =
    parsed.viewState.activeTabId && validTabIds.has(parsed.viewState.activeTabId)
      ? parsed.viewState.activeTabId
      : (tabs[0]?.id ?? null);
  const notePreviewState = Object.fromEntries(
    Object.entries(parsed.viewState.notePreviewState ?? {}).filter(([blockId]) =>
      noteBlockIds.has(blockId),
    ),
  );
  const featuredBlocks = parsed.dashboard.featuredBlocks.filter(({ tabId, blockId }) =>
    tabs.some((tab) => tab.id === tabId && tab.blocks.some((block) => block.id === blockId)),
  );
  const connections =
    parsed.nodeType === "orchestrator"
      ? normalizeWorkspaceNodeConnections(parsed.id, parsed.connections)
      : [];

  return {
    ...parsed,
    label: parsed.label ?? parsed.title,
    minWidth: parsed.minWidth ?? DEFAULT_WORKSPACE_NODE_MIN_WIDTH,
    minHeight: parsed.minHeight ?? DEFAULT_WORKSPACE_NODE_MIN_HEIGHT,
    tabs,
    customBlockTemplates: parsed.customBlockTemplates.map((template) =>
      workspaceCustomBlockTemplateSchema.parse({
        ...template,
        includeNotes: template.includeNotes ?? false,
        formula: template.formula ?? null,
        aiPromptTemplate: template.aiPromptTemplate ?? null,
      }),
    ),
    viewState: createWorkspaceNodeViewState({
      activeTabId,
      notePreviewState,
    }),
    dashboard: createWorkspaceNodeDashboard({
      tint: parsed.dashboard.tint,
      featuredBlocks,
    }),
    connections,
  };
}

export function cloneWorkspaceNodes(nodes: WorkspaceNode[]) {
  let cloned: WorkspaceNode[];

  try {
    cloned =
      typeof structuredClone === "function"
        ? structuredClone(nodes)
        : JSON.parse(JSON.stringify(nodes));
  } catch {
    // Vue reactive proxies cannot be passed to structuredClone in the browser.
    cloned = JSON.parse(JSON.stringify(nodes));
  }

  return cloned.map((node: WorkspaceNode) => normalizeWorkspaceNode(node));
}

function clonePromptOutputsForInsertion(outputs: WorkspacePromptOutput[]) {
  return outputs.map((entry) =>
    workspacePromptOutputSchema.parse({
      ...entry,
      id: createWorkspaceId("output"),
    }),
  );
}

export function cloneWorkspaceTemplatesForInsertion(
  templates: WorkspaceCustomBlockTemplate[],
  timestamp = getNowIsoString(),
) {
  const templateIdMap = new Map<string, string>();
  const clonedTemplates = templates.map((template) => {
    const nextTemplateId = createWorkspaceId("template");
    templateIdMap.set(template.id, nextTemplateId);

    return workspaceCustomBlockTemplateSchema.parse({
      ...template,
      id: nextTemplateId,
      fields: template.fields.map((field) => ({
        ...field,
        id: createWorkspaceId("field"),
      })),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  });

  return {
    templateIdMap,
    templates: clonedTemplates,
  };
}

export function cloneWorkspaceBlockForInsertion(
  block: WorkspaceBlock,
  templateIdMap = new Map<string, string>(),
  timestamp = getNowIsoString(),
): WorkspaceBlock {
  switch (block.type) {
    case "task-list":
      return workspaceTaskListBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        tasks: block.tasks.map((task) => ({
          ...task,
          id: createWorkspaceId("task"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "notes":
      return workspaceNotesBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "table": {
      const columnIdMap = new Map<string, string>();
      const columns = block.columns.map((column) => {
        const nextColumnId = createWorkspaceId("column");
        columnIdMap.set(column.id, nextColumnId);

        return workspaceTableColumnSchema.parse({
          ...column,
          id: nextColumnId,
        });
      });

      return workspaceTableBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        columns,
        rows: block.rows.map((row) =>
          workspaceTableRowSchema.parse({
            ...row,
            id: createWorkspaceId("row"),
            cells: Object.fromEntries(
              columns.map((column, index) => [
                column.id,
                row.cells[block.columns[index]!.id] ?? "",
              ]),
            ),
          }),
        ),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
    case "checklist":
      return workspaceChecklistBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        items: block.items.map((item) => ({
          ...item,
          id: createWorkspaceId("checklist"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "decision":
      return workspaceDecisionBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        pros: block.pros.map((item) => ({
          ...item,
          id: createWorkspaceId("decision"),
        })),
        cons: block.cons.map((item) => ({
          ...item,
          id: createWorkspaceId("decision"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "pros-cons":
      return workspaceProsConsBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        pros: block.pros.map((item) => ({
          ...item,
          id: createWorkspaceId("pros-cons"),
        })),
        cons: block.cons.map((item) => ({
          ...item,
          id: createWorkspaceId("pros-cons"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "swot":
      return workspaceSwotBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "tracker":
      return workspaceTrackerBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        goal: block.goal ?? null,
        entries: block.entries.map((entry) => ({
          ...entry,
          id: createWorkspaceId("entry"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "ai-prompt":
      return workspaceAiPromptBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        includeContext: block.includeContext ?? true,
        outputHistory: clonePromptOutputsForInsertion(block.outputHistory),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "habit-grid":
      return workspaceHabitGridBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        habits: block.habits.map((habit) => ({
          ...habit,
          id: createWorkspaceId("habit"),
          days: createWorkspaceHabitGridDays(habit.days),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "process":
      return workspaceProcessBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        steps: block.steps.map((step) => ({
          ...step,
          id: createWorkspaceId("step"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "2x2-matrix":
      return workspace2x2MatrixBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        quadrants: workspace2x2MatrixQuadrantsSchema.parse({
          topLeft: {
            ...block.quadrants.topLeft,
            items: block.quadrants.topLeft.items.map((item) => ({
              ...item,
              id: createWorkspaceId("matrix-item"),
            })),
          },
          topRight: {
            ...block.quadrants.topRight,
            items: block.quadrants.topRight.items.map((item) => ({
              ...item,
              id: createWorkspaceId("matrix-item"),
            })),
          },
          bottomLeft: {
            ...block.quadrants.bottomLeft,
            items: block.quadrants.bottomLeft.items.map((item) => ({
              ...item,
              id: createWorkspaceId("matrix-item"),
            })),
          },
          bottomRight: {
            ...block.quadrants.bottomRight,
            items: block.quadrants.bottomRight.items.map((item) => ({
              ...item,
              id: createWorkspaceId("matrix-item"),
            })),
          },
        }),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "course-roadmap":
      return workspaceCourseRoadmapBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        courses: block.courses.map((course) => ({
          ...course,
          id: createWorkspaceId("course"),
          lessons: course.lessons.map((lesson) => ({
            ...lesson,
            id: createWorkspaceId("lesson"),
          })),
          outcomes: course.outcomes.map((outcome) => ({
            ...outcome,
            id: createWorkspaceId("outcome"),
          })),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "learning-outcomes-matrix":
      return workspaceLearningOutcomesMatrixBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        courseBlockId: null,
        courseId: null,
        outputHistory: clonePromptOutputsForInsertion(block.outputHistory),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "time-orchestrator":
      return workspaceTimeOrchestratorBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        settings: createWorkspaceTimeOrchestratorSettings(block.settings),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "cohort-health-dashboard":
      return workspaceCohortHealthDashboardBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        cohorts: block.cohorts.map((cohort) => ({
          ...cohort,
          id: createWorkspaceId("cohort"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "eisenhower-matrix":
      return workspaceEisenhowerMatrixBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        tasks: block.tasks.map((task) => ({
          ...task,
          id: createWorkspaceId("task"),
        })),
        settings: createWorkspaceTimeOrchestratorSettings(block.settings),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "leadership-rhythm-planner":
      return workspaceLeadershipRhythmPlannerBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        meetings: block.meetings.map((meeting) => ({
          ...meeting,
          id: createWorkspaceId("meeting"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "kanban": {
      const columnIdMap = new Map<string, string>();
      const columns = block.columns.map((column) => {
        const nextColumnId = createWorkspaceId("column");
        columnIdMap.set(column.id, nextColumnId);

        return workspaceKanbanColumnSchema.parse({
          ...column,
          id: nextColumnId,
        });
      });
      const fallbackColumnId = columns[0]?.id ?? createWorkspaceId("column");

      return workspaceKanbanBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        columns,
        cards: block.cards.map((card) => ({
          ...card,
          id: createWorkspaceId("card"),
          columnId: columnIdMap.get(card.columnId) ?? fallbackColumnId,
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
    case "timeline":
      return workspaceTimelineBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        milestones: block.milestones.map((milestone) => ({
          ...milestone,
          id: createWorkspaceId("milestone"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "skills-heat-map": {
      const dimensionIdMap = new Map<string, string>();
      const dimensions = block.dimensions.map((dimension) => {
        const nextDimensionId = createWorkspaceId("dimension");
        dimensionIdMap.set(dimension.id, nextDimensionId);

        return {
          ...dimension,
          id: nextDimensionId,
        };
      });

      return workspaceSkillsHeatMapBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        dimensions,
        members: block.members.map((member) => ({
          ...member,
          id: createWorkspaceId("person"),
          scores: Object.fromEntries(
            dimensions.map((dimension, index) => [
              dimension.id,
              member.scores[block.dimensions[index]!.id] ?? 5,
            ]),
          ),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
    case "delegation-matrix":
      return workspaceDelegationMatrixBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        items: block.items.map((item) => ({
          ...item,
          id: createWorkspaceId("delegation"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "talent-grid":
      return workspaceTalentGridBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        members: block.members.map((member) => ({
          ...member,
          id: createWorkspaceId("talent"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "seat-planner":
      return workspaceSeatPlannerBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        seats: block.seats.map((seat) => ({
          ...seat,
          id: createWorkspaceId("seat"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "deal-scoring-matrix":
      return workspaceDealScoringMatrixBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        deals: block.deals.map((deal) => ({
          ...deal,
          id: createWorkspaceId("deal"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "pipeline-funnel":
      return workspacePipelineFunnelBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        deals: block.deals.map((deal) => ({
          ...deal,
          id: createWorkspaceId("funnel-deal"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "forecast-confidence-board":
      return workspaceForecastConfidenceBoardBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        deals: block.deals.map((deal) => ({
          ...deal,
          id: createWorkspaceId("forecast"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "content-pipeline":
      return workspaceContentPipelineBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        items: block.items.map((item) => ({
          ...item,
          id: createWorkspaceId("content"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "content-quality-radar":
      return workspaceContentQualityRadarBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        scores: createWorkspaceContentQualityScores(block.scores),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "content-roi-tracker":
      return workspaceContentRoiTrackerBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        items: block.items.map((item) => ({
          ...item,
          id: createWorkspaceId("content-roi"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "authority-scorecard":
      return workspaceAuthorityScorecardBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        metrics: normalizeAuthorityScoreMetrics(block.metrics),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "hook-bank":
      return workspaceHookBankBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        hooks: block.hooks.map((hook) => ({
          ...hook,
          id: createWorkspaceId("hook"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "message-house":
      return workspaceMessageHouseBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        pillars: block.pillars.map((pillar) => ({
          ...pillar,
          id: createWorkspaceId("pillar"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "scorecard":
      return workspaceScorecardBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        metrics: block.metrics.map((metric) => ({
          ...metric,
          id: createWorkspaceId("metric"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "okr-tracker":
      return workspaceOkrTrackerBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        objectives: block.objectives.map((objective) => ({
          ...objective,
          id: createWorkspaceId("objective"),
          keyResults: objective.keyResults.map((keyResult) => ({
            ...keyResult,
            id: createWorkspaceId("key-result"),
          })),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "decision-matrix": {
      const criteria = block.criteria.map((criterion) => {
        const nextCriterionId = createWorkspaceId("criterion");

        return {
          ...criterion,
          id: nextCriterionId,
        };
      });

      return workspaceDecisionMatrixBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        criteria,
        options: block.options.map((option) => ({
          ...option,
          id: createWorkspaceId("option"),
          scores: Object.fromEntries(
            criteria.map((criterion, index) => [
              criterion.id,
              option.scores[block.criteria[index]!.id] ?? 5,
            ]),
          ),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
    case "business-model-canvas":
      return workspaceBusinessModelCanvasBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "assumption-tracker":
      return workspaceAssumptionTrackerBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        assumptions: block.assumptions.map((assumption) => ({
          ...assumption,
          id: createWorkspaceId("assumption"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "profitability-cash-flow":
      return workspaceProfitabilityCashFlowBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        clients: block.clients.map((client) => ({
          ...client,
          id: createWorkspaceId("client"),
        })),
        expenses: block.expenses.map((expense) => ({
          ...expense,
          id: createWorkspaceId("expense"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "pricing-simulator":
      return workspacePricingSimulatorBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "collections-tracker":
      return workspaceCollectionsTrackerBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        invoices: block.invoices.map((invoice) => ({
          ...invoice,
          id: createWorkspaceId("invoice"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "custom":
      return workspaceCustomBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        definitionId: templateIdMap.get(block.definitionId) ?? block.definitionId,
        outputHistory: clonePromptOutputsForInsertion(block.outputHistory),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    default:
      return assertNever(block);
  }
}

export function cloneWorkspaceTabForInsertion(
  tab: WorkspaceNodeTab,
  templateIdMap = new Map<string, string>(),
  timestamp = getNowIsoString(),
): WorkspaceNodeTab {
  return workspaceNodeTabSchema.parse({
    ...tab,
    id: createWorkspaceId("tab"),
    blocks: tab.blocks
      .map((block) => {
        try {
          return cloneWorkspaceBlockForInsertion(block, templateIdMap, timestamp);
        } catch {
          // Filter out blocks with unknown/unsupported types
          return null;
        }
      })
      .filter((block): block is WorkspaceBlock => block !== null),
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function cloneWorkspaceNodeForInsertion(
  node: WorkspaceNode,
  timestamp = getNowIsoString(),
): WorkspaceNode {
  const { templateIdMap, templates } = cloneWorkspaceTemplatesForInsertion(
    node.customBlockTemplates,
    timestamp,
  );
  const tabIdMap = new Map<string, string>();
  const blockIdMap = new Map<string, string>();
  const tabs = node.tabs.map((tab) => {
    const clonedTab = cloneWorkspaceTabForInsertion(tab, templateIdMap, timestamp);
    tabIdMap.set(tab.id, clonedTab.id);
    tab.blocks.forEach((block, index) => {
      const clonedBlockId = clonedTab.blocks[index]?.id;

      if (clonedBlockId) {
        blockIdMap.set(block.id, clonedBlockId);
      }
    });
    return clonedTab;
  });
  const activeTabId =
    node.viewState.activeTabId && tabIdMap.has(node.viewState.activeTabId)
      ? (tabIdMap.get(node.viewState.activeTabId) ?? tabs[0]?.id ?? null)
      : (tabs[0]?.id ?? null);
  const featuredBlocks = node.dashboard.featuredBlocks.flatMap((selection) => {
    const nextTabId = tabIdMap.get(selection.tabId);
    const nextBlockId = blockIdMap.get(selection.blockId);

    if (!nextTabId || !nextBlockId) {
      return [];
    }

    return [
      {
        tabId: nextTabId,
        blockId: nextBlockId,
      },
    ];
  });

  return normalizeWorkspaceNode({
    ...node,
    id: createWorkspaceId("node"),
    createdAt: timestamp,
    updatedAt: timestamp,
    label: node.title,
    tabs,
    customBlockTemplates: templates,
    viewState: {
      activeTabId,
      notePreviewState: {},
    },
    dashboard: {
      tint: node.dashboard.tint,
      featuredBlocks,
    },
  });
}
