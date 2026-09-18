import type { AgentSurface, DashboardAgentToolPreset } from "@orch/agent/types";

export type WorkspaceAgentQuickStart = {
  id: string;
  label: string;
  prompt: string;
  toolPreset?: DashboardAgentToolPreset;
};

export type WorkspaceAgentQuickStartContext = {
  surface: AgentSurface;
  hasActiveTimer?: boolean;
};

/** Empty-state starters grounded in real Agency/canvas tool capabilities. */
export function buildWorkspaceAgentQuickStarts(
  context: WorkspaceAgentQuickStartContext,
): WorkspaceAgentQuickStart[] {
  switch (context.surface) {
    case "agency":
      return buildAgencyMemberQuickStarts(context.hasActiveTimer === true);
    case "canvas":
      return CANVAS_QUICK_STARTS;
    default: {
      const _exhaustive: never = context.surface;
      return _exhaustive;
    }
  }
}

function buildAgencyMemberQuickStarts(hasActiveTimer: boolean): WorkspaceAgentQuickStart[] {
  const contextual: WorkspaceAgentQuickStart = hasActiveTimer
    ? {
        id: "timer",
        label: "What's on my timer?",
        prompt:
          "What's on my active timer right now? Summarize project, task, and how long so far.",
      }
    : {
        id: "log-time",
        label: "Log missing time",
        prompt:
          "Help me find and fill my untracked time. Propose each entry for my approval. Do not write anything until I approve.",
        toolPreset: "agent",
      };

  return [
    contextual,
    {
      id: "hours",
      label: "Summarize my hours",
      prompt:
        "Summarize my tracked hours this calendar month with paid, waste, and internal breakdown. Show a canvas.",
    },
    {
      id: "waste",
      label: "Where's my waste?",
      prompt: "Where is my waste this week? List the waste entries and total waste hours.",
    },
    {
      id: "team",
      label: "Who's tracking now?",
      prompt: "Who on the team is actively tracking right now?",
    },
  ];
}

const CANVAS_QUICK_STARTS: WorkspaceAgentQuickStart[] = [
  {
    id: "explain",
    label: "Explain this board",
    prompt: "Explain this board. What are the main nodes and how they relate?",
  },
  {
    id: "find",
    label: "Find a node",
    prompt: "Help me find a node on this canvas. Ask what I'm looking for if needed.",
  },
  {
    id: "layout",
    label: "Propose a layout",
    prompt: "Propose a cleaner layout for this board. Show before/after for approval.",
    toolPreset: "agent",
  },
];
