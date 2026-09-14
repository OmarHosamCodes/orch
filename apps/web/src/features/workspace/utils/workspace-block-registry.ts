import type { WorkspaceBlock } from "@orch/workspace";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
  BadgeCheck,
  BadgePercent,
  Blocks,
  Blinds,
  BookOpen,
  CalendarDays,
  CalendarRange,
  ChartArea,
  ChartColumn,
  CircleDollarSign,
  Columns3,
  FlaskConical,
  Funnel,
  Gauge,
  GraduationCap,
  Grid2x2,
  Grid3x3,
  House,
  LayoutGrid,
  LayoutTemplate,
  ListChecks,
  ListOrdered,
  Megaphone,
  NotebookTabs,
  Quote,
  ReceiptText,
  Repeat,
  Scale,
  SlidersHorizontal,
  Sparkles,
  Table,
  Target,
  Users,
  Wallet,
  Waypoints,
} from "lucide-react";
import { lazy, type ComponentType, type LazyExoticComponent } from "react";

type WorkspaceBlockEditorComponent = ComponentType<{
  block: WorkspaceBlock;
  tabId: string;
}>;

function lazyBlockEditor(
  importer: () => Promise<Record<string, unknown>>,
  exportName: string,
): LazyExoticComponent<WorkspaceBlockEditorComponent> {
  return lazy(() =>
    importer().then((module) => ({
      default: module[exportName] as WorkspaceBlockEditorComponent,
    })),
  );
}

const WorkspaceTaskListBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-task-list-block-editor"),
  "WorkspaceTaskListBlockEditor",
);
const WorkspaceNotesBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-notes-block-editor"),
  "WorkspaceNotesBlockEditor",
);
const WorkspaceTableBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-table-block-editor"),
  "WorkspaceTableBlockEditor",
);
const WorkspaceChecklistBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-checklist-block-editor"),
  "WorkspaceChecklistBlockEditor",
);
const WorkspaceDecisionBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-decision-block-editor"),
  "WorkspaceDecisionBlockEditor",
);
const WorkspaceProsConsBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-pros-cons-block-editor"),
  "WorkspaceProsConsBlockEditor",
);
const WorkspaceSwotBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-swot-block-editor"),
  "WorkspaceSwotBlockEditor",
);
const WorkspaceTrackerBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-tracker-block-editor"),
  "WorkspaceTrackerBlockEditor",
);
const WorkspaceAiPromptBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-ai-prompt-block-editor"),
  "WorkspaceAiPromptBlockEditor",
);
const WorkspaceHabitGridBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-habit-grid-block-editor"),
  "WorkspaceHabitGridBlockEditor",
);
const WorkspaceProcessBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-process-block-editor"),
  "WorkspaceProcessBlockEditor",
);
const Workspace2x2MatrixBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-2x2-matrix-block-editor"),
  "Workspace2x2MatrixBlockEditor",
);
const WorkspaceCourseRoadmapBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-course-roadmap-block-editor"),
  "WorkspaceCourseRoadmapBlockEditor",
);
const WorkspaceLearningOutcomesMatrixBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-learning-outcomes-matrix-block-editor"),
  "WorkspaceLearningOutcomesMatrixBlockEditor",
);
const WorkspaceTimeOrchestratorBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-time-orchestrator-block-editor"),
  "WorkspaceTimeOrchestratorBlockEditor",
);
const WorkspaceCohortHealthDashboardBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-cohort-health-dashboard-block-editor"),
  "WorkspaceCohortHealthDashboardBlockEditor",
);
const WorkspaceEisenhowerMatrixBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-eisenhower-matrix-block-editor"),
  "WorkspaceEisenhowerMatrixBlockEditor",
);
const WorkspaceLeadershipRhythmPlannerBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-leadership-rhythm-planner-block-editor"),
  "WorkspaceLeadershipRhythmPlannerBlockEditor",
);
const WorkspaceKanbanBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-kanban-block-editor"),
  "WorkspaceKanbanBlockEditor",
);
const WorkspaceTimelineBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-timeline-block-editor"),
  "WorkspaceTimelineBlockEditor",
);
const WorkspaceSkillsHeatMapBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-skills-heat-map-block-editor"),
  "WorkspaceSkillsHeatMapBlockEditor",
);
const WorkspaceDelegationMatrixBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-delegation-matrix-block-editor"),
  "WorkspaceDelegationMatrixBlockEditor",
);
const WorkspaceTalentGridBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-talent-grid-block-editor"),
  "WorkspaceTalentGridBlockEditor",
);
const WorkspaceSeatPlannerBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-seat-planner-block-editor"),
  "WorkspaceSeatPlannerBlockEditor",
);
const WorkspaceDealScoringMatrixBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-deal-scoring-matrix-block-editor"),
  "WorkspaceDealScoringMatrixBlockEditor",
);
const WorkspacePipelineFunnelBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-pipeline-funnel-block-editor"),
  "WorkspacePipelineFunnelBlockEditor",
);
const WorkspaceForecastConfidenceBoardBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-forecast-confidence-board-block-editor"),
  "WorkspaceForecastConfidenceBoardBlockEditor",
);
const WorkspaceContentPipelineBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-content-pipeline-block-editor"),
  "WorkspaceContentPipelineBlockEditor",
);
const WorkspaceContentQualityRadarBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-content-quality-radar-block-editor"),
  "WorkspaceContentQualityRadarBlockEditor",
);
const WorkspaceContentRoiTrackerBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-content-roi-tracker-block-editor"),
  "WorkspaceContentRoiTrackerBlockEditor",
);
const WorkspaceAuthorityScorecardBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-authority-scorecard-block-editor"),
  "WorkspaceAuthorityScorecardBlockEditor",
);
const WorkspaceHookBankBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-hook-bank-block-editor"),
  "WorkspaceHookBankBlockEditor",
);
const WorkspaceMessageHouseBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-message-house-block-editor"),
  "WorkspaceMessageHouseBlockEditor",
);
const WorkspaceScorecardBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-scorecard-block-editor"),
  "WorkspaceScorecardBlockEditor",
);
const WorkspaceOkrTrackerBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-okr-tracker-block-editor"),
  "WorkspaceOkrTrackerBlockEditor",
);
const WorkspaceDecisionMatrixBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-decision-matrix-block-editor"),
  "WorkspaceDecisionMatrixBlockEditor",
);
const WorkspaceBusinessModelCanvasBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-business-model-canvas-block-editor"),
  "WorkspaceBusinessModelCanvasBlockEditor",
);
const WorkspaceAssumptionTrackerBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-assumption-tracker-block-editor"),
  "WorkspaceAssumptionTrackerBlockEditor",
);
const WorkspaceProfitabilityCashFlowBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-profitability-cash-flow-block-editor"),
  "WorkspaceProfitabilityCashFlowBlockEditor",
);
const WorkspacePricingSimulatorBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-pricing-simulator-block-editor"),
  "WorkspacePricingSimulatorBlockEditor",
);
const WorkspaceCollectionsTrackerBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-collections-tracker-block-editor"),
  "WorkspaceCollectionsTrackerBlockEditor",
);
const WorkspaceCustomBlockEditor = lazyBlockEditor(
  () => import("@/features/workspace/node/blocks/workspace-custom-block-editor"),
  "WorkspaceCustomBlockEditor",
);

export type WorkspaceBlockRegistryEntry = {
  component: LazyExoticComponent<WorkspaceBlockEditorComponent>;
  label: string;
  icon: LucideIcon;
  addGroup: "primary" | "secondary" | null;
};

