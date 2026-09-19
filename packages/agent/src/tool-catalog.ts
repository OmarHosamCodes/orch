import type { AgentSurface, AgentToolCatalogEntry, DashboardAgentToolPreset } from "./types";

type ToolCatalogDefinition = Omit<AgentToolCatalogEntry, "available">;

const ALL_MODES: DashboardAgentToolPreset[] = ["ask", "plan", "agent"];

const TOOL_CATALOG: ToolCatalogDefinition[] = [
  {
    name: "list_dashboard_nodes",
    usage: "Lists canvas nodes with structural summaries.",
    surface: ["canvas"],
    modes: ALL_MODES,
  },
  {
    name: "query_knowledge",
    usage:
      "Queries one brain or, without canvasWorkspaceId, every owned brain (CNS). Hits include canvasWorkspaceId and title.",
    surface: ["canvas"],
    modes: ALL_MODES,
  },
  {
    name: "list_workspaces",
    usage: "Lists your named Canvas brains (id, title, instructions).",
    surface: ["canvas"],
    modes: ALL_MODES,
  },
  {
    name: "get_knowledge_object",
    usage: "Reads one canvas knowledge object or live Agency record, including inbound backlinks.",
    surface: ["canvas"],
    modes: ALL_MODES,
  },
  {
    name: "list_marketplace_items",
    usage: "Lists marketplace items available for reuse.",
    surface: ["canvas"],
    modes: ALL_MODES,
  },
  {
    name: "search_marketplace",
    usage: "Searches marketplace titles, summaries, and payloads.",
    surface: ["canvas"],
    modes: ALL_MODES,
  },
  {
    name: "get_node_details",
    usage: "Reads one canvas node at summary or full detail.",
    surface: ["canvas"],
    modes: ALL_MODES,
  },
  {
    name: "get_tab_details",
    usage: "Reads one tab and its blocks inside a node.",
    surface: ["canvas"],
    modes: ALL_MODES,
  },
  {
    name: "get_block_details",
    usage: "Reads one block payload and its edit guide.",
    surface: ["canvas"],
    modes: ALL_MODES,
  },
  {
    name: "get_marketplace_item_details",
    usage: "Reads one marketplace item payload.",
    surface: ["canvas"],
    modes: ALL_MODES,
  },
  {
    name: "fetch_web_page",
    usage: "Fetches a public web page title and text excerpt.",
    surface: ["canvas"],
    modes: ALL_MODES,
  },
  {
    name: "get_current_time",
    usage: "Returns the current ISO timestamp.",
    surface: ["canvas", "agency"],
    modes: ALL_MODES,
  },
  {
    name: "remember_fact",
    usage: "Saves a durable personal preference or fact about this user.",
    surface: ["canvas", "agency"],
    modes: ALL_MODES,
  },
  {
    name: "list_agency_time_entries",
    usage: "Lists your recent Agency time entries for the active team.",
    surface: ["agency"],
    modes: ALL_MODES,
  },
  {
    name: "list_agency_time_gaps",
    usage: "Checks uncovered time windows vs tracked entries for a YYYY-MM-DD range (read-only).",
    surface: ["agency"],
    modes: ALL_MODES,
  },
  {
    name: "get_agency_client_bill",
    usage:
      "Reads one client's composed bill for a period (current + carry); amounts in integer minor units.",
    surface: ["agency"],
    modes: ALL_MODES,
  },
  {
    name: "list_member_profile_alerts",
    usage: "Lists member profile alerts (Needs-action) for a user on the active team.",
    surface: ["agency"],
    modes: ALL_MODES,
  },
  {
    name: "list_agency_projects",
    usage: "Lists Agency projects and their clients for the active team.",
    surface: ["agency"],
    modes: ALL_MODES,
  },
  {
    name: "list_agency_members",
    usage: "Lists team members and roles for the active Agency team.",
    surface: ["agency"],
    modes: ALL_MODES,
  },
  {
    name: "get_agency_time_summary",
    usage: "Per-member tracked seconds for a YYYY-MM-DD range (pass only from/to).",
    surface: ["agency"],
    modes: ALL_MODES,
  },
  {
    name: "get_agency_reports_summary",
    usage: "Hours by client, project, and member for a YYYY-MM-DD range.",
    surface: ["agency"],
    modes: ALL_MODES,
  },
  {
    name: "list_agency_clients",
    usage: "Lists Agency clients for the active team.",
    surface: ["agency"],
    modes: ALL_MODES,
  },
  {
    name: "list_agency_tags",
    usage: "Lists Agency tags for the active team.",
    surface: ["agency"],
    modes: ALL_MODES,
  },
  {
    name: "list_agency_project_tasks",
    usage: "Lists tasks for one Agency project.",
    surface: ["agency"],
    modes: ALL_MODES,
  },
  {
    name: "get_agency_active_timer",
    usage: "Reads the current user's active Agency timer, if any.",
    surface: ["agency"],
    modes: ALL_MODES,
  },
  {
    name: "get_agency_time_entry",
    usage: "Reads one Agency time entry by id.",
    surface: ["agency"],
    modes: ALL_MODES,
  },
  {
    name: "draft_agency_plan",
    usage: "Drafts a multi-step Agency change plan for user confirmation (no writes).",
    surface: ["agency"],
    modes: ["plan"],
  },
  {
    name: "propose_agency_action",
    usage: "Proposes one Agency write with before/after for Approve/Reject.",
    surface: ["agency"],
    modes: ["agent"],
  },
  {
    name: "apply_knowledge_action",
    usage: "Applies one knowledge create/update/link immediately and returns the object to Open.",
    surface: ["canvas"],
    modes: ALL_MODES,
  },
  {
    name: "apply_canvas_action",
    usage: "Applies one Canvas write immediately and returns the node or block to Open.",
    surface: ["canvas"],
    modes: ALL_MODES,
  },
];

export function resolveUnlockedSurfaces(_input?: {
  surface?: AgentSurface;
  unlockedSurfaces?: AgentSurface[];
  scopeRefs?: Array<{ kind: string; id: string }>;
}): AgentSurface[] {
  void _input;
  return ["agency", "canvas"];
}

export function listAgentToolCatalog(input: {
  surface: AgentSurface;
  mode: DashboardAgentToolPreset;
  unlockedSurfaces?: AgentSurface[];
  scopeRefs?: Array<{ kind: string; id: string }>;
}): AgentToolCatalogEntry[] {
  void input.surface;
  void input.mode;
  void input.unlockedSurfaces;
  void input.scopeRefs;
  const seen = new Set<string>();
  const tools: AgentToolCatalogEntry[] = [];
  for (const entry of TOOL_CATALOG) {
    if (seen.has(entry.name)) continue;
    seen.add(entry.name);
    tools.push({ ...entry, available: true });
  }
  return tools;
}
