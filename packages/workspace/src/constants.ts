export const WORKSPACE_NODE_LIMIT = 200;
export const CANVAS_WORKSPACE_OWNER_LIMIT = 20;
export const DEFAULT_CANVAS_WORKSPACE_TITLE = "Legacy Canvas";
export const WORKSPACE_NODE_TAB_LIMIT = 12;
export const WORKSPACE_TAB_BLOCK_LIMIT = 24;
export const WORKSPACE_TASK_LIMIT = 100;
export const WORKSPACE_TABLE_COLUMN_LIMIT = 8;
export const WORKSPACE_TABLE_ROW_LIMIT = 60;
export const WORKSPACE_CHECKLIST_ITEM_LIMIT = 100;
export const WORKSPACE_KANBAN_COLUMN_LIMIT = 6;
export const WORKSPACE_KANBAN_CARD_LIMIT = 120;
export const WORKSPACE_TIMELINE_MILESTONE_LIMIT = 40;
export const WORKSPACE_SCORECARD_METRIC_LIMIT = 40;
export const WORKSPACE_PROS_CONS_ITEM_LIMIT = 40;
export const WORKSPACE_HABIT_GRID_HABIT_LIMIT = 24;
export const WORKSPACE_PROCESS_STEP_LIMIT = 24;
export const WORKSPACE_2X2_MATRIX_ITEM_LIMIT = 32;
export const WORKSPACE_OKR_OBJECTIVE_LIMIT = 16;
export const WORKSPACE_OKR_KEY_RESULT_LIMIT = 12;
export const WORKSPACE_DECISION_MATRIX_CRITERIA_LIMIT = 12;
export const WORKSPACE_DECISION_MATRIX_OPTION_LIMIT = 8;
export const WORKSPACE_ASSUMPTION_LIMIT = 30;
export const WORKSPACE_HOOK_BANK_ITEM_LIMIT = 60;
export const WORKSPACE_PROFITABILITY_CLIENT_LIMIT = 24;
export const WORKSPACE_EXPENSE_ITEM_LIMIT = 16;
export const WORKSPACE_RECEIVABLE_INVOICE_LIMIT = 40;
export const WORKSPACE_SKILLS_HEAT_MAP_MEMBER_LIMIT = 24;
export const WORKSPACE_SKILLS_HEAT_MAP_DIMENSIONS_LIMIT = 12;
export const WORKSPACE_DELEGATION_ITEM_LIMIT = 40;
export const WORKSPACE_TALENT_GRID_MEMBER_LIMIT = 24;
export const WORKSPACE_SEAT_PLANNER_SEAT_LIMIT = 24;
export const WORKSPACE_DEAL_SCORING_DEAL_LIMIT = 40;
export const WORKSPACE_PIPELINE_FUNNEL_DEAL_LIMIT = 40;
export const WORKSPACE_FORECAST_CONFIDENCE_ITEM_LIMIT = 40;
export const WORKSPACE_CONTENT_PIPELINE_ITEM_LIMIT = 80;
export const WORKSPACE_CONTENT_ROI_ITEM_LIMIT = 40;
export const WORKSPACE_CUSTOM_BLOCK_TEMPLATE_LIMIT = 20;
export const WORKSPACE_CUSTOM_BLOCK_FIELD_LIMIT = 12;
export const WORKSPACE_COURSE_ROADMAP_COURSE_LIMIT = 12;
export const WORKSPACE_COURSE_ROADMAP_LESSON_LIMIT = 24;
export const WORKSPACE_COURSE_OUTCOME_LIMIT = 16;
export const WORKSPACE_COHORT_LIMIT = 20;
export const WORKSPACE_LEADERSHIP_MEETING_LIMIT = 24;
export const WORKSPACE_MARKETPLACE_ITEM_LIMIT = 200;
export const WORKSPACE_NODE_DASHBOARD_DETAIL_LIMIT = 4;
export const WORKSPACE_NODE_CONNECTION_LIMIT = WORKSPACE_NODE_LIMIT - 1;
export const DEFAULT_WORKSPACE_NODE_WIDTH = 320;
export const DEFAULT_WORKSPACE_NODE_HEIGHT = 220;
export const DEFAULT_WORKSPACE_NODE_MIN_WIDTH = 260;
export const DEFAULT_WORKSPACE_NODE_MIN_HEIGHT = 180;

export const WORKSPACE_NODE_TYPES = ["standard", "orchestrator"] as const;