const workspaceBlockRegistry = {
  "task-list": {
    component: WorkspaceTaskListBlockEditor,
    label: "Task list",
    icon: ListChecks,
    addGroup: "primary",
  },
  notes: {
    component: WorkspaceNotesBlockEditor,
    label: "Notes",
    icon: NotebookTabs,
    addGroup: "primary",
  },
  table: {
    component: WorkspaceTableBlockEditor,
    label: "Table",
    icon: Table,
    addGroup: "secondary",
  },
  checklist: {
    component: WorkspaceChecklistBlockEditor,
    label: "Checklist",
    icon: ListChecks,
    addGroup: "secondary",
  },
  decision: {
    component: WorkspaceDecisionBlockEditor,
    label: "Decision",
    icon: Scale,
    addGroup: "primary",
  },
  "pros-cons": {
    component: WorkspaceProsConsBlockEditor,
    label: "Pros & cons",
    icon: Scale,
    addGroup: "secondary",
  },
  swot: {
    component: WorkspaceSwotBlockEditor,
    label: "SWOT",
    icon: LayoutGrid,
    addGroup: "secondary",
  },
  tracker: {
    component: WorkspaceTrackerBlockEditor,
    label: "Tracker",
    icon: ChartColumn,
    addGroup: "secondary",
  },
  "ai-prompt": {
    component: WorkspaceAiPromptBlockEditor,
    label: "AI prompt",
    icon: Sparkles,
    addGroup: "secondary",
  },
  "habit-grid": {
    component: WorkspaceHabitGridBlockEditor,
    label: "Habit grid",
    icon: CalendarDays,
    addGroup: "secondary",
  },
  process: {
    component: WorkspaceProcessBlockEditor,
    label: "Process",
    icon: ListOrdered,
    addGroup: "secondary",
  },
  "2x2-matrix": {
    component: Workspace2x2MatrixBlockEditor,
    label: "2x2 matrix",
    icon: Grid2x2,
    addGroup: "secondary",
  },
  "course-roadmap": {
    component: WorkspaceCourseRoadmapBlockEditor,
    label: "Course roadmap",
    icon: BookOpen,
    addGroup: "secondary",
  },
  "learning-outcomes-matrix": {
    component: WorkspaceLearningOutcomesMatrixBlockEditor,
    label: "Learning outcomes matrix",
    icon: GraduationCap,
    addGroup: "secondary",
  },
  "time-orchestrator": {
    component: WorkspaceTimeOrchestratorBlockEditor,
    label: "Time orchestrator",
    icon: CalendarRange,
    addGroup: "secondary",
  },
  "cohort-health-dashboard": {
    component: WorkspaceCohortHealthDashboardBlockEditor,
    label: "Cohort health dashboard",
    icon: Users,
    addGroup: "secondary",
  },
  "eisenhower-matrix": {
    component: WorkspaceEisenhowerMatrixBlockEditor,
    label: "Eisenhower matrix",
    icon: LayoutGrid,
    addGroup: "secondary",
  },
  "leadership-rhythm-planner": {
    component: WorkspaceLeadershipRhythmPlannerBlockEditor,
    label: "Leadership rhythm planner",
    icon: Repeat,
    addGroup: "secondary",
  },
  kanban: {
    component: WorkspaceKanbanBlockEditor,
    label: "Kanban",
    icon: Columns3,
    addGroup: "secondary",
  },
  timeline: {
    component: WorkspaceTimelineBlockEditor,
    label: "Timeline",
    icon: Waypoints,
    addGroup: "secondary",
  },
  "skills-heat-map": {
    component: WorkspaceSkillsHeatMapBlockEditor,
    label: "Skills heat map",
    icon: Grid3x3,
    addGroup: "secondary",
  },
  "delegation-matrix": {
    component: WorkspaceDelegationMatrixBlockEditor,
    label: "Delegation matrix",
    icon: ArrowRightLeft,
    addGroup: "secondary",
  },
  "talent-grid": {
    component: WorkspaceTalentGridBlockEditor,
    label: "9-box talent grid",
    icon: LayoutGrid,
    addGroup: "secondary",
  },
  "seat-planner": {
    component: WorkspaceSeatPlannerBlockEditor,
    label: "Seat ownership planner",
    icon: Blinds,
    addGroup: "secondary",
  },
  "deal-scoring-matrix": {
    component: WorkspaceDealScoringMatrixBlockEditor,
    label: "Deal scoring matrix",
    icon: BadgePercent,
    addGroup: "secondary",
  },
  "pipeline-funnel": {
    component: WorkspacePipelineFunnelBlockEditor,
    label: "Pipeline funnel",
    icon: Funnel,
    addGroup: "secondary",
  },
  "forecast-confidence-board": {
    component: WorkspaceForecastConfidenceBoardBlockEditor,
    label: "Forecast confidence board",
    icon: CircleDollarSign,
    addGroup: "secondary",
  },
  "content-pipeline": {
    component: WorkspaceContentPipelineBlockEditor,
    label: "Content pipeline",
    icon: Megaphone,
    addGroup: "secondary",
  },
  "content-quality-radar": {
    component: WorkspaceContentQualityRadarBlockEditor,
    label: "Content quality radar",
    icon: ChartArea,
    addGroup: "secondary",
  },
  "content-roi-tracker": {
    component: WorkspaceContentRoiTrackerBlockEditor,
    label: "Content ROI tracker",
    icon: ChartColumn,
    addGroup: "secondary",
  },
  "authority-scorecard": {
    component: WorkspaceAuthorityScorecardBlockEditor,
    label: "Authority scorecard",
    icon: BadgeCheck,
    addGroup: "secondary",
  },
  "hook-bank": {
    component: WorkspaceHookBankBlockEditor,
    label: "Hook bank",
    icon: Quote,
    addGroup: "secondary",
  },
  "message-house": {
    component: WorkspaceMessageHouseBlockEditor,
    label: "Message house",
    icon: House,
    addGroup: "secondary",
  },
  scorecard: {
    component: WorkspaceScorecardBlockEditor,
    label: "Scorecard",
    icon: Gauge,
    addGroup: "secondary",
  },
  "okr-tracker": {
    component: WorkspaceOkrTrackerBlockEditor,
    label: "OKR tracker",
    icon: Target,
    addGroup: "secondary",
  },
  "decision-matrix": {
    component: WorkspaceDecisionMatrixBlockEditor,
    label: "Decision matrix",
    icon: Grid2x2,
    addGroup: "secondary",
  },
  "business-model-canvas": {
    component: WorkspaceBusinessModelCanvasBlockEditor,
    label: "Business model canvas",
    icon: LayoutTemplate,
    addGroup: "secondary",
  },
  "assumption-tracker": {
    component: WorkspaceAssumptionTrackerBlockEditor,
    label: "Assumption tracker",
    icon: FlaskConical,
    addGroup: "secondary",
  },
  "profitability-cash-flow": {
    component: WorkspaceProfitabilityCashFlowBlockEditor,
    label: "Profitability & cash flow",
    icon: Wallet,
    addGroup: "secondary",
  },
  "pricing-simulator": {
    component: WorkspacePricingSimulatorBlockEditor,
    label: "Pricing simulator",
    icon: SlidersHorizontal,
    addGroup: "secondary",
  },
  "collections-tracker": {
    component: WorkspaceCollectionsTrackerBlockEditor,
    label: "Collections tracker",
    icon: ReceiptText,
    addGroup: "secondary",
  },
  custom: {
    component: WorkspaceCustomBlockEditor,
    label: "Legacy custom",
    icon: Blocks,
    addGroup: null,
  },
} satisfies Record<WorkspaceBlock["type"], WorkspaceBlockRegistryEntry>;

export const workspacePrimaryBlockTypes = Object.entries(workspaceBlockRegistry)
  .filter(([, entry]) => entry.addGroup === "primary")
  .map(([type]) => type) as Array<
  Extract<WorkspaceBlock["type"], "task-list" | "notes" | "decision">
>;

export function getWorkspaceBlockRegistryEntry(type: WorkspaceBlock["type"]) {
  return workspaceBlockRegistry[type];
}
