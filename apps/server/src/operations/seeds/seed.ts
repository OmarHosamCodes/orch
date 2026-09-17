import { ensurePersonalAgency } from "@orch/api/routers/team/ensure-personal-agency";
import { auth, registerPersonalAgencyOnUserCreate } from "@orch/auth";
import { db } from "@orch/db";
import { dashboardWorkspace, user, workspaceMarketplaceItem } from "@orch/db/schema";
import { env, primaryCorsOrigin } from "@orch/env/server";
import {
  cloneWorkspaceNodes,
  createWorkspace2x2MatrixBlock,
  createWorkspaceAiPromptBlock,
  createWorkspaceAssumptionTrackerBlock,
  createWorkspaceAuthorityScorecardBlock,
  createWorkspaceBusinessModelCanvasBlock,
  createWorkspaceChecklistBlock,
  createWorkspaceCohortHealthDashboardBlock,
  createWorkspaceCollectionsTrackerBlock,
  createWorkspaceContentPipelineBlock,
  createWorkspaceContentQualityRadarBlock,
  createWorkspaceContentRoiTrackerBlock,
  createWorkspaceCourseRoadmapBlock,
  createWorkspaceCustomBlock,
  createWorkspaceCustomBlockTemplate,
  createWorkspaceDealScoringMatrixBlock,
  createWorkspaceDecisionBlock,
  createWorkspaceDecisionMatrixBlock,
  createWorkspaceDelegationMatrixBlock,
  createWorkspaceEisenhowerMatrixBlock,
  createWorkspaceForecastConfidenceBoardBlock,
  createWorkspaceHabitGridBlock,
  createWorkspaceHookBankBlock,
  createWorkspaceKanbanBlock,
  createWorkspaceKanbanCard,
  createWorkspaceKanbanColumn,
  createWorkspaceLeadershipRhythmPlannerBlock,
  createWorkspaceLearningOutcomesMatrixBlock,
  createWorkspaceMessageHouseBlock,
  createWorkspaceNodeTab,
  createWorkspaceNotesBlock,
  createWorkspaceOkrKeyResult,
  createWorkspaceOkrObjective,
  createWorkspaceOkrTrackerBlock,
  createWorkspacePipelineFunnelBlock,
  createWorkspacePricingSimulatorBlock,
  createWorkspaceProcessBlock,
  createWorkspaceProfitabilityCashFlowBlock,
  createWorkspaceProsConsBlock,
  createWorkspaceScorecardBlock,
  createWorkspaceScorecardMetric,
  createWorkspaceSeatPlannerBlock,
  createWorkspaceSkillsHeatMapBlock,
  createWorkspaceStrategicAssumption,
  createWorkspaceSwotBlock,
  createWorkspaceTableBlock,
  createWorkspaceTalentGridBlock,
  createWorkspaceTask,
  createWorkspaceTaskListBlock,
  createWorkspaceTimelineBlock,
  createWorkspaceTimelineMilestone,
  createWorkspaceTimeOrchestratorBlock,
  createWorkspaceTrackerBlock,
  normalizeWorkspaceNode,
  workspaceBlockCategories,
  workspaceMarketplaceItemSchema,
  type WorkspaceBlockCategoryBlockType,
  type WorkspaceCustomBlock,
  type WorkspaceCustomBlockTemplate,
  type WorkspaceKanbanBlock,
  type WorkspaceMarketplaceItem,
  type WorkspaceNode,
  type WorkspaceNodeConnection,
  type WorkspaceNodeTab,
  type WorkspaceNodeTint,
  type WorkspaceNodeType,
  type WorkspaceScorecardBlock,
} from "@orch/workspace";
import { eq, inArray } from "drizzle-orm";

const DEFAULT_SEED_PASSWORD = "orch1234";

registerPersonalAgencyOnUserCreate(ensurePersonalAgency);

type SeedUserKey = "founder" | "ops" | "analyst";

type SeedUserDefinition = {
  key: SeedUserKey;
  name: string;
  email: string;
};

type SeedUserRecord = SeedUserDefinition & {
  id: string;
  password: string;
};

type SeedActor = {
  id: string;
  name: string;
  email: string;
};

type SeedCliOptions = {
  email: string | null;
  help: boolean;
  scale: "default" | "massive";
};

type SeedContent = {
  shared: {
    blockCatalogNode: WorkspaceNode;
  };
  founder: {
    nodes: WorkspaceNode[];
    launchNode: WorkspaceNode;
    decisionTab: WorkspaceNodeTab;
    experimentTemplate: WorkspaceCustomBlockTemplate;
    experimentBriefBlock: WorkspaceCustomBlock;
  };
  ops: {
    nodes: WorkspaceNode[];
    opsReviewNode: WorkspaceNode;
    supportQueueBlock: WorkspaceKanbanBlock;
  };
  analyst: {
    nodes: WorkspaceNode[];
    executiveScorecardBlock: WorkspaceScorecardBlock;
  };
};

const SEED_USERS: SeedUserDefinition[] = [
  {
    key: "founder",
    name: "Avery Founder",
    email: "founder@orch.test",
  },
  {
    key: "ops",
    name: "Mina Operator",
    email: "ops@orch.test",
  },
  {
    key: "analyst",
    name: "Noah Analyst",
    email: "analyst@orch.test",
  },
];

const GRID_MAX_WIDTH = 1280;
const GRID_START_X = 40;
const GRID_START_Y = 32;
const GRID_COLUMN_GAP = 56;
const GRID_ROW_GAP = 72;

type SeedCatalogBlock = WorkspaceNodeTab["blocks"][number];

const categorizedBlockFactories: Record<
  WorkspaceBlockCategoryBlockType,
  (partial: { id: string; title: string; createdAt: string; updatedAt: string }) => SeedCatalogBlock
> = {
  "2x2-matrix": createWorkspace2x2MatrixBlock,
  "ai-prompt": createWorkspaceAiPromptBlock,
  "assumption-tracker": createWorkspaceAssumptionTrackerBlock,
  "authority-scorecard": createWorkspaceAuthorityScorecardBlock,
  "business-model-canvas": createWorkspaceBusinessModelCanvasBlock,
  checklist: createWorkspaceChecklistBlock,
  "cohort-health-dashboard": createWorkspaceCohortHealthDashboardBlock,
  "collections-tracker": createWorkspaceCollectionsTrackerBlock,
  "content-pipeline": createWorkspaceContentPipelineBlock,
  "content-quality-radar": createWorkspaceContentQualityRadarBlock,
  "content-roi-tracker": createWorkspaceContentRoiTrackerBlock,
  "course-roadmap": createWorkspaceCourseRoadmapBlock,
  "deal-scoring-matrix": createWorkspaceDealScoringMatrixBlock,
  "decision-matrix": createWorkspaceDecisionMatrixBlock,
  "delegation-matrix": createWorkspaceDelegationMatrixBlock,
  "eisenhower-matrix": createWorkspaceEisenhowerMatrixBlock,
  "forecast-confidence-board": createWorkspaceForecastConfidenceBoardBlock,
  "habit-grid": createWorkspaceHabitGridBlock,
  "hook-bank": createWorkspaceHookBankBlock,
  kanban: createWorkspaceKanbanBlock,
  "leadership-rhythm-planner": createWorkspaceLeadershipRhythmPlannerBlock,
  "learning-outcomes-matrix": createWorkspaceLearningOutcomesMatrixBlock,
  "message-house": createWorkspaceMessageHouseBlock,
  "okr-tracker": createWorkspaceOkrTrackerBlock,
  "pipeline-funnel": createWorkspacePipelineFunnelBlock,
  "pricing-simulator": createWorkspacePricingSimulatorBlock,
  process: createWorkspaceProcessBlock,
  "profitability-cash-flow": createWorkspaceProfitabilityCashFlowBlock,
  "pros-cons": createWorkspaceProsConsBlock,
  scorecard: createWorkspaceScorecardBlock,
  "seat-planner": createWorkspaceSeatPlannerBlock,
  "skills-heat-map": createWorkspaceSkillsHeatMapBlock,
  swot: createWorkspaceSwotBlock,
  table: createWorkspaceTableBlock,
  "talent-grid": createWorkspaceTalentGridBlock,
  "time-orchestrator": createWorkspaceTimeOrchestratorBlock,
  timeline: createWorkspaceTimelineBlock,
  tracker: createWorkspaceTrackerBlock,
};