export const WORKSPACE_TASK_DOMAINS = [
  "strategy",
  "people",
  "sales",
  "content",
  "brand",
  "finance",
  "education",
  "orchestrator",
] as const;

export const WORKSPACE_TASK_QUADRANTS = ["do", "schedule", "delegate", "eliminate"] as const;

export const WORKSPACE_HABIT_GRID_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export const WORKSPACE_TIMELINE_MILESTONE_STATUSES = [
  "planned",
  "active",
  "done",
  "blocked",
] as const;

export const WORKSPACE_PEOPLE_SKILL_DIMENSIONS = [
  "writing",
  "strategy",
  "design",
  "analytics",
  "leadership",
] as const;

export const WORKSPACE_DELEGATION_STATUSES = ["stuck", "transitioning", "delegated"] as const;

export const WORKSPACE_SALES_PIPELINE_STAGES = [
  "lead",
  "consultation",
  "proposal",
  "negotiation",
  "closed",
] as const;

export const WORKSPACE_SALES_TEMPERATURES = ["hot", "warm", "cold"] as const;

export const WORKSPACE_SALES_FORECAST_BUCKETS = ["commit", "likely", "upside", "at-risk"] as const;

export const WORKSPACE_CONTENT_PLATFORMS = ["instagram", "tiktok", "linkedin", "youtube"] as const;

export const WORKSPACE_CONTENT_PIPELINE_STATUSES = [
  "ideas",
  "draft",
  "review",
  "approved",
  "published",
] as const;

export const WORKSPACE_CONTENT_QUALITY_DIMENSIONS = [
  "hook",
  "value",
  "emotion",
  "cta",
  "platformFit",
  "brand",
  "shareability",
  "scrollStop",
  "authenticity",
  "storytelling",
] as const;

export const WORKSPACE_CONTENT_ROI_SORT_OPTIONS = ["roi", "reach", "leads"] as const;

export const WORKSPACE_SEAT_HEALTH_STATES = ["strong", "fragile", "gap"] as const;

export const WORKSPACE_SEAT_LOAD_LEVELS = ["underloaded", "balanced", "overloaded"] as const;

export const WORKSPACE_SEAT_PLANNER_FILTERS = [
  "all",
  "fragile",
  "overloaded",
  "uncovered",
] as const;

export const WORKSPACE_BUSINESS_MODEL_CANVAS_CELL_KEYS = [
  "keyPartners",
  "keyActivities",
  "keyResources",
  "valuePropositions",
  "customerRelationships",
  "channels",
  "customerSegments",
  "costStructure",
  "revenueStreams",
] as const;

export const WORKSPACE_STRATEGIC_ASSUMPTION_STATUSES = [
  "validating",
  "confirmed",
  "at-risk",
  "false",
] as const;

export const WORKSPACE_STRATEGIC_ASSUMPTION_LINK_TYPES = [
  "none",
  "okr",
  "decision",
  "bmc",
] as const;

export const WORKSPACE_STRATEGIC_ASSUMPTION_FILTERS = [
  "all",
  ...WORKSPACE_STRATEGIC_ASSUMPTION_STATUSES,
] as const;

export const WORKSPACE_AUTHORITY_SCORECARD_METRICS = [
  "posts",
  "videos",
  "speakingGigs",
  "podcastAppearances",
  "mediaFeatures",
  "followers",
] as const;

export const WORKSPACE_FINANCE_PAYMENT_STATUSES = ["paid", "partial", "overdue"] as const;

export const WORKSPACE_RECEIVABLE_STATUSES = ["paid", "due-soon", "partial", "overdue"] as const;

export const WORKSPACE_RECEIVABLE_FILTERS = [
  "all",
  "overdue",
  "high-risk",
  "due-this-week",
] as const;

export const WORKSPACE_COURSE_STATUSES = ["planning", "in-progress"] as const;

export const WORKSPACE_COHORT_STATUSES = ["planning", "selling", "running", "completed"] as const;

export const WORKSPACE_LEADERSHIP_RHYTHMS = ["weekly", "monthly", "quarterly"] as const;

export const WORKSPACE_LEADERSHIP_MEETING_STATUSES = [
  "scheduled",
  "missed",
  "done",
  "needs-reschedule",
] as const;

export const WORKSPACE_LEADERSHIP_FILTERS = ["all", "missed", "upcoming"] as const;

export const WORKSPACE_NODE_TINTS = [
  "neutral",
  "emerald",
  "sky",
  "amber",
  "rose",
  "indigo",
] as const;