function seedId(...parts: string[]) {
  return `seed-${parts.join("-")}`;
}

function shiftDate(
  date: Date,
  options: {
    days?: number;
    hours?: number;
    minutes?: number;
  } = {},
) {
  const { days = 0, hours = 0, minutes = 0 } = options;
  return new Date(
    date.getTime() + days * 24 * 60 * 60 * 1000 + hours * 60 * 60 * 1000 + minutes * 60 * 1000,
  );
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isoDateFromNow(now: Date, days: number) {
  return toIsoDate(shiftDate(now, { days }));
}

function isoTimestampFromNow(
  now: Date,
  options: {
    days?: number;
    hours?: number;
    minutes?: number;
  } = {},
) {
  return shiftDate(now, options).toISOString();
}

function createSeedNode({
  id,
  title,
  x,
  y,
  width,
  height,
  createdAt,
  updatedAt,
  tabs,
  customBlockTemplates = [],
  nodeType = "standard",
  connections = [],
  tint = "neutral",
  featuredBlocks = [],
}: {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
  tabs: WorkspaceNodeTab[];
  customBlockTemplates?: WorkspaceCustomBlockTemplate[];
  nodeType?: WorkspaceNodeType;
  connections?: WorkspaceNodeConnection[];
  tint?: WorkspaceNodeTint;
  featuredBlocks?: WorkspaceNode["dashboard"]["featuredBlocks"];
}) {
  return normalizeWorkspaceNode({
    id,
    title,
    content: "",
    nodeType,
    visibility: "private",
    ownerUserId: null,
    teamId: null,
    label: title,
    x,
    y,
    width,
    height,
    createdAt,
    updatedAt,
    tabs,
    customBlockTemplates,
    connections,
    viewState: {
      activeTabId: tabs[0]?.id ?? null,
      notePreviewState: {},
    },
    dashboard: {
      tint,
      featuredBlocks,
    },
  });
}

function createBlockCatalogNode(now: Date) {
  const strategyObjectiveId = seedId("catalog", "okr", "objective", "scale");
  const strategyOkrBlockId = seedId("catalog", "block", "strategy", "okr-tracker");
  const strategyDecisionBlockId = seedId("catalog", "block", "strategy", "decision-matrix");
  const strategyBmcBlockId = seedId("catalog", "block", "strategy", "business-model-canvas");
  const strategyAssumptionBlockId = seedId("catalog", "block", "strategy", "assumption-tracker");
  const strategyTabId = seedId("catalog", "tab", "strategy");

  const tabs = workspaceBlockCategories.map((category, categoryIndex) => {
    if (category.id === "strategy") {
      return createWorkspaceNodeTab({
        id: strategyTabId,
        title: category.label,
        createdAt: isoTimestampFromNow(now, { days: -1 }),
        updatedAt: isoTimestampFromNow(now, { hours: -(categoryIndex + 1) }),
        blocks: [
          createWorkspaceOkrTrackerBlock({
            id: strategyOkrBlockId,
            title: "OKR tracker",
            createdAt: isoTimestampFromNow(now, { days: -1 }),
            updatedAt: isoTimestampFromNow(now, { hours: -(categoryIndex + 1) }),
            objectives: [
              createWorkspaceOkrObjective({
                id: strategyObjectiveId,
                title: "Scale to 250K EGP/month",
                keyResults: [
                  createWorkspaceOkrKeyResult({ title: "Close 3 retainers", progress: 33 }),
                  createWorkspaceOkrKeyResult({
                    title: "Average deal size reaches 18K",
                    progress: 60,
                  }),
                  createWorkspaceOkrKeyResult({ title: "Keep churn below 10%", progress: 80 }),
                ],
              }),
              createWorkspaceOkrObjective({
                id: seedId("catalog", "okr", "objective", "course"),
                title: "Launch course Q2",
                keyResults: [
                  createWorkspaceOkrKeyResult({ title: "Finalize curriculum", progress: 70 }),
                  createWorkspaceOkrKeyResult({ title: "Record 6 modules", progress: 33 }),
                  createWorkspaceOkrKeyResult({ title: "Ship sales funnel", progress: 10 }),
                ],
              }),
            ],
          }),
          createWorkspaceDecisionMatrixBlock({
            id: strategyDecisionBlockId,
            title: "Decision matrix",
            question: "Should we open enterprise demand capture this launch week?",
            createdAt: isoTimestampFromNow(now, { days: -1 }),
            updatedAt: isoTimestampFromNow(now, { hours: -(categoryIndex + 2) }),
          }),
          createWorkspaceBusinessModelCanvasBlock({
            id: strategyBmcBlockId,
            title: "Business model canvas",
            createdAt: isoTimestampFromNow(now, { days: -1 }),
            updatedAt: isoTimestampFromNow(now, { hours: -(categoryIndex + 3) }),
          }),
          createWorkspaceAssumptionTrackerBlock({
            id: strategyAssumptionBlockId,
            title: "Assumption tracker",
            createdAt: isoTimestampFromNow(now, { days: -1 }),
            updatedAt: isoTimestampFromNow(now, { hours: -(categoryIndex + 4) }),
            assumptions: [
              createWorkspaceStrategicAssumption({
                id: seedId("catalog", "assumption", "okr"),
                statement: "Premium practical training can fund the next growth tranche",
                linkType: "okr",
                linkId: strategyObjectiveId,
                status: "validating",
                confidence: 4,
                owner: "Growth lead",
                reviewDate: isoDateFromNow(now, 14),
                evidenceNotes: "Discovery calls show willingness to pay for case-based programs.",
              }),
              createWorkspaceStrategicAssumption({
                id: seedId("catalog", "assumption", "decision"),
                statement: "Enterprise demand capture will not dilute the self-serve story",
                linkType: "decision",
                linkId: strategyDecisionBlockId,
                status: "at-risk",
                confidence: 3,
                owner: "Product marketing",
                reviewDate: isoDateFromNow(now, 7),
                evidenceNotes: "Sales wants outbound now; support macros are still immature.",
              }),
              createWorkspaceStrategicAssumption({
                id: seedId("catalog", "assumption", "bmc"),
                statement:
                  "Authority content plus practical programs is the core value proposition",
                linkType: "bmc",
                linkId: "valuePropositions",
                status: "confirmed",
                confidence: 5,
                owner: "Founder",
                reviewDate: isoDateFromNow(now, 21),
                evidenceNotes: "Closed deals repeatedly cite practical case studies as the reason.",
              }),
            ],
          }),
        ],
      });
    }

    return createWorkspaceNodeTab({
      id: seedId("catalog", "tab", category.id),
      title: category.label,
      createdAt: isoTimestampFromNow(now, { days: -1 }),
      updatedAt: isoTimestampFromNow(now, { hours: -(categoryIndex + 1) }),
      blocks: category.items.map((item, itemIndex) =>
        categorizedBlockFactories[item.blockType]({
          id: seedId("catalog", "block", category.id, item.blockType),
          title: item.label,
          createdAt: isoTimestampFromNow(now, { days: -1 }),
          updatedAt: isoTimestampFromNow(now, {
            hours: -(categoryIndex + itemIndex + 1),
          }),
        }),
      ),
    });
  });

  return createSeedNode({
    id: seedId("node", "block-catalog"),
    title: "Block Catalog",
    x: 40,
    y: 640,
    width: 400,
    height: 280,
    createdAt: isoTimestampFromNow(now, { days: -1 }),
    updatedAt: isoTimestampFromNow(now, { hours: -1 }),
    tabs,
    tint: "neutral",
    featuredBlocks: [
      { tabId: strategyTabId, blockId: strategyOkrBlockId },
      { tabId: strategyTabId, blockId: strategyDecisionBlockId },
      { tabId: strategyTabId, blockId: strategyBmcBlockId },
      { tabId: strategyTabId, blockId: strategyAssumptionBlockId },
    ],
  });
}

function parseCliArgs(argv: string[]): SeedCliOptions {
  let email: string | null = null;
  let help = false;
  let scale: SeedCliOptions["scale"] =
    env.BRAINIAC_SEED_SCALE === "massive" ? "massive" : "default";

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (!argument) {
      continue;
    }

    if (argument === "--help" || argument === "-h") {
      help = true;
      continue;
    }

    if (argument === "--scale") {
      const nextValue = argv[index + 1]?.trim().toLowerCase();
      if (!nextValue) {
        throw new Error("Missing value for --scale.");
      }
      scale = nextValue === "massive" ? "massive" : "default";
      index += 1;
      continue;
    }

    if (argument.startsWith("--scale=")) {
      const value = argument.slice("--scale=".length).trim().toLowerCase();
      scale = value === "massive" ? "massive" : "default";
      continue;
    }

    if (argument === "--email" || argument === "-e") {
      const nextValue = argv[index + 1]?.trim();

      if (!nextValue) {
        throw new Error("Missing value for --email.");
      }

      email = nextValue;
      index += 1;
      continue;
    }

    if (argument.startsWith("--email=")) {
      const value = argument.slice("--email=".length).trim();

      if (!value) {
        throw new Error("Missing value for --email.");
      }

      email = value;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return {
    email,
    help,
    scale,
  };
}

function printUsage() {
  console.log("Usage:");
  console.log("  bun run db:seed");
  console.log("  bun run db:seed --email you@example.com");
  console.log("  bun run db:seed -- --email you@example.com --scale massive");
  console.log("");
  console.log("Modes:");
  console.log(
    "  default       Rebuild reserved demo users, their workspaces, and curated marketplace items.",
  );
  console.log(
    "  --email/-e    Seed the full marketing canvas (orchestrator links, all block types, featured cards) into an existing user account and assign curated marketplace items to that user.",
  );
  console.log(
    "  --scale massive  Add viz nodes (and expanded marketplace for demo users). Works with --email.",
  );
  console.log("");
  console.log("Root workspace command:");
  console.log("  bun run db:seed");
  console.log("  bun run db:seed -- --scale massive");
  console.log("  bun run db:seed -- --email you@example.com --scale massive");
}

function buildSeedContent(now: Date): SeedContent {
  const blockCatalogNode = createBlockCatalogNode(now);
  const launchOverviewTab = createWorkspaceNodeTab({
    id: seedId("launch", "tab", "overview"),
    title: "Overview",
    createdAt: isoTimestampFromNow(now, { days: -8 }),
    updatedAt: isoTimestampFromNow(now, { hours: -5 }),
    blocks: [
      createWorkspaceNotesBlock({
        id: seedId("launch", "block", "notes"),
        title: "Narrative",
        body: "Ship the Q2 launch without losing trust. The goal is a sharp story, fast handoff to sales, and zero ambiguity on who owns the final stretch.",
        createdAt: isoTimestampFromNow(now, { days: -8 }),
        updatedAt: isoTimestampFromNow(now, { hours: -5 }),
      }),
      createWorkspaceTaskListBlock({
        id: seedId("launch", "block", "tasks"),
        title: "Critical path",
        createdAt: isoTimestampFromNow(now, { days: -7 }),
        updatedAt: isoTimestampFromNow(now, { hours: -4 }),
        tasks: [
          createWorkspaceTask({
            id: seedId("launch", "task", "sales-enablement"),
            text: "Ship the one-page sales rebuttal sheet",
            completed: false,
            dueDate: isoDateFromNow(now, -1),
            priority: "high",
            domain: "sales",
            urgency: 9,
            importance: 9,
            estimateMinutes: 60,
          }),
          createWorkspaceTask({
            id: seedId("launch", "task", "homepage"),
            text: "Lock homepage hero and proof points",
            completed: true,
            dueDate: isoDateFromNow(now, -2),
            priority: "high",
            domain: "brand",
            urgency: 7,
            importance: 8,
            estimateMinutes: 45,
          }),
          createWorkspaceTask({
            id: seedId("launch", "task", "email"),
            text: "Approve launch email sequence",
            completed: false,
            dueDate: isoDateFromNow(now, 1),
            priority: "high",
            domain: "content",
            urgency: 8,
            importance: 8,
            estimateMinutes: 90,
          }),
          createWorkspaceTask({
            id: seedId("launch", "task", "pricing"),
            text: "Review pricing objections with support",
            completed: false,
            dueDate: isoDateFromNow(now, 2),
            priority: "medium",
            domain: "strategy",
            urgency: 7,
            importance: 8,
            estimateMinutes: 40,
          }),
          createWorkspaceTask({
            id: seedId("launch", "task", "qa"),
            text: "Run final dashboard QA pass",
            completed: false,
            dueDate: isoDateFromNow(now, 3),
            priority: "medium",
            domain: "orchestrator",
            urgency: 7,
            importance: 7,
            estimateMinutes: 50,
          }),
        ],
      }),
      createWorkspaceTimeOrchestratorBlock({
        id: seedId("launch", "block", "orchestrator"),
        title: "Priority lane",
        createdAt: isoTimestampFromNow(now, { days: -6 }),
        updatedAt: isoTimestampFromNow(now, { hours: -4 }),
      }),
      createWorkspaceScorecardBlock({
        id: seedId("launch", "block", "scorecard"),
        title: "Launch scorecard",
        createdAt: isoTimestampFromNow(now, { days: -6 }),
        updatedAt: isoTimestampFromNow(now, { hours: -3 }),
        metrics: [
          createWorkspaceScorecardMetric({
            id: seedId("launch", "metric", "pipeline"),
            label: "Pipeline generated",
            value: 184000,
            target: 200000,
            unit: "$",
          }),
          createWorkspaceScorecardMetric({
            id: seedId("launch", "metric", "waitlist"),
            label: "Waitlist signups",
            value: 842,
            target: 1000,
            unit: "",
          }),
          createWorkspaceScorecardMetric({
            id: seedId("launch", "metric", "demos"),
            label: "Enterprise demos booked",
            value: 26,
            target: 30,
            unit: "",
          }),
        ],
      }),
    ],
  });

  const launchBoardColumns = [
    createWorkspaceKanbanColumn({
      id: seedId("launch", "column", "backlog"),
      title: "Backlog",
    }),
    createWorkspaceKanbanColumn({
      id: seedId("launch", "column", "doing"),
      title: "Doing",
    }),
    createWorkspaceKanbanColumn({
      id: seedId("launch", "column", "ready"),
      title: "Ready to ship",
    }),
    createWorkspaceKanbanColumn({
      id: seedId("launch", "column", "done"),
      title: "Done",
    }),
  ];

  const launchBoard = createWorkspaceKanbanBlock({
    id: seedId("launch", "block", "board"),
    title: "Launch board",
    createdAt: isoTimestampFromNow(now, { days: -5 }),
    updatedAt: isoTimestampFromNow(now, { hours: -2 }),
    columns: launchBoardColumns,
    cards: [
      createWorkspaceKanbanCard({
        id: seedId("launch", "card", "creative"),
        title: "Finalize paid social creative",
        description: "Creative team needs the final product proof points by lunch.",
        columnId: launchBoardColumns[1]!.id,
        assignee: "Mina",
        dueDate: isoDateFromNow(now, 1),
      }),
      createWorkspaceKanbanCard({
        id: seedId("launch", "card", "pricing"),
        title: "Publish pricing FAQ",
        description: "Support macros and FAQ should match the new plans.",
        columnId: launchBoardColumns[2]!.id,
        assignee: "Noah",
        dueDate: isoDateFromNow(now, 2),
      }),
      createWorkspaceKanbanCard({
        id: seedId("launch", "card", "training"),
        title: "Record 15-minute sales training",
        description: "Show positioning, objections, and the new demo path.",
        columnId: launchBoardColumns[0]!.id,
        assignee: "Avery",
        dueDate: isoDateFromNow(now, 3),
      }),
      createWorkspaceKanbanCard({
        id: seedId("launch", "card", "landing-page"),
        title: "Ship launch landing page",
        description: "Design and copy are approved; waiting on final QA.",
        columnId: launchBoardColumns[3]!.id,
        assignee: "Product marketing",
        dueDate: isoDateFromNow(now, -1),
      }),
    ],
  });

  const launchTimeline = createWorkspaceTimelineBlock({
    id: seedId("launch", "block", "timeline"),
    title: "Milestones",
    createdAt: isoTimestampFromNow(now, { days: -5 }),
    updatedAt: isoTimestampFromNow(now, { hours: -2 }),
    milestones: [
      createWorkspaceTimelineMilestone({
        id: seedId("launch", "milestone", "freeze"),
        title: "Story and pricing freeze",
        date: isoDateFromNow(now, -2),
        status: "done",
        note: "No new positioning changes after this point.",
      }),
      createWorkspaceTimelineMilestone({
        id: seedId("launch", "milestone", "enablement"),
        title: "Sales enablement complete",
        date: isoDateFromNow(now, 1),
        status: "active",
        note: "Waiting on final objection-handling one-pager.",
      }),
      createWorkspaceTimelineMilestone({
        id: seedId("launch", "milestone", "go-live"),
        title: "Public launch",
        date: isoDateFromNow(now, 4),
        status: "planned",
        note: "Site, email, in-app, and social need to ship together.",
      }),
    ],
  });

  const launchDeliveryTab = createWorkspaceNodeTab({
    id: seedId("launch", "tab", "delivery"),
    title: "Delivery",
    createdAt: isoTimestampFromNow(now, { days: -5 }),
    updatedAt: isoTimestampFromNow(now, { hours: -2 }),
    blocks: [launchBoard, launchTimeline],
  });

  const launchPromptTab = createWorkspaceNodeTab({
    id: seedId("launch", "tab", "prompts"),
    title: "Prompting",
    createdAt: isoTimestampFromNow(now, { days: -4 }),
    updatedAt: isoTimestampFromNow(now, { hours: -1 }),
    blocks: [
      createWorkspaceAiPromptBlock({
        id: seedId("launch", "block", "prompt"),
        title: "Narrative copilot",
        prompt:
          "Summarize the current launch risk, then write the next three highest-leverage actions for the team.",
        latestOutput:
          "The launch is healthy, but sales enablement is now the pacing item. Finish rebuttal content, approve the email sequence, and record the training clip before pushing more demand.",
        outputHistory: [
          {
            id: seedId("launch", "output", "risk"),
            prompt: "What is most likely to break this launch if we keep current momentum?",
            output:
              "Misalignment between the campaign promise and frontline objection handling. The story is strong, but support and sales need the exact same pricing language.",
            createdAt: isoTimestampFromNow(now, { days: -2, hours: -4 }),
          },
          {
            id: seedId("launch", "output", "actions"),
            prompt: "Draft a concise executive status update for this launch.",
            output:
              "Demand generation is ahead of plan, site assets are ready, and the remaining risk is enablement. We are prioritizing rebuttals, training, and the email sequence in the next 48 hours.",
            createdAt: isoTimestampFromNow(now, { days: -1, hours: -2 }),
          },
        ],
        createdAt: isoTimestampFromNow(now, { days: -4 }),
        updatedAt: isoTimestampFromNow(now, { hours: -1 }),
      }),
    ],
  });

  const launchNode = createSeedNode({
    id: seedId("node", "launch-war-room"),
    title: "Launch War Room",
    x: 40,
    y: 32,
    width: 400,
    height: 280,
    createdAt: isoTimestampFromNow(now, { days: -8 }),
    updatedAt: isoTimestampFromNow(now, { hours: -1 }),
    tabs: [launchOverviewTab, launchDeliveryTab, launchPromptTab],
    nodeType: "orchestrator",
    tint: "emerald",
    connections: [
      { targetNodeId: seedId("node", "decision-desk") },
      { targetNodeId: seedId("node", "growth-lab") },
      { targetNodeId: seedId("node", "weekly-ops-review") },
      { targetNodeId: seedId("node", "support-queue") },
      { targetNodeId: seedId("node", "research-hub") },
    ],
    featuredBlocks: [
      { tabId: launchOverviewTab.id, blockId: seedId("launch", "block", "tasks") },
      { tabId: launchOverviewTab.id, blockId: seedId("launch", "block", "scorecard") },
      { tabId: launchDeliveryTab.id, blockId: seedId("launch", "block", "board") },
      { tabId: launchOverviewTab.id, blockId: seedId("launch", "block", "orchestrator") },
    ],
  });

  const decisionTab = createWorkspaceNodeTab({
    id: seedId("decision", "tab", "overview"),
    title: "Decision sprint",
    createdAt: isoTimestampFromNow(now, { days: -6 }),
    updatedAt: isoTimestampFromNow(now, { hours: -6 }),
    blocks: [
      createWorkspaceNotesBlock({
        id: seedId("decision", "block", "notes"),
        title: "Context",
        body: "The team can either keep the launch self-serve only for another month or open the enterprise motion now and accept more sales coordination work.",
        createdAt: isoTimestampFromNow(now, { days: -6 }),
        updatedAt: isoTimestampFromNow(now, { hours: -6 }),
      }),
      createWorkspaceDecisionBlock({
        id: seedId("decision", "block", "matrix"),
        title: "Enterprise launch decision",
        createdAt: isoTimestampFromNow(now, { days: -6 }),
        updatedAt: isoTimestampFromNow(now, { hours: -5 }),
        pros: [
          {
            id: seedId("decision", "pro", "revenue"),
            text: "Pulls forward higher-value pipeline this quarter",
            weight: 5,
          },
          {
            id: seedId("decision", "pro", "signal"),
            text: "Gives product richer enterprise feedback before roadmap lock",
            weight: 4,
          },
        ],
        cons: [
          {
            id: seedId("decision", "con", "capacity"),
            text: "Sales enablement and support macros are still immature",
            weight: 5,
          },
          {
            id: seedId("decision", "con", "risk"),
            text: "Could dilute the self-serve message during launch week",
            weight: 3,
          },
        ],
        recommendation:
          "Open enterprise demand capture now, but gate outbound until rebuttals, FAQ, and support routing are in place. This keeps momentum without overselling the team’s readiness.",
      }),
      createWorkspaceTaskListBlock({
        id: seedId("decision", "block", "tasks"),
        title: "Follow-through",
        createdAt: isoTimestampFromNow(now, { days: -5 }),
        updatedAt: isoTimestampFromNow(now, { hours: -4 }),
        tasks: [
          createWorkspaceTask({
            id: seedId("decision", "task", "routing"),
            text: "Define enterprise lead routing SLA",
            completed: false,
            dueDate: isoDateFromNow(now, 1),
            priority: "high",
            domain: "people",
            urgency: 8,
            importance: 8,
            estimateMinutes: 35,
          }),
          createWorkspaceTask({
            id: seedId("decision", "task", "faq"),
            text: "Approve the support FAQ for new plan tiers",
            completed: false,
            dueDate: isoDateFromNow(now, 2),
            priority: "medium",
            domain: "education",
            urgency: 6,
            importance: 7,
            estimateMinutes: 25,
          }),
        ],
      }),
      createWorkspaceTimelineBlock({
        id: seedId("decision", "block", "timeline"),
        title: "Decision checkpoints",
        createdAt: isoTimestampFromNow(now, { days: -5 }),
        updatedAt: isoTimestampFromNow(now, { hours: -4 }),
        milestones: [
          createWorkspaceTimelineMilestone({
            id: seedId("decision", "milestone", "approve"),
            title: "Approve commercial motion",
            date: isoDateFromNow(now, 0),
            status: "active",
            note: "Pending final sign-off from product and support.",
          }),
          createWorkspaceTimelineMilestone({
            id: seedId("decision", "milestone", "train"),
            title: "Train support and sales",
            date: isoDateFromNow(now, 2),
            status: "planned",
            note: "Run one enablement session and publish macros.",
          }),
        ],
      }),
    ],
  });

  const decisionNode = createSeedNode({
    id: seedId("node", "decision-desk"),
    title: "Executive Decision Desk",
    x: 500,
    y: 48,
    width: 380,
    height: 270,
    createdAt: isoTimestampFromNow(now, { days: -6 }),
    updatedAt: isoTimestampFromNow(now, { hours: -4 }),
    tabs: [decisionTab],
    tint: "indigo",
    featuredBlocks: [
      { tabId: decisionTab.id, blockId: seedId("decision", "block", "matrix") },
      { tabId: decisionTab.id, blockId: seedId("decision", "block", "tasks") },
      { tabId: decisionTab.id, blockId: seedId("decision", "block", "timeline") },
    ],
  });

  const experimentTemplate = createWorkspaceCustomBlockTemplate({
    id: seedId("template", "experiment-brief"),
    name: "Experiment brief",
    fields: [
      {
        id: seedId("field", "channel"),
        key: "channel",
        label: "Channel",
        type: "text",
      },
      {
        id: seedId("field", "hypothesis"),
        key: "hypothesis",
        label: "Hypothesis",
        type: "textarea",
      },
      {
        id: seedId("field", "budget"),
        key: "budget",
        label: "Budget",
        type: "number",
      },
      {
        id: seedId("field", "approved"),
        key: "approved",
        label: "Approved",
        type: "checkbox",
      },
    ],
    includeNotes: true,
    formula: {
      label: "Budget score",
      expression: "budget * 1",
    },
    aiPromptTemplate:
      "Turn this experiment brief into a sharp test plan with a primary metric, kill criteria, and one major risk.",
    createdAt: isoTimestampFromNow(now, { days: -9 }),
    updatedAt: isoTimestampFromNow(now, { days: -2 }),
  });

  const experimentBriefBlock = createWorkspaceCustomBlock(experimentTemplate, {
    id: seedId("experiment", "block", "brief"),
    title: "Lifecycle onboarding test",
    createdAt: isoTimestampFromNow(now, { days: -4 }),
    updatedAt: isoTimestampFromNow(now, { hours: -8 }),
    values: {
      channel: "Lifecycle email",
      hypothesis:
        "If the first-run onboarding emails explain the value of linked nodes earlier, more teams will create a second node within 48 hours.",
      budget: 2400,
      approved: true,
    },
    notes:
      "Target new workspaces created from webinar and organic signup traffic. Primary success metric is second-node creation rate.",
    latestAiOutput:
      "Keep the scope tight: test message framing before touching product UX. Use a single variant focused on 'build your second node' to avoid muddy attribution.",
    outputHistory: [
      {
        id: seedId("experiment", "output", "first-pass"),
        prompt: "Write a first-pass test plan for this brief.",
        output:
          "Run the test on new workspaces only, compare second-node creation rate within 48 hours, and stop if activation lifts less than 5% after 300 qualified users.",
        createdAt: isoTimestampFromNow(now, { days: -3, hours: -2 }),
      },
    ],
  });

  const experimentTracker = createWorkspaceTrackerBlock({
    id: seedId("experiment", "block", "tracker"),
    title: "Weekly activation",
    createdAt: isoTimestampFromNow(now, { days: -4 }),
    updatedAt: isoTimestampFromNow(now, { hours: -7 }),
    entries: [
      {
        id: seedId("experiment", "entry", "week-1"),
        label: "Week -3",
        value: 31,
        createdAt: isoTimestampFromNow(now, { days: -21 }),
      },
      {
        id: seedId("experiment", "entry", "week-2"),
        label: "Week -2",
        value: 34,
        createdAt: isoTimestampFromNow(now, { days: -14 }),
      },
      {
        id: seedId("experiment", "entry", "week-3"),
        label: "Week -1",
        value: 39,
        createdAt: isoTimestampFromNow(now, { days: -7 }),
      },
      {
        id: seedId("experiment", "entry", "week-4"),
        label: "This week",
        value: 43,
        createdAt: isoTimestampFromNow(now, { days: -1 }),
      },
    ],
  });

  const experimentDiscoveryTab = createWorkspaceNodeTab({
    id: seedId("experiment", "tab", "discovery"),
    title: "Discovery",
    createdAt: isoTimestampFromNow(now, { days: -4 }),
    updatedAt: isoTimestampFromNow(now, { hours: -7 }),
    blocks: [
      experimentBriefBlock,
      experimentTracker,
      createWorkspaceNotesBlock({
        id: seedId("experiment", "block", "notes"),
        title: "Readout",
        body: "Activation is trending up, but the main ambiguity is whether copy alone can drive second-node creation. Hold product changes until the message test lands.",
        createdAt: isoTimestampFromNow(now, { days: -4 }),
        updatedAt: isoTimestampFromNow(now, { hours: -6 }),
      }),
    ],
  });

  const experimentInsightsTab = createWorkspaceNodeTab({
    id: seedId("experiment", "tab", "insights"),
    title: "Insights",
    createdAt: isoTimestampFromNow(now, { days: -3 }),
    updatedAt: isoTimestampFromNow(now, { hours: -5 }),
    blocks: [
      createWorkspaceAiPromptBlock({
        id: seedId("experiment", "block", "prompt"),
        title: "Insight synthesizer",
        prompt:
          "Using the tracker and experiment brief, explain whether the team should scale, pause, or redesign the test.",
        latestOutput:
          "Scale cautiously. The activation trend is positive, the budget is small, and the hypothesis is specific enough to learn quickly. Keep the test isolated to messaging so the causal signal stays clean.",
        outputHistory: [
          {
            id: seedId("experiment", "output", "summary"),
            prompt: "Summarize the state of the onboarding experiment.",
            output:
              "The test has enough traction to continue. The main recommendation is to avoid mixing copy changes with product onboarding changes in the same window.",
            createdAt: isoTimestampFromNow(now, { days: -2, hours: -3 }),
          },
        ],
        createdAt: isoTimestampFromNow(now, { days: -3 }),
        updatedAt: isoTimestampFromNow(now, { hours: -5 }),
      }),
    ],
  });

  const experimentNode = createSeedNode({
    id: seedId("node", "growth-lab"),
    title: "Growth Experiment Lab",
    x: 940,
    y: 72,
    width: 380,
    height: 270,
    createdAt: isoTimestampFromNow(now, { days: -4 }),
    updatedAt: isoTimestampFromNow(now, { hours: -5 }),
    tabs: [experimentDiscoveryTab, experimentInsightsTab],
    customBlockTemplates: [experimentTemplate],
    tint: "rose",
    featuredBlocks: [
      { tabId: experimentDiscoveryTab.id, blockId: seedId("experiment", "block", "brief") },
      { tabId: experimentDiscoveryTab.id, blockId: seedId("experiment", "block", "tracker") },
      { tabId: experimentInsightsTab.id, blockId: seedId("experiment", "block", "prompt") },
    ],
  });

  const opsReviewNode = createSeedNode({
    id: seedId("node", "weekly-ops-review"),
    title: "Weekly Ops Review",
    x: 500,
    y: 360,
    width: 380,
    height: 260,
    createdAt: isoTimestampFromNow(now, { days: -5 }),
    updatedAt: isoTimestampFromNow(now, { hours: -3 }),
    tint: "amber",
    featuredBlocks: [
      {
        tabId: seedId("ops-review", "tab", "overview"),
        blockId: seedId("ops-review", "block", "tasks"),
      },
      {
        tabId: seedId("ops-review", "tab", "overview"),
        blockId: seedId("ops-review", "block", "tracker"),
      },
      {
        tabId: seedId("ops-review", "tab", "overview"),
        blockId: seedId("ops-review", "block", "notes"),
      },
    ],
    tabs: [
      createWorkspaceNodeTab({
        id: seedId("ops-review", "tab", "overview"),
        title: "Overview",
        createdAt: isoTimestampFromNow(now, { days: -5 }),
        updatedAt: isoTimestampFromNow(now, { hours: -3 }),
        blocks: [
          createWorkspaceNotesBlock({
            id: seedId("ops-review", "block", "notes"),
            title: "Operating cadence",
            body: "Keep support backlog under control, hold CSAT above 94%, and ship automation without breaking response quality.",
            createdAt: isoTimestampFromNow(now, { days: -5 }),
            updatedAt: isoTimestampFromNow(now, { hours: -3 }),
          }),
          createWorkspaceTaskListBlock({
            id: seedId("ops-review", "block", "tasks"),
            title: "This week",
            createdAt: isoTimestampFromNow(now, { days: -4 }),
            updatedAt: isoTimestampFromNow(now, { hours: -2 }),
            tasks: [
              createWorkspaceTask({
                id: seedId("ops-review", "task", "handoff"),
                text: "Publish escalation handoff checklist",
                completed: false,
                dueDate: isoDateFromNow(now, 1),
                priority: "high",
                domain: "people",
                urgency: 8,
                importance: 8,
                estimateMinutes: 30,
              }),
              createWorkspaceTask({
                id: seedId("ops-review", "task", "automation"),
                text: "Audit macro automation failure cases",
                completed: false,
                dueDate: isoDateFromNow(now, 2),
                priority: "medium",
                domain: "orchestrator",
                urgency: 6,
                importance: 7,
                estimateMinutes: 45,
              }),
            ],
          }),
          createWorkspaceTrackerBlock({
            id: seedId("ops-review", "block", "tracker"),
            title: "Service quality",
            createdAt: isoTimestampFromNow(now, { days: -4 }),
            updatedAt: isoTimestampFromNow(now, { hours: -2 }),
            entries: [
              {
                id: seedId("ops-review", "entry", "backlog"),
                label: "Backlog",
                value: 19,
                createdAt: isoTimestampFromNow(now, { days: -7 }),
              },
              {
                id: seedId("ops-review", "entry", "csat"),
                label: "CSAT",
                value: 95,
                createdAt: isoTimestampFromNow(now, { days: -1 }),
              },
            ],
          }),
        ],
      }),
    ],
  });

  const supportQueueColumns = [
    createWorkspaceKanbanColumn({
      id: seedId("support", "column", "triage"),
      title: "Triage",
    }),
    createWorkspaceKanbanColumn({
      id: seedId("support", "column", "investigating"),
      title: "Investigating",
    }),
    createWorkspaceKanbanColumn({
      id: seedId("support", "column", "waiting"),
      title: "Waiting on customer",
    }),
    createWorkspaceKanbanColumn({
      id: seedId("support", "column", "done"),
      title: "Resolved",
    }),
  ];

  const supportQueueBlock = createWorkspaceKanbanBlock({
    id: seedId("support", "block", "queue"),
    title: "Support queue",
    createdAt: isoTimestampFromNow(now, { days: -3 }),
    updatedAt: isoTimestampFromNow(now, { hours: -1 }),
    columns: supportQueueColumns,
    cards: [
      createWorkspaceKanbanCard({
        id: seedId("support", "card", "latency"),
        title: "API latency spikes on import",
        description: "Collect logs from two enterprise workspaces after rollout.",
        columnId: supportQueueColumns[1]!.id,
        assignee: "Platform",
        dueDate: isoDateFromNow(now, 1),
      }),
      createWorkspaceKanbanCard({
        id: seedId("support", "card", "permissions"),
        title: "Clarify shared node permissions",
        description: "Need product answer before replying to the account owner.",
        columnId: supportQueueColumns[2]!.id,
        assignee: "Avery",
        dueDate: isoDateFromNow(now, 0),
      }),
      createWorkspaceKanbanCard({
        id: seedId("support", "card", "theme"),
        title: "Theme tokens not updating",
        description: "Repro only happens after app refresh in one browser.",
        columnId: supportQueueColumns[0]!.id,
        assignee: "Noah",
        dueDate: isoDateFromNow(now, 2),
      }),
    ],
  });

  const supportQueueNode = createSeedNode({
    id: seedId("node", "support-queue"),
    title: "Support Queue",
    x: 940,
    y: 380,
    width: 380,
    height: 260,
    createdAt: isoTimestampFromNow(now, { days: -3 }),
    updatedAt: isoTimestampFromNow(now, { hours: -1 }),
    tint: "sky",
    featuredBlocks: [
      { tabId: seedId("support", "tab", "queue"), blockId: seedId("support", "block", "queue") },
      {
        tabId: seedId("support", "tab", "queue"),
        blockId: seedId("support", "block", "timeline"),
      },
    ],
    tabs: [
      createWorkspaceNodeTab({
        id: seedId("support", "tab", "queue"),
        title: "Queue",
        createdAt: isoTimestampFromNow(now, { days: -3 }),
        updatedAt: isoTimestampFromNow(now, { hours: -1 }),
        blocks: [
          supportQueueBlock,
          createWorkspaceTimelineBlock({
            id: seedId("support", "block", "timeline"),
            title: "Escalation checkpoints",
            createdAt: isoTimestampFromNow(now, { days: -3 }),
            updatedAt: isoTimestampFromNow(now, { hours: -1 }),
            milestones: [
              createWorkspaceTimelineMilestone({
                id: seedId("support", "milestone", "macro-audit"),
                title: "Macro audit complete",
                date: isoDateFromNow(now, 1),
                status: "active",
                note: "Needed before enabling the next automation batch.",
              }),
              createWorkspaceTimelineMilestone({
                id: seedId("support", "milestone", "routing"),
                title: "Escalation routing shipped",
                date: isoDateFromNow(now, 3),
                status: "planned",
                note: "Requires QA with the platform team.",
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const executiveScorecardBlock = createWorkspaceScorecardBlock({
    id: seedId("research", "block", "scorecard"),
    title: "Executive KPI snapshot",
    createdAt: isoTimestampFromNow(now, { days: -2 }),
    updatedAt: isoTimestampFromNow(now, { hours: -2 }),
    metrics: [
      createWorkspaceScorecardMetric({
        id: seedId("research", "metric", "retention"),
        label: "Activation rate",
        value: 43,
        target: 45,
        unit: "%",
      }),
      createWorkspaceScorecardMetric({
        id: seedId("research", "metric", "usage"),
        label: "Weekly active teams",
        value: 128,
        target: 140,
        unit: "",
      }),
      createWorkspaceScorecardMetric({
        id: seedId("research", "metric", "nps"),
        label: "Signal score",
        value: 58,
        target: 60,
        unit: "",
      }),
    ],
  });

  const researchNode = createSeedNode({
    id: seedId("node", "research-hub"),
    title: "Research Hub",
    x: 40,
    y: 360,
    width: 380,
    height: 260,
    createdAt: isoTimestampFromNow(now, { days: -2 }),
    updatedAt: isoTimestampFromNow(now, { hours: -2 }),
    tint: "sky",
    featuredBlocks: [
      {
        tabId: seedId("research", "tab", "summary"),
        blockId: seedId("research", "block", "scorecard"),
      },
      {
        tabId: seedId("research", "tab", "summary"),
        blockId: seedId("research", "block", "notes"),
      },
      {
        tabId: seedId("research", "tab", "prompting"),
        blockId: seedId("research", "block", "prompt"),
      },
    ],
    tabs: [
      createWorkspaceNodeTab({
        id: seedId("research", "tab", "summary"),
        title: "Summary",
        createdAt: isoTimestampFromNow(now, { days: -2 }),
        updatedAt: isoTimestampFromNow(now, { hours: -2 }),
        blocks: [
          createWorkspaceNotesBlock({
            id: seedId("research", "block", "notes"),
            title: "What changed",
            body: "Users are getting to their first useful dashboard state faster, but collaboration behavior is still shallow. Most teams create a node, then stall without a second artifact.",
            createdAt: isoTimestampFromNow(now, { days: -2 }),
            updatedAt: isoTimestampFromNow(now, { hours: -2 }),
          }),
          executiveScorecardBlock,
        ],
      }),
      createWorkspaceNodeTab({
        id: seedId("research", "tab", "prompting"),
        title: "Prompting",
        createdAt: isoTimestampFromNow(now, { days: -2 }),
        updatedAt: isoTimestampFromNow(now, { hours: -1 }),
        blocks: [
          createWorkspaceAiPromptBlock({
            id: seedId("research", "block", "prompt"),
            title: "Research summarizer",
            prompt:
              "Summarize the strongest product insight from this week’s interviews and usage deltas.",
            latestOutput:
              "The product becomes sticky once teams create a second node. Messaging, onboarding, and templates should all pull toward that moment.",
            outputHistory: [
              {
                id: seedId("research", "output", "insight"),
                prompt: "What is the highest-leverage product insight from the week?",
                output:
                  "A second node is the clearest leading indicator of retained usage. Anything that gets teams there faster compounds downstream.",
                createdAt: isoTimestampFromNow(now, { days: -1, hours: -4 }),
              },
            ],
            createdAt: isoTimestampFromNow(now, { days: -2 }),
            updatedAt: isoTimestampFromNow(now, { hours: -1 }),
          }),
        ],
      }),
    ],
  });

  return {
    shared: {
      blockCatalogNode,
    },
    founder: {
      nodes: [launchNode, decisionNode, experimentNode],
      launchNode,
      decisionTab,
      experimentTemplate,
      experimentBriefBlock,
    },
    ops: {
      nodes: [opsReviewNode, supportQueueNode],
      opsReviewNode,
      supportQueueBlock,
    },
    analyst: {
      nodes: [researchNode],
      executiveScorecardBlock,
    },
  };
}

function requireSeedUser(users: Map<SeedUserKey, SeedActor>, key: SeedUserKey) {
  const seedUser = users.get(key);

  if (!seedUser) {
    throw new Error(`Seed user "${key}" was not created.`);
  }

  return seedUser;
}

function buildMassiveFounderVizNodes(now: Date): WorkspaceNode[] {
  const massiveKanbanColumn = createWorkspaceKanbanColumn({
    id: seedId("massive", "column", "todo"),
    title: "Todo",
  });

  const vizNodes = [
    {
      id: seedId("node", "massive-kanban"),
      title: "Delivery Kanban",
      x: 40,
      y: 40,
      block: createWorkspaceKanbanBlock({
        id: seedId("massive", "block", "kanban"),
        title: "Delivery board",
        columns: [massiveKanbanColumn],
        cards: [
          createWorkspaceKanbanCard({
            id: seedId("massive", "card", "one"),
            title: "Ship onboarding",
            columnId: massiveKanbanColumn.id,
          }),
        ],
        createdAt: isoTimestampFromNow(now, { days: -3 }),
        updatedAt: isoTimestampFromNow(now, { hours: -2 }),
      }),
    },
    {
      id: seedId("node", "massive-funnel"),
      title: "Pipeline Funnel",
      x: 420,
      y: 40,
      block: createWorkspacePipelineFunnelBlock({
        id: seedId("massive", "block", "funnel"),
        title: "Pipeline funnel",
        createdAt: isoTimestampFromNow(now, { days: -3 }),
        updatedAt: isoTimestampFromNow(now, { hours: -2 }),
      }),
    },
    {
      id: seedId("node", "massive-radar"),
      title: "Quality Radar",
      x: 800,
      y: 40,
      block: createWorkspaceContentQualityRadarBlock({
        id: seedId("massive", "block", "radar"),
        title: "Quality radar",
        createdAt: isoTimestampFromNow(now, { days: -3 }),
        updatedAt: isoTimestampFromNow(now, { hours: -2 }),
      }),
    },
    {
      id: seedId("node", "massive-heatmap"),
      title: "Skills Heat Map",
      x: 40,
      y: 320,
      block: createWorkspaceSkillsHeatMapBlock({
        id: seedId("massive", "block", "heatmap"),
        title: "Skills heat map",
        createdAt: isoTimestampFromNow(now, { days: -3 }),
        updatedAt: isoTimestampFromNow(now, { hours: -2 }),
      }),
    },
    {
      id: seedId("node", "massive-tracker"),
      title: "Growth Tracker",
      x: 420,
      y: 320,
      block: createWorkspaceTrackerBlock({
        id: seedId("massive", "block", "tracker"),
        title: "Growth tracker",
        createdAt: isoTimestampFromNow(now, { days: -3 }),
        updatedAt: isoTimestampFromNow(now, { hours: -2 }),
      }),
    },
  ] as const;

  const massiveTints: WorkspaceNodeTint[] = ["amber", "sky", "rose", "indigo", "emerald"];

  return vizNodes.map((entry, index) =>
    createSeedNode({
      id: entry.id,
      title: entry.title,
      x: entry.x,
      y: entry.y,
      width: 360,
      height: 240,
      createdAt: isoTimestampFromNow(now, { days: -3 }),
      updatedAt: isoTimestampFromNow(now, { hours: -1 }),
      tint: massiveTints[index % massiveTints.length],
      featuredBlocks: [
        {
          tabId: seedId(entry.id, "tab", "main"),
          blockId: entry.block.id,
        },
      ],
      tabs: [
        createWorkspaceNodeTab({
          id: seedId(entry.id, "tab", "main"),
          title: "Main",
          createdAt: isoTimestampFromNow(now, { days: -3 }),
          updatedAt: isoTimestampFromNow(now, { hours: -1 }),
          blocks: [entry.block],
        }),
      ],
    }),
  );
}

function expandMarketplaceItems(
  items: WorkspaceMarketplaceItem[],
  users: Map<SeedUserKey, SeedActor>,
  now: Date,
  targetCount: number,
) {
  if (items.length >= targetCount) return items;

  const expanded = [...items];
  const founder = requireSeedUser(users, "founder");

  while (expanded.length < targetCount) {
    const source = items[expanded.length % items.length];
    if (!source) break;

    expanded.push(
      createSeedMarketplaceItem({
        id: seedId("marketplace", "massive", String(expanded.length)),
        title: `${source.title} (${expanded.length})`,
        summary: source.summary,
        createdBy: founder,
        payload: source.payload,
        createdAt: isoTimestampFromNow(now, { hours: -(expanded.length + 1) }),
        updatedAt: isoTimestampFromNow(now, { hours: -1 }),
      }),
    );
  }

  return expanded;
}

function buildSeedActorAliases(targetUser: SeedActor) {
  return new Map<SeedUserKey, SeedActor>(SEED_USERS.map((seedUser) => [seedUser.key, targetUser]));
}

async function recreateSeedUsers(password: string) {
  const requestHeaders = new Headers({
    "user-agent": "orch-seed-script",
  });

  requestHeaders.set("origin", primaryCorsOrigin);

  await db.delete(user).where(
    inArray(
      user.email,
      SEED_USERS.map((seedUser) => seedUser.email),
    ),
  );

  const createdUsers = new Map<SeedUserKey, SeedUserRecord>();

  for (const seedUser of SEED_USERS) {
    const result = await auth.api.signUpEmail({
      body: {
        email: seedUser.email,
        password,
        name: seedUser.name,
      },
      headers: requestHeaders,
    });

    createdUsers.set(seedUser.key, {
      ...seedUser,
      id: result.user.id,
      password,
    });
  }

  return createdUsers;
}

async function findUserByEmail(email: string) {
  const normalizedEmail = email.trim();

  if (!normalizedEmail) {
    throw new Error("Email must not be empty.");
  }

  const [existingUser] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
    })
    .from(user)
    .where(eq(user.email, normalizedEmail))
    .limit(1);

  if (!existingUser) {
    throw new Error(`No existing user found for "${normalizedEmail}".`);
  }

  return existingUser satisfies SeedActor;
}

function layoutWorkspaceNodes(nodes: WorkspaceNode[], startY = GRID_START_Y) {
  let currentX = GRID_START_X;
  let currentY = startY;
  let currentRowHeight = 0;

  return cloneWorkspaceNodes(nodes).map((node) => {
    if (currentX > GRID_START_X && currentX + node.width > GRID_START_X + GRID_MAX_WIDTH) {
      currentX = GRID_START_X;
      currentY += currentRowHeight + GRID_ROW_GAP;
      currentRowHeight = 0;
    }

    const positionedNode = normalizeWorkspaceNode({
      ...node,
      x: currentX,
      y: currentY,
    });

    currentX += positionedNode.width + GRID_COLUMN_GAP;
    currentRowHeight = Math.max(currentRowHeight, positionedNode.height);

    return positionedNode;
  });
}

const MARKETING_OVERFLOW_START_Y = 680;

function buildExistingUserWorkspace(
  content: SeedContent,
  scale: SeedCliOptions["scale"],
  now: Date,
) {
  const warRoomCluster = [...content.founder.nodes, ...content.ops.nodes, ...content.analyst.nodes];

  const overflowNodes = layoutWorkspaceNodes(
    [
      content.shared.blockCatalogNode,
      ...(scale === "massive" ? buildMassiveFounderVizNodes(now) : []),
    ],
    MARKETING_OVERFLOW_START_Y,
  );

  return [...warRoomCluster, ...overflowNodes];
}

async function saveWorkspaceSnapshot(userId: string, nodes: WorkspaceNode[]) {
  const updatedAt = new Date();

  await db
    .insert(dashboardWorkspace)
    .values({
      userId,
      nodes,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: dashboardWorkspace.userId,
      set: {
        nodes,
        updatedAt,
      },
    });
}

function createSeedMarketplaceItem({
  id,
  title,
  summary,
  createdBy,
  payload,
  createdAt,
  updatedAt,
}: {
  id: string;
  title: string;
  summary: string;
  createdBy: SeedActor;
  payload: WorkspaceMarketplaceItem["payload"];
  createdAt: string;
  updatedAt: string;
}) {
  return workspaceMarketplaceItemSchema.parse({
    id,
    title,
    summary,
    payload,
    createdByUserId: createdBy.id,
    createdByName: createdBy.name,
    createdAt,
    updatedAt,
  });
}

function buildMarketplaceItems(
  content: SeedContent,
  users: Map<SeedUserKey, SeedActor>,
  now: Date,
) {
  const founder = requireSeedUser(users, "founder");
  const ops = requireSeedUser(users, "ops");
  const analyst = requireSeedUser(users, "analyst");

  return [
    createSeedMarketplaceItem({
      id: seedId("marketplace", "launch-war-room"),
      title: "Launch War Room Starter",
      summary:
        "A complete launch setup with planning, delivery, scorecards, and prompt scaffolding.",
      createdBy: founder,
      payload: {
        kind: "node",
        node: content.founder.launchNode,
      },
      createdAt: isoTimestampFromNow(now, { days: -1, hours: -3 }),
      updatedAt: isoTimestampFromNow(now, { hours: -2 }),
    }),
    createSeedMarketplaceItem({
      id: seedId("marketplace", "decision-sprint-tab"),
      title: "Decision Sprint Tab",
      summary: "Context, tradeoffs, execution tasks, and checkpoints in a single tab.",
      createdBy: founder,
      payload: {
        kind: "tab",
        tab: content.founder.decisionTab,
        customBlockTemplates: [],
      },
      createdAt: isoTimestampFromNow(now, { days: -1, hours: -2 }),
      updatedAt: isoTimestampFromNow(now, { hours: -2 }),
    }),
    createSeedMarketplaceItem({
      id: seedId("marketplace", "weekly-ops-review"),
      title: "Weekly Ops Review",
      summary:
        "A ready-made operating review node for service quality, backlog, and weekly follow-through.",
      createdBy: ops,
      payload: {
        kind: "node",
        node: content.ops.opsReviewNode,
      },
      createdAt: isoTimestampFromNow(now, { days: -1, hours: -1 }),
      updatedAt: isoTimestampFromNow(now, { hours: -1 }),
    }),
    createSeedMarketplaceItem({
      id: seedId("marketplace", "support-queue-board"),
      title: "Support Queue Board",
      summary: "A kanban block for triage, investigation, and resolution work.",
      createdBy: ops,
      payload: {
        kind: "block",
        block: content.ops.supportQueueBlock,
        customBlockTemplates: [],
      },
      createdAt: isoTimestampFromNow(now, { hours: -20 }),
      updatedAt: isoTimestampFromNow(now, { hours: -1 }),
    }),
    createSeedMarketplaceItem({
      id: seedId("marketplace", "experiment-brief"),
      title: "Experiment Brief Block",
      summary: "A custom experiment brief with notes and AI output history for growth testing.",
      createdBy: analyst,
      payload: {
        kind: "block",
        block: content.founder.experimentBriefBlock,
        customBlockTemplates: [content.founder.experimentTemplate],
      },
      createdAt: isoTimestampFromNow(now, { hours: -18 }),
      updatedAt: isoTimestampFromNow(now, { hours: -1 }),
    }),
    createSeedMarketplaceItem({
      id: seedId("marketplace", "executive-scorecard"),
      title: "Executive KPI Scorecard",
      summary: "A clean scorecard block for top-line product and growth review.",
      createdBy: analyst,
      payload: {
        kind: "block",
        block: content.analyst.executiveScorecardBlock,
        customBlockTemplates: [],
      },
      createdAt: isoTimestampFromNow(now, { hours: -16 }),
      updatedAt: isoTimestampFromNow(now, { hours: -1 }),
    }),
  ];
}

async function replaceMarketplaceItems(items: WorkspaceMarketplaceItem[]) {
  if (items.length === 0) {
    return;
  }

  const itemIds = items.map((item) => item.id);

  await db.delete(workspaceMarketplaceItem).where(inArray(workspaceMarketplaceItem.id, itemIds));

  await db.insert(workspaceMarketplaceItem).values(
    items.map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      kind: item.payload.kind,
      payload: item.payload,
      createdByUserId: item.createdByUserId ?? null,
      createdByName: item.createdByName,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    })),
  );
}

async function seedExistingUser(
  email: string,
  content: SeedContent,
  now: Date,
  scale: SeedCliOptions["scale"],
) {
  const targetUser = await findUserByEmail(email);
  const targetNodes = buildExistingUserWorkspace(content, scale, now);
  const marketplaceItems =
    scale === "massive"
      ? expandMarketplaceItems(
          buildMarketplaceItems(content, buildSeedActorAliases(targetUser), now),
          buildSeedActorAliases(targetUser),
          now,
          50,
        )
      : buildMarketplaceItems(content, buildSeedActorAliases(targetUser), now);

  console.log(`Seeding marketing canvas into existing user: ${targetUser.email}`);
  console.log(`Scale: ${scale}`);

  await saveWorkspaceSnapshot(targetUser.id, targetNodes);
  await replaceMarketplaceItems(marketplaceItems);

  console.log("");
  console.log("Seed complete.");
  console.log("");
  console.log(`Target user: ${targetUser.email} (${targetUser.name})`);
  console.log(`Workspace: ${targetNodes.length} nodes were written to this account.`);
  console.log(`Marketplace: ${marketplaceItems.length} curated items.`);
  console.log(
    "This mode does not recreate users. It replaces the target user's workspace snapshot and refreshes only the reserved seed marketplace records.",
  );
}

async function seedDemoUsers(content: SeedContent, now: Date, scale: SeedCliOptions["scale"]) {
  const password = env.BRAINIAC_SEED_PASSWORD?.trim() || DEFAULT_SEED_PASSWORD;

  console.log("Rebuilding reserved Orch demo accounts and seed data...");

  const users = await recreateSeedUsers(password);

  const founderNodes =
    scale === "massive"
      ? buildExistingUserWorkspace(content, "massive", now)
      : [content.shared.blockCatalogNode];

  await Promise.all([
    saveWorkspaceSnapshot(requireSeedUser(users, "founder").id, founderNodes),
    saveWorkspaceSnapshot(requireSeedUser(users, "ops").id, [content.shared.blockCatalogNode]),
    saveWorkspaceSnapshot(requireSeedUser(users, "analyst").id, [content.shared.blockCatalogNode]),
  ]);

  const marketplaceItems =
    scale === "massive"
      ? expandMarketplaceItems(buildMarketplaceItems(content, users, now), users, now, 50)
      : buildMarketplaceItems(content, users, now);
  await replaceMarketplaceItems(marketplaceItems);

  console.log("");
  console.log("Seed complete.");
  console.log("");
  console.log("Demo credentials:");

  for (const seedUser of SEED_USERS) {
    console.log(`- ${seedUser.email} / ${password} (${seedUser.name})`);
  }

  console.log("");
  console.log(`Workspaces: ${SEED_USERS.length} nodes across ${SEED_USERS.length} demo users.`);
  console.log(`Marketplace: ${marketplaceItems.length} curated items.`);
  console.log(
    "Rerunning this script resets only the reserved *.orch.test demo accounts and these seed marketplace records.",
  );
}

async function seed() {
  const options = parseCliArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  const now = new Date();
  const content = buildSeedContent(now);

  if (options.email) {
    await seedExistingUser(options.email, content, now, options.scale);
    return;
  }

  await seedDemoUsers(content, now, options.scale);
}

void seed()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("");
    console.error("Seed failed.");
    console.error(error);
    process.exit(1);
  });
