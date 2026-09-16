import { stepCountIs } from "@openrouter/sdk/lib/stop-conditions";

import {
  agencyDraftPlanSchema,
  agencyProposalSnapshotSchema,
  type AgencyDraftPlan,
} from "./agency-actions";
import {
  agencyAgentQuestionSchema,
  ASK_AGENCY_QUESTION_TOOL_NAME,
  isAgencyQuestionAnswerMessage,
  type AgencyAgentQuestion,
} from "./agency-question";
import { buildAgencyAgentTools } from "./agency-tools";
import { canvasDraftPlanSchema, canvasProposalSnapshotSchema } from "./canvas-actions";
import { knowledgeDraftPlanSchema, knowledgeProposalSnapshotSchema } from "./knowledge-actions";
import { buildCanvasScopedPatchNote } from "./canvas-scope-instructions";
import { buildCanvasWriteTools } from "./canvas-tools";
import { buildKnowledgeTools } from "./knowledge-tools";
import { resolveUnlockedSurfaces } from "./tool-catalog";
import {
  agencyQuestionRetryNote,
  agencyToolRetryNote,
  agencyUiPresentRetryNote,
  bootstrapAgencyMonthReportsCanvas,
  shouldBootstrapAgencyMonthReports,
} from "./agency-reports-canvas";
import { createOpenRouterClient } from "./client";
import { resolveOpenRouterReasoning } from "./reasoning-effort";
import { resolveOpenRouterModel } from "./models";
import {
  mergeToolCallFromStreamMessage,
  orderedToolCalls,
  type DashboardAgentStreamEvent,
} from "./stream-turn";
import {
  buildDashboardAgentTools,
  buildWorkspaceOverview,
  createDashboardAgentWorkspaceRuntime,
  summarizeBlock,
  type DashboardAgentWorkspaceRuntime,
} from "./tools";
import {
  DEFAULT_AGENT_MODEL,
  type AgentChatResponse,
  type AgentModelInputMessage,
  type AgentToolCall,
  type AgentModelPreset,
  type DashboardAgentConfig,
  type DashboardAgentToolPreset,
  type DashboardAgentWorkspaceContext,
  type DashboardConversationUsageLatest,
} from "./types";
import {
  artifactFromToolCall,
  cappedArtifacts,
  UI_PRESENT_SYSTEM_GUIDANCE,
  type AiUiArtifact,
} from "./ui-artifact";

type OpenRouterUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost?: number | null;
  inputTokensDetails?: {
    cachedTokens?: number | null;
  } | null;
  outputTokensDetails?: {
    reasoningTokens?: number | null;
  } | null;
};

function getScopedWorkspaceNodes(workspace: DashboardAgentWorkspaceContext) {
  if (workspace.scopeNodes && workspace.scopeNodes.length > 0) {
    return workspace.scopeNodes;
  }

  return workspace.nodes;
}

function hasScopedWorkspace(workspace: DashboardAgentWorkspaceContext) {
  if (!workspace.scopeNodes || workspace.scopeNodes.length === 0) {
    return false;
  }

  if (workspace.scopeNodes.length !== workspace.nodes.length) {
    return true;
  }

  return workspace.scopeNodes.some((node, index) => node.id !== workspace.nodes[index]?.id);
}

const SCOPED_CONTEXT_SEPARATOR = "::context::";

function parseScopedNodeId(nodeId: string) {
  const separatorIndex = nodeId.indexOf(SCOPED_CONTEXT_SEPARATOR);

  if (separatorIndex === -1) {
    return null;
  }

  return {
    originalNodeId: nodeId.slice(0, separatorIndex),
    focusedBlockId: nodeId.slice(separatorIndex + SCOPED_CONTEXT_SEPARATOR.length),
  };
}

function buildFocusedWorkspaceDetails(nodes: ReturnType<typeof getScopedWorkspaceNodes>) {
  if (nodes.length !== 1) {
    return null;
  }

  const node = nodes[0];

  if (!node || node.tabs.length !== 1) {
    return null;
  }

  const tab = node.tabs[0];

  if (!tab || tab.blocks.length !== 1) {
    return null;
  }

  const block = tab.blocks[0];

  if (!block) {
    return null;
  }

  const parsedScope = parseScopedNodeId(node.id);

  return [
    "Focused scope details:",
    `Node title: ${node.title}`,
    ...(node.label ? [`Node label: ${node.label}`] : []),
    ...(node.content ? [`Node context: ${node.content}`] : []),
    `Tab title: ${tab.title}`,
    `Block type: ${block.type}`,
    `Block title: ${block.title || "Untitled block"}`,
    `Block summary: ${summarizeBlock(block)}`,
    ...(parsedScope
      ? [
          `MUTATION TARGET IDs — use these when calling mutation tools:`,
          `  nodeId: ${parsedScope.originalNodeId}`,
          `  tabId: ${tab.id}`,
          `  blockId: ${parsedScope.focusedBlockId}`,
        ]
      : [
          `MUTATION TARGET IDs — use these when calling mutation tools:`,
          `  nodeId: ${node.id}`,
          `  tabId: ${tab.id}`,
          `  blockId: ${block.id}`,
        ]),
  ].join("\n");
}

function buildScopedWorkspaceContext(workspace: DashboardAgentWorkspaceContext) {
  const scopedNodes = getScopedWorkspaceNodes(workspace);

  if (!hasScopedWorkspace(workspace)) {
    return null;
  }

  if (scopedNodes.length === 1) {
    const node = scopedNodes[0];

    if (!node) {
      return null;
    }

    const parsedScope = parseScopedNodeId(node.id);
    const realNodeId = parsedScope?.originalNodeId ?? node.id;
    const activeTabId = workspace.activeTabId ?? node.viewState?.activeTabId;
    const activeTab = activeTabId ? node.tabs.find((tab) => tab.id === activeTabId) : node.tabs[0];

    const lines = [
      `CURRENT SCOPE: You are inside node "${node.title}" (nodeId: ${realNodeId}).`,
      ...(activeTab
        ? [
            `Active tab: "${activeTab.title}" (tabId: ${activeTab.id}) with ${activeTab.blocks.length} block${activeTab.blocks.length === 1 ? "" : "s"}.`,
          ]
        : []),
    ];

    if (parsedScope) {
      const focusedBlock = activeTab?.blocks.find(
        (block) => block.id === parsedScope.focusedBlockId,
      );

      if (focusedBlock) {
        lines.push(
          `Focused block: "${focusedBlock.title || "Untitled"}" (blockId: ${focusedBlock.id}, type: ${focusedBlock.type}).`,
        );
      }
    }

    lines.push(
      `When the user says "here", "this tab", "this node", or "current block", resolve to these IDs.`,
      `Default all mutations (create_block, patch_block, etc.) to nodeId: ${realNodeId}${activeTab ? `, tabId: ${activeTab.id}` : ""} unless the user explicitly names a different target.`,
    );

    return lines.join("\n");
  }

  return [
    `CURRENT SCOPE: You are scoped to ${scopedNodes.length} nodes. Prioritize mutations within these nodes.`,
    `Use the node/tab/block IDs from the scoped overview when the user refers to "here" or "this".`,
  ].join("\n");
}

function buildAgencyInstructions(workspace: DashboardAgentWorkspaceContext) {
  const userLabel = workspace.userName?.trim()
    ? `The current user is ${workspace.userName.trim()}.`
    : "The current user name is unavailable.";
  const todayUtc = new Date().toISOString().slice(0, 10);
  const scopeLines =
    workspace.scopeRefs && workspace.scopeRefs.length > 0
      ? [
          "Pinned scope chips for this turn:",
          ...workspace.scopeRefs.map((ref) => `- ${ref.kind}: ${ref.label} (${ref.id})`),
        ]
      : ["No Agency scope chips are pinned for this turn."];

  return [
    "You are Orch's Agency assistant.",
    "Help the user understand tracked time, projects, members, and report totals.",
    "Ground every answer in real Agency tool results. Never invent hours, members, or billable/waste splits.",
    "Never narrate tool calls in prose. Use actual function calls.",
    "Be concise, concrete, and factual.",
    `Today's date (UTC) is ${todayUtc}. Use YYYY-MM-DD for from/to. For "this month", use month start through today.`,
    "Prefer get_agency_reports_summary for project/client breakdowns; get_agency_time_summary for per-member totals.",
    "Time gap fill: call list_agency_time_gaps first. Report window, tracked hours, uncovered rows, and projected total. Do not propose time_entry.create until the user asks to insert. New entries must not overlap existing ones. Inherit project/task from the gap neighbor. Never mark a whole day as waste.",
    "Waste: propose time_entry.update isWaste on a single entryId from get_agency_time_entry. Never a day total or grouped row.",
    "Money: get_agency_client_bill then ui_present before/after amounts. In Agent mode propose money.export_client only when the user asks to export/persist. Never say an invoice was sent.",
    "Needs-action / member alerts: list_member_profile_alerts, then propose only targeted time_entry.update (for example isWaste on one entryId). Never waste a whole day. Do not send notifications.",
    UI_PRESENT_SYSTEM_GUIDANCE,
    userLabel,
    workspace.teamId ? `Active team id: ${workspace.teamId}.` : "Active team id is unavailable.",
    ...scopeLines,
  ].join("\n");
}

function buildAgencyAskInstructions(workspace: DashboardAgentWorkspaceContext) {
  return [
    buildAgencyInstructions(workspace),
    "Ask mode is read-only. Do not create, edit, or delete Agency data.",
    "Agency Ask requires tools: before answering any time/report/member/project question, call at least one Agency data tool.",
    "Default response shape: after the data tool, call ui_present with kind 'schema' (stack/grid/stat/table/pillRow). Then reply with one short line only — do not repeat the numbers as a bullet list.",
    "If you need the user to choose between options, call ask_agency_question instead of asking only in prose.",
    "If a requested breakdown is missing from tool output, say what the tool returned instead of inventing fields.",
  ].join("\n");
}

function buildAgencyPlanInstructions(workspace: DashboardAgentWorkspaceContext) {
  return [
    buildAgencyInstructions(workspace),
    "Plan mode workflow: (1) research with read tools, (2) must call ask_agency_question at least once to clarify assumptions (never ask only in prose), (3) after the user answers in a later turn, call draft_agency_plan, (4) prefer ui_present for context and for a schema plan overview.",
    "Do not call draft_agency_plan until ask_agency_question has been used this turn (or the user already answered a prior question). Do not claim changes were applied.",
    "After draft_agency_plan, call ui_present with a schema overview of the plan (steps, targets, impact). Then tell the user to Confirm in the UI.",
    "Never invent ids — use tool results. Do not call propose_agency_action in Plan mode.",
    "Time gap insert: propose time_entry.create per gap; one proposal per entry unless the user asks for a batch; always ui_present before/after. Do not insert during check.",
  ].join("\n");
}

function buildAgencyAgentModeInstructions(workspace: DashboardAgentWorkspaceContext) {
  return [
    buildAgencyInstructions(workspace),
    "Agent mode: never write Agency data directly. Call propose_agency_action for each intended write.",
    "When you need clarification, call ask_agency_question (do not ask only in prose). Prefer ui_present for before/after.",
    "Required: after each propose_agency_action, call ui_present with a clear before/after illustration, then tell the user to Approve or Reject.",
    "Never claim a write succeeded until the user Approves. Prefer one proposal at a time unless the user asks for a batch.",
    "Time gap insert: propose time_entry.create per gap; one proposal per entry unless the user asks for a batch; always ui_present before/after. Do not insert during check.",
  ].join("\n");
}

function buildCanvasPlanInstructions(workspace: DashboardAgentWorkspaceContext) {
  const scopedPatchNote = buildCanvasScopedPatchNote({
    scopeNodes: (workspace.scopeNodes ?? []).map((node) => ({ id: node.id, title: node.title })),
  });
  return [
    buildAgentInstructions({ ...workspace, surface: "canvas" }),
    "Plan mode workflow: (1) research with read tools, (2) must call ask_agency_question at least once to clarify assumptions (never ask only in prose), (3) after the user answers in a later turn, call draft_canvas_plan, (4) prefer ui_present for a schema or workspaceBlock plan overview.",
    "Do not call draft_canvas_plan until ask_agency_question has been used this turn (or the user already answered a prior question). Do not claim changes were applied.",
    "After draft_canvas_plan, call ui_present with an overview of the plan. Then tell the user to Confirm in the UI.",
    "Never invent ids — use tool results. Do not call propose_canvas_action in Plan mode.",
    "When drafting a new node, node.create.blocks must list every planned block type (task-list, table, notes, …). A title-only node.create only creates default empty Notes.",
    ...(scopedPatchNote ? [scopedPatchNote] : []),
  ].join("\n");
}

function buildCanvasAgentModeInstructions(workspace: DashboardAgentWorkspaceContext) {
  const scopedPatchNote = buildCanvasScopedPatchNote({
    scopeNodes: (workspace.scopeNodes ?? []).map((node) => ({ id: node.id, title: node.title })),
  });
  return [
    buildAgentInstructions({ ...workspace, surface: "canvas" }),
    "Canvas is a view of the team brain. Mix documents with notes, decisions, sources, and folders on the same board. Agency projects, tasks, members, clients, and time entries are live records — pin with placement.upsert, link with about, never copy or mutate Agency. Private notes apply immediately; team-visible writes still need Approve.",
    "This agent connects and groups: relation.create (about, supports, in) and folders. Do not invent Agency ids. Query before proposing.",
    "Agent mode: never write Canvas data directly. Call propose_canvas_action for board/block AST edits and propose_knowledge_action for notes, decisions, sources, folders, grouping, and Agency links.",
    "When you need clarification, call ask_agency_question (do not ask only in prose).",
    "Required: after each propose_canvas_action, call ui_present with kind workspaceBlock or workspaceNode, then tell the user to Approve or Reject.",
    "Never claim a write succeeded until the user Approves. Prefer one proposal at a time unless the user asks for a batch.",
    "If the workspace is scoped, use the scoped nodeId/tabId/blockId in propose_canvas_action. Do not propose create_node unless the user explicitly asks for a new node.",
    ...(scopedPatchNote ? [scopedPatchNote] : []),
  ].join("\n");
}

function appendCrossSurfaceInstructions(
  base: string,
  workspace: DashboardAgentWorkspaceContext,
  toolPreset: DashboardAgentToolPreset,
) {
  const surfaces = resolveUnlockedSurfaces({
    surface: workspace.surface ?? "canvas",
    unlockedSurfaces: workspace.unlockedSurfaces,
    scopeRefs: workspace.scopeRefs,
  });
  if (surfaces.length < 2) return base;
  const extra: string[] = [
    "This turn is unlocked across Agency and Canvas. Use Agency tools for time/projects/tasks and Canvas tools for the board.",
  ];
  if (toolPreset === "agent") {
    extra.push(
      "Writes stay on the proposal bus: propose_agency_action for Agency, propose_canvas_action for Canvas. Never claim either applied until Approve.",
    );
  }
  if (toolPreset === "plan") {
    extra.push(
      "Draft with draft_agency_plan and/or draft_canvas_plan depending on the requested domain.",
    );
  }
  const scopedPatchNote = buildCanvasScopedPatchNote({
    scopeNodes: (workspace.scopeNodes ?? []).map((node) => ({ id: node.id, title: node.title })),
  });
  if (scopedPatchNote) {
    extra.push(scopedPatchNote);
  }
  return [base, ...extra].join("\n");
}

function buildAgentInstructions(workspace: DashboardAgentWorkspaceContext) {
  if (workspace.surface === "agency") {
    // Mode-specific Agency instructions are applied in resolveAgentExecutionConfig.
    return buildAgencyInstructions(workspace);
  }

  const scopedNodes = getScopedWorkspaceNodes(workspace);
  const scopedWorkspace = hasScopedWorkspace(workspace);
  const updatedLabel = workspace.updatedAt
    ? `Workspace updated at ${workspace.updatedAt}.`
    : "Workspace update time is unavailable.";
  const userLabel = workspace.userName?.trim()
    ? `The current user is ${workspace.userName.trim()}.`
    : "The current user name is unavailable.";
  const marketplaceCount = workspace.marketplaceItems?.length ?? 0;
  const focusedWorkspaceDetails = buildFocusedWorkspaceDetails(scopedNodes);
  const scopedContext = buildScopedWorkspaceContext(workspace);
  const scopeRefLines =
    workspace.scopeRefs && workspace.scopeRefs.length > 0
      ? [
          "Pinned scope chips for this turn:",
          ...workspace.scopeRefs.map((ref) => `- ${ref.kind}: ${ref.label} (${ref.id})`),
        ]
      : [];

  return [
    "You are Orch's dashboard agent.",
    "Help the user reason about the dashboard, prioritize work, and spot gaps.",
    "Ground every answer in the actual workspace data. If you need more detail, call a tool instead of guessing.",
    "Be concise, concrete, and action-oriented.",
    UI_PRESENT_SYSTEM_GUIDANCE,
    userLabel,
    updatedLabel,
    `The dashboard currently has ${workspace.nodes.length} nodes.`,
    ...(scopedWorkspace
      ? [
          `The current turn is scoped to ${scopedNodes.length} node${scopedNodes.length === 1 ? "" : "s"}. Prioritize those unless the user asks you to work elsewhere.`,
        ]
      : []),
    `The marketplace currently has ${marketplaceCount} items.`,
    ...scopeRefLines,
    scopedWorkspace ? "Scoped dashboard overview:" : "Dashboard overview:",
    buildWorkspaceOverview(scopedNodes),
    ...(scopedContext ? [scopedContext] : []),
    ...(focusedWorkspaceDetails ? [focusedWorkspaceDetails] : []),
  ].join("\n");
}

function buildToolEnabledAgentInstructions(workspace: DashboardAgentWorkspaceContext) {
  return [buildAgentInstructions(workspace)].join("\n");
}

function buildDirectAnswerInstructions(workspace: DashboardAgentWorkspaceContext, note?: string) {
  return [
    buildAgentInstructions(workspace),
    "Answer directly from the provided workspace context.",
    "Do not call tools in this pass.",
    "If the context is incomplete, say what is missing instead of returning an empty response.",
    ...(note ? [note] : []),
  ].join("\n");
}

function buildAskInstructions(
  workspace: DashboardAgentWorkspaceContext,
  toolingUnavailable = false,
) {
  if (workspace.surface === "agency") {
    return toolingUnavailable
      ? [
          buildAgencyInstructions(workspace),
          "The selected model cannot call tools in this pass, so say that Agency data inspection requires a tools-capable model instead of inventing numbers.",
        ].join("\n")
      : buildAgencyAskInstructions(workspace);
  }

  const scopedWorkspace = hasScopedWorkspace(workspace);

  return [
    buildToolEnabledAgentInstructions(workspace),
    toolingUnavailable
      ? "The selected model cannot call tools in this pass, so answer directly from the provided context and say when deeper inspection would require a tools-capable model."
      : "Start from the provided workspace context. If you need inspection, prefer one compact list, search, or summary detail tool before answering.",
    "Prefer ui_present for structured answers (tables, rankings, multi-item lists); keep the chat reply to one short line.",
    "Ask mode is read-only. Do not create, rename, update, or delete nodes, tabs, or blocks.",
    "Avoid full raw node, tab, block, or marketplace payloads unless the answer is blocked.",
    "If you inspect a block, use get_block_details and rely on its summary instead of guessing field names.",
    ...(scopedWorkspace
      ? [
          "SCOPE WORKFLOW: The user is inside a specific node. Inspect the scoped node's data first before looking elsewhere. Use the provided nodeId and tabId to target your inspection tools.",
        ]
      : []),
  ].join("\n");
}

function normalizeMessages(messages: AgentModelInputMessage[]) {
  return messages.map((message) => ({
    role: message.role,
    content: typeof message.content === "string" ? message.content.trim() : message.content,
  }));
}

function latestUserAnsweredAgencyQuestion(messages: ReturnType<typeof normalizeMessages>): boolean {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== "user") continue;
    return isAgencyQuestionAnswerMessage(message.content);
  }
  return false;
}

function toolResultsForRetry(toolCalls: AgentToolCall[]): string {
  const results = toolCalls
    .filter((tool) => tool.status === "completed")
    .map((tool) => ({ name: tool.name, output: tool.output }));
  return JSON.stringify(results).slice(0, 12_000);
}

function resolveAgentExecutionConfig(
  workspace: DashboardAgentWorkspaceContext,
  toolPreset: DashboardAgentToolPreset,
  supportsTools: boolean,
) {
  const agencyFallback = buildDirectAnswerInstructions(
    workspace,
    "Tooling is unavailable for the selected model, so say you cannot load Agency time data instead of inventing hours.",
  );
  const canvasToolingFallback = buildDirectAnswerInstructions(
    workspace,
    "Tooling is unavailable for the selected model, so this answer is limited to the provided workspace context.",
  );
  const surface = workspace.surface ?? "canvas";

  if (surface === "agency") {
    switch (toolPreset) {
      case "agent":
        return {
          shouldUseTools: supportsTools,
          instructions: supportsTools
            ? appendCrossSurfaceInstructions(
                buildAgencyAgentModeInstructions(workspace),
                workspace,
                toolPreset,
              )
            : agencyFallback,
          fallbackInstructions: agencyFallback,
          maxSteps: 10,
          maxOutputTokens: 1_200,
          shouldRetryForInspection: supportsTools,
        };
      case "plan":
        return {
          shouldUseTools: supportsTools,
          instructions: supportsTools
            ? appendCrossSurfaceInstructions(
                buildAgencyPlanInstructions(workspace),
                workspace,
                toolPreset,
              )
            : agencyFallback,
          fallbackInstructions: agencyFallback,
          maxSteps: 8,
          maxOutputTokens: 1_200,
          shouldRetryForInspection: supportsTools,
        };
      case "ask":
        return {
          shouldUseTools: supportsTools,
          instructions: supportsTools
            ? appendCrossSurfaceInstructions(
                buildAgencyAskInstructions(workspace),
                workspace,
                toolPreset,
              )
            : agencyFallback,
          fallbackInstructions: agencyFallback,
          maxSteps: 8,
          maxOutputTokens: 1_200,
          shouldRetryForInspection: supportsTools,
        };
      default: {
        const _exhaustive: never = toolPreset;
        return _exhaustive;
      }
    }
  }

  switch (toolPreset) {
    case "agent":
      return {
        shouldUseTools: supportsTools,
        instructions: supportsTools
          ? appendCrossSurfaceInstructions(
              buildCanvasAgentModeInstructions(workspace),
              workspace,
              toolPreset,
            )
          : buildDirectAnswerInstructions(
              workspace,
              "Deep inspection is limited because the selected model cannot call tools.",
            ),
        fallbackInstructions: buildDirectAnswerInstructions(
          workspace,
          "Deep inspection is limited because the selected model cannot call tools.",
        ),
        maxSteps: 10,
        maxOutputTokens: 1_200,
        shouldRetryForInspection: supportsTools && workspace.nodes.length > 0,
      };
    case "plan":
      return {
        shouldUseTools: supportsTools,
        instructions: supportsTools
          ? appendCrossSurfaceInstructions(
              buildCanvasPlanInstructions(workspace),
              workspace,
              toolPreset,
            )
          : canvasToolingFallback,
        fallbackInstructions: canvasToolingFallback,
        maxSteps: 8,
        maxOutputTokens: 1_200,
        shouldRetryForInspection: supportsTools && workspace.nodes.length > 0,
      };
    case "ask":
      return {
        shouldUseTools: supportsTools,
        instructions: supportsTools
          ? appendCrossSurfaceInstructions(buildAskInstructions(workspace), workspace, toolPreset)
          : canvasToolingFallback,
        fallbackInstructions: canvasToolingFallback,
        maxSteps: 6,
        maxOutputTokens: 1_200,
        shouldRetryForInspection: supportsTools && workspace.nodes.length > 0,
      };
    default: {
      const _exhaustive: never = toolPreset;
      return _exhaustive;
    }
  }
}

type ToolPassArgs = {
  model: string;
  modelPreset?: AgentModelPreset;
  workspace: DashboardAgentWorkspaceContext;
  workspaceRuntime: DashboardAgentWorkspaceRuntime;
  toolPreset: DashboardAgentToolPreset;
  agencyRuntime?: DashboardAgentConfig["agencyRuntime"];
  canvasRuntime?: DashboardAgentConfig["canvasRuntime"];
  normalizedMessages: ReturnType<typeof normalizeMessages>;
  instructions: string;
  maxSteps: number;
  temperature?: number;
  maxOutputTokens?: number;
  contextLength: number | null;
  allowedToolNames?: string[];
  signal?: AbortSignal;
};

type ToolPassLiveEvent =
  | { type: "token"; delta: string }
  | { type: "tool"; tool: AgentToolCall }
  | { type: "artifact"; artifact: AiUiArtifact }
  | {
      type: "plan";
      plan:
        | AgencyDraftPlan
        | {
            planId: string;
            title: string;
            summary: string;
            steps: Array<{ label: string; action: unknown }>;
          };
    }
  | { type: "question"; question: AgencyAgentQuestion }
  | {
      type: "proposal";
      proposal: {
        proposalId: string;
        status: "pending";
        label: string;
        action: unknown;
        before: unknown;
        after: unknown;
      };
    };

type ToolPassResult = {
  responseText: string;
  toolCalls: AgentToolCall[];
  artifacts: AiUiArtifact[];
  usage: DashboardConversationUsageLatest | null;
  stopped: boolean;
  providerError: string | null;
};

function isHardProviderLimitError(errorMessage: string): boolean {
  return /credits|max_tokens|afford|weekly limit/i.test(errorMessage);
}

function isProviderTimeoutError(errorMessage: string): boolean {
  return /timed out|timeout/i.test(errorMessage);
}

function providerErrorUserMessage(errorMessage: string): string {
  if (isHardProviderLimitError(errorMessage)) {
    return "The model request hit an OpenRouter credit or max-token limit. Pick a cheaper/faster model, or raise the key limit on OpenRouter.";
  }
  if (isProviderTimeoutError(errorMessage)) {
    return "The model provider timed out before Agency tools could run. Retry, or switch off Free / pick Balanced or Pro for Plan.";
  }
  const detail = errorMessage.trim().slice(0, 160) || "unknown error";
  return `The model provider failed (${detail}). Try another model tier, or retry in a moment.`;
}

type MergedAgentTool =
  | ReturnType<typeof buildDashboardAgentTools>[number]
  | ReturnType<typeof buildCanvasWriteTools>[number]
  | ReturnType<typeof buildKnowledgeTools>[number]
  | ReturnType<typeof buildAgencyAgentTools>[number];

function mergeOpenRouterTools(groups: MergedAgentTool[][]) {
  const seen = new Set<string>();
  const merged: MergedAgentTool[] = [];
  for (const group of groups) {
    for (const entry of group) {
      if (entry.type !== "function") continue;
      const name = entry.function.name;
      if (seen.has(name)) continue;
      seen.add(name);
      merged.push(entry);
    }
  }
  return merged;
}

async function* streamToolEnabledPass(
  args: ToolPassArgs,
): AsyncGenerator<ToolPassLiveEvent, ToolPassResult> {
  const surfaces = resolveUnlockedSurfaces({
    surface: args.workspace.surface ?? "canvas",
    unlockedSurfaces: args.workspace.unlockedSurfaces,
    scopeRefs: args.workspace.scopeRefs,
  });
  const canvasReads: MergedAgentTool[] = surfaces.includes("canvas")
    ? buildDashboardAgentTools(
        args.workspaceRuntime,
        args.workspace.marketplaceItems ?? [],
        args.toolPreset === "ask" ? "ask" : args.toolPreset,
      )
    : [];
  const canvasWrites: MergedAgentTool[] =
    surfaces.includes("canvas") && args.canvasRuntime
      ? [
          ...buildCanvasWriteTools(args.canvasRuntime, args.toolPreset),
          ...buildKnowledgeTools(args.canvasRuntime, args.toolPreset),
        ]
      : [];
  const agencyTools: MergedAgentTool[] =
    surfaces.includes("agency") && args.agencyRuntime
      ? buildAgencyAgentTools(args.agencyRuntime, args.toolPreset)
      : [];
  const availableTools = mergeOpenRouterTools([canvasReads, canvasWrites, agencyTools]);
  const tools = args.allowedToolNames
    ? availableTools.filter(
        (entry) =>
          entry.type === "function" && args.allowedToolNames?.includes(entry.function.name),
      )
    : availableTools;
  const calls = new Map<string, AgentToolCall>();
  const callOrder: string[] = [];
  const reasoning = resolveOpenRouterReasoning(args.modelPreset);
  const result = createOpenRouterClient().callModel({
    model: args.model,
    instructions: args.instructions,
    input: args.normalizedMessages,
    tools,
    stopWhen: [stepCountIs(args.maxSteps)],
    ...(args.temperature === undefined ? {} : { temperature: args.temperature }),
    ...(args.maxOutputTokens === undefined ? {} : { maxOutputTokens: args.maxOutputTokens }),
    ...(reasoning ? { reasoning } : {}),
  });

  const queue: ToolPassLiveEvent[] = [];
  let wake: (() => void) | null = null;
  let pumpsDone = false;
  let accumulated = "";
  let stopped = Boolean(args.signal?.aborted);

  const notify = () => {
    wake?.();
    wake = null;
  };
  const enqueue = (event: ToolPassLiveEvent) => {
    queue.push(event);
    notify();
  };

  const cancelOnAbort = () => {
    stopped = true;
    void result.cancel();
    notify();
  };
  args.signal?.addEventListener("abort", cancelOnAbort, { once: true });

  const textPump = (async () => {
    try {
      for await (const delta of result.getTextStream()) {
        if (args.signal?.aborted) {
          stopped = true;
          break;
        }
        if (!delta) continue;
        accumulated += delta;
        enqueue({ type: "token", delta });
      }
    } catch {
      // cancel / stream end surfaced via getResponse below
    }
  })();

  const artifacts: AiUiArtifact[] = [];

  const toolPump = (async () => {
    try {
      for await (const message of result.getNewMessagesStream()) {
        if (args.signal?.aborted) {
          stopped = true;
          break;
        }
        const tool = mergeToolCallFromStreamMessage(message, calls, callOrder);
        if (tool) {
          enqueue({ type: "tool", tool: { ...tool } });
          if (tool.status === "completed") {
            const artifact = artifactFromToolCall(tool);
            if (artifact) {
              artifacts.push(artifact);
              enqueue({ type: "artifact", artifact });
            }
            if (
              tool.name === "draft_agency_plan" ||
              tool.name === "draft_canvas_plan" ||
              tool.name === "draft_knowledge_plan"
            ) {
              const plan =
                tool.name === "draft_canvas_plan"
                  ? canvasDraftPlanSchema.safeParse(tool.output)
                  : tool.name === "draft_knowledge_plan"
                    ? knowledgeDraftPlanSchema.safeParse(tool.output)
                    : agencyDraftPlanSchema.safeParse(tool.output);
              if (plan.success) {
                enqueue({ type: "plan", plan: plan.data });
              }
            }
            if (tool.name === ASK_AGENCY_QUESTION_TOOL_NAME) {
              const question = agencyAgentQuestionSchema.safeParse(tool.output);
              if (question.success) {
                enqueue({ type: "question", question: question.data });
              }
            }
            if (
              tool.name === "propose_agency_action" ||
              tool.name === "propose_canvas_action" ||
              tool.name === "propose_knowledge_action"
            ) {
              const proposal =
                tool.name === "propose_canvas_action"
                  ? canvasProposalSnapshotSchema.safeParse({
                      ...(typeof tool.output === "object" && tool.output ? tool.output : {}),
                      status: "pending",
                    })
                  : tool.name === "propose_knowledge_action"
                    ? knowledgeProposalSnapshotSchema.safeParse({
                        ...(typeof tool.output === "object" && tool.output ? tool.output : {}),
                        status: "pending",
                      })
                    : agencyProposalSnapshotSchema.safeParse({
                        ...(typeof tool.output === "object" && tool.output ? tool.output : {}),
                        status: "pending",
                      });
              if (proposal.success) {
                enqueue({
                  type: "proposal",
                  proposal: {
                    proposalId: proposal.data.proposalId,
                    status: "pending",
                    label: proposal.data.label ?? "Proposed change",
                    action: proposal.data.action,
                    before: proposal.data.before,
                    after: proposal.data.after,
                  },
                });
              }
            }
          }
        }
      }
    } catch {
      // streaming errors are surfaced by getResponse rejection below
    }
  })();

  const pumps = Promise.all([textPump, toolPump]).finally(() => {
    pumpsDone = true;
    notify();
  });

  while (!pumpsDone || queue.length > 0) {
    if (queue.length === 0) {
      if (pumpsDone) break;
      await new Promise<void>((resolve) => {
        wake = resolve;
      });
      continue;
    }
    yield queue.shift()!;
  }

  await pumps;

  let usage: DashboardConversationUsageLatest | null = null;
  let providerError: string | null = null;
  try {
    const [responseText, response] = await Promise.all([result.getText(), result.getResponse()]);
    accumulated = responseText || accumulated;
    usage = normalizeUsage(response.usage, args.model, args.contextLength);
  } catch (error) {
    providerError = error instanceof Error ? error.message : String(error);
    // cancelled mid-stream: keep accumulated tokens
  } finally {
    args.signal?.removeEventListener("abort", cancelOnAbort);
  }

  return {
    responseText: accumulated.trim(),
    toolCalls: orderedToolCalls(callOrder, calls),
    artifacts: cappedArtifacts(artifacts),
    usage,
    stopped: stopped || Boolean(args.signal?.aborted),
    providerError,
  };
}

async function* streamTextOnlyPass(args: {
  model: string;
  modelPreset?: AgentModelPreset;
  instructions: string;
  normalizedMessages: ReturnType<typeof normalizeMessages>;
  temperature?: number;
  maxOutputTokens?: number;
  contextLength: number | null;
  signal?: AbortSignal;
}): AsyncGenerator<ToolPassLiveEvent, ToolPassResult> {
  const reasoning = resolveOpenRouterReasoning(args.modelPreset);
  const result = createOpenRouterClient().callModel({
    model: args.model,
    instructions: args.instructions,
    input: args.normalizedMessages,
    ...(args.temperature === undefined ? {} : { temperature: args.temperature }),
    ...(args.maxOutputTokens === undefined ? {} : { maxOutputTokens: args.maxOutputTokens }),
    ...(reasoning ? { reasoning } : {}),
  });

  let accumulated = "";
  let stopped = Boolean(args.signal?.aborted);
  const cancelOnAbort = () => {
    stopped = true;
    void result.cancel();
  };
  args.signal?.addEventListener("abort", cancelOnAbort, { once: true });

  try {
    for await (const delta of result.getTextStream()) {
      if (args.signal?.aborted) {
        stopped = true;
        break;
      }
      if (!delta) continue;
      accumulated += delta;
      yield { type: "token", delta };
    }
  } catch {
    // cancelled
  }

  let usage: DashboardConversationUsageLatest | null = null;
  let providerError: string | null = null;
  try {
    const [responseText, response] = await Promise.all([result.getText(), result.getResponse()]);
    accumulated = responseText || accumulated;
    usage = normalizeUsage(response.usage, args.model, args.contextLength);
  } catch (error) {
    providerError = error instanceof Error ? error.message : String(error);
  } finally {
    args.signal?.removeEventListener("abort", cancelOnAbort);
  }

  return {
    responseText: accumulated.trim(),
    toolCalls: [],
    artifacts: [],
    usage,
    stopped: stopped || Boolean(args.signal?.aborted),
    providerError,
  };
}

function normalizeUsage(
  usage: OpenRouterUsage | null | undefined,
  modelId: string,
  contextLength: number | null,
): DashboardConversationUsageLatest | null {
  if (!usage) {
    return null;
  }

  return {
    modelId,
    contextLength,
    inputTokens: usage.inputTokens,
    cachedTokens: usage.inputTokensDetails?.cachedTokens ?? 0,
    outputTokens: usage.outputTokens,
    reasoningTokens: usage.outputTokensDetails?.reasoningTokens ?? 0,
    totalTokens: usage.totalTokens,
    costUsd: usage.cost ?? null,
  };
}

export async function runDashboardAgent(
  messages: AgentModelInputMessage[],
  workspace: DashboardAgentWorkspaceContext,
  config: DashboardAgentConfig = {},
): Promise<AgentChatResponse> {
  let done: Extract<DashboardAgentStreamEvent, { type: "done" }> | null = null;
  for await (const event of streamDashboardAgent(messages, workspace, config)) {
    if (event.type === "done") {
      done = event;
    }
  }
  if (!done) {
    return {
      response: "I couldn't generate a response.",
      messagesCount: messages.length + 1,
      model: config.model?.trim() || DEFAULT_AGENT_MODEL,
      toolsCalled: [],
      workspaceNodeCount: workspace.nodes.length,
      usage: null,
      workspaceSnapshot: null,
    };
  }
  return {
    response: done.responseText || "I couldn't generate a response.",
    messagesCount: messages.length + 1,
    model: done.model,
    toolsCalled: done.toolCalls,
    workspaceNodeCount: done.workspaceNodeCount,
    usage: done.usage,
    workspaceSnapshot: done.workspaceSnapshot,
  };
}

export async function* streamDashboardAgent(
  messages: AgentModelInputMessage[],
  workspace: DashboardAgentWorkspaceContext,
  config: DashboardAgentConfig & { signal?: AbortSignal } = {},
): AsyncGenerator<DashboardAgentStreamEvent, void, void> {
  const toolCalls: AgentToolCall[] = [];
  const normalizedMessages = normalizeMessages(messages);
  const questionAnsweredThisTurn = latestUserAnsweredAgencyQuestion(normalizedMessages);
  const workspaceRuntime = createDashboardAgentWorkspaceRuntime({
    nodes: workspace.nodes,
    updatedAt: workspace.updatedAt,
  });
  const selectedModel = await resolveOpenRouterModel(config.model);
  const model = selectedModel?.id ?? config.model?.trim() ?? DEFAULT_AGENT_MODEL;
  const surface = workspace.surface ?? "canvas";
  const toolPreset = config.toolPreset ?? "ask";
  const supportsTools = selectedModel?.supportsTools ?? true;
  const executionConfig = resolveAgentExecutionConfig(
    { ...workspace, surface },
    toolPreset,
    supportsTools,
  );
  let usage: DashboardConversationUsageLatest | null = null;
  let responseText = "";
  let stopped = Boolean(config.signal?.aborted);
  let providerError: string | null = null;
  const artifacts: AiUiArtifact[] = [];

  if (executionConfig.shouldUseTools && !stopped) {
    try {
      const initialIterator = streamToolEnabledPass({
        model,
        modelPreset: config.modelPreset,
        workspace: { ...workspace, surface },
        workspaceRuntime,
        toolPreset,
        agencyRuntime: config.agencyRuntime,
        canvasRuntime: config.canvasRuntime,
        normalizedMessages,
        instructions: executionConfig.instructions,
        maxSteps: executionConfig.maxSteps,
        temperature: config.temperature,
        maxOutputTokens: executionConfig.maxOutputTokens ?? config.maxOutputTokens,
        contextLength: selectedModel?.contextLength ?? null,
        signal: config.signal,
      });
      let initialNext = await initialIterator.next();
      while (!initialNext.done) {
        yield initialNext.value;
        initialNext = await initialIterator.next();
      }
      responseText = initialNext.value.responseText;
      usage = initialNext.value.usage;
      stopped = stopped || initialNext.value.stopped;
      providerError = initialNext.value.providerError;
      toolCalls.push(...initialNext.value.toolCalls);
      artifacts.push(...initialNext.value.artifacts);

      const shouldRetry =
        !stopped &&
        !providerError &&
        executionConfig.shouldRetryForInspection &&
        toolCalls.length === 0;

      if (shouldRetry) {
        const retryNote =
          surface === "agency"
            ? agencyToolRetryNote(toolPreset)
            : workspace.nodes.length > 0
              ? "You have not inspected the workspace yet. Call a relevant tool before answering."
              : null;
        if (retryNote) {
          const retryIterator = streamToolEnabledPass({
            model,
            modelPreset: config.modelPreset,
            workspace: { ...workspace, surface },
            workspaceRuntime,
            toolPreset,
            agencyRuntime: config.agencyRuntime,
            canvasRuntime: config.canvasRuntime,
            normalizedMessages,
            instructions: `${executionConfig.instructions}\n${retryNote}`,
            maxSteps: executionConfig.maxSteps,
            temperature: config.temperature,
            maxOutputTokens: executionConfig.maxOutputTokens ?? config.maxOutputTokens,
            contextLength: selectedModel?.contextLength ?? null,
            signal: config.signal,
          });
          let retryNext = await retryIterator.next();
          while (!retryNext.done) {
            yield retryNext.value;
            retryNext = await retryIterator.next();
          }
          if (retryNext.value.responseText) {
            responseText = retryNext.value.responseText;
          }
          if (retryNext.value.usage) {
            usage = retryNext.value.usage;
          }
          if (retryNext.value.providerError) {
            providerError = retryNext.value.providerError;
          }
          stopped = stopped || retryNext.value.stopped;
          toolCalls.push(...retryNext.value.toolCalls);
          artifacts.push(...retryNext.value.artifacts);
        }
      }

      // Plan must ask via the question tool before drafting.
      const askedQuestion = toolCalls.some(
        (tool) => tool.name === ASK_AGENCY_QUESTION_TOOL_NAME && tool.status === "completed",
      );
      const shouldRetryForQuestion =
        !stopped &&
        !providerError &&
        surface === "agency" &&
        toolPreset === "plan" &&
        executionConfig.shouldUseTools &&
        !questionAnsweredThisTurn &&
        !askedQuestion;
      if (shouldRetryForQuestion) {
        const questionNote = agencyQuestionRetryNote(toolPreset);
        if (questionNote) {
          const priorResults = toolResultsForRetry(toolCalls);
          const questionRetryIterator = streamToolEnabledPass({
            model,
            modelPreset: config.modelPreset,
            workspace: { ...workspace, surface },
            workspaceRuntime,
            toolPreset,
            agencyRuntime: config.agencyRuntime,
            canvasRuntime: config.canvasRuntime,
            normalizedMessages,
            instructions: `${executionConfig.instructions}\n${questionNote}\nPrior Agency tool results (reuse these; do not repeat reads):\n${priorResults}`,
            maxSteps: Math.min(4, executionConfig.maxSteps),
            temperature: config.temperature,
            maxOutputTokens: executionConfig.maxOutputTokens ?? config.maxOutputTokens,
            contextLength: selectedModel?.contextLength ?? null,
            allowedToolNames: [ASK_AGENCY_QUESTION_TOOL_NAME],
            signal: config.signal,
          });
          let questionRetryNext = await questionRetryIterator.next();
          while (!questionRetryNext.done) {
            yield questionRetryNext.value;
            questionRetryNext = await questionRetryIterator.next();
          }
          if (questionRetryNext.value.responseText) {
            responseText = questionRetryNext.value.responseText;
          }
          if (questionRetryNext.value.usage) {
            usage = questionRetryNext.value.usage;
          }
          if (questionRetryNext.value.providerError) {
            providerError = questionRetryNext.value.providerError;
          }
          stopped = stopped || questionRetryNext.value.stopped;
          toolCalls.push(...questionRetryNext.value.toolCalls);
          artifacts.push(...questionRetryNext.value.artifacts);
        }
      }

      // Tools ran but skipped the canvas — text-only soft fallback cannot call ui_present.
      const shouldRetryForUiPresent =
        !stopped &&
        !providerError &&
        surface === "agency" &&
        executionConfig.shouldUseTools &&
        toolCalls.length > 0 &&
        artifacts.length === 0;
      if (shouldRetryForUiPresent) {
        const priorResults = toolResultsForRetry(toolCalls);
        const uiRetryIterator = streamToolEnabledPass({
          model,
          modelPreset: config.modelPreset,
          workspace: { ...workspace, surface },
          workspaceRuntime,
          toolPreset,
          agencyRuntime: config.agencyRuntime,
          canvasRuntime: config.canvasRuntime,
          normalizedMessages,
          instructions: `${executionConfig.instructions}\n${agencyUiPresentRetryNote(toolPreset)}\nPrior Agency tool results (render these; do not repeat tools):\n${priorResults}`,
          maxSteps: Math.min(4, executionConfig.maxSteps),
          temperature: config.temperature,
          maxOutputTokens: executionConfig.maxOutputTokens ?? config.maxOutputTokens,
          contextLength: selectedModel?.contextLength ?? null,
          allowedToolNames: ["ui_present"],
          signal: config.signal,
        });
        let uiRetryNext = await uiRetryIterator.next();
        while (!uiRetryNext.done) {
          yield uiRetryNext.value;
          uiRetryNext = await uiRetryIterator.next();
        }
        if (uiRetryNext.value.responseText) {
          responseText = uiRetryNext.value.responseText;
        }
        if (uiRetryNext.value.usage) {
          usage = uiRetryNext.value.usage;
        }
        if (uiRetryNext.value.providerError) {
          providerError = uiRetryNext.value.providerError;
        }
        stopped = stopped || uiRetryNext.value.stopped;
        toolCalls.push(...uiRetryNext.value.toolCalls);
        artifacts.push(...uiRetryNext.value.artifacts);
      }

      // Ask-only: Mixtral and similar often skip tools — paint this month's hours so Ask
      // still returns UI. Never bootstrap Plan/Agent (that reuses the same hours canvas and
      // looks like the previous Ask thread leaked into a new chat).
      if (
        !stopped &&
        surface === "agency" &&
        shouldBootstrapAgencyMonthReports(toolPreset) &&
        config.agencyRuntime &&
        artifacts.length === 0 &&
        !toolCalls.some((tool) => tool.name.startsWith("get_agency_"))
      ) {
        const boot = await bootstrapAgencyMonthReportsCanvas(config.agencyRuntime);
        toolCalls.push(boot.tool);
        yield { type: "tool", tool: { ...boot.tool, status: "in_progress" } };
        yield { type: "tool", tool: boot.tool };
        artifacts.push(boot.artifact);
        yield { type: "artifact", artifact: boot.artifact };
        if (!responseText.trim()) {
          responseText = boot.responseText;
        }
      }
    } catch {
      // Keep any tools/artifacts already streamed; only clear empty text.
      if (!responseText.trim()) {
        responseText = "";
      }
    }
  }

  let finalResponse = responseText.trim();

  const askedAgencyQuestion = toolCalls.some(
    (tool) => tool.name === ASK_AGENCY_QUESTION_TOOL_NAME && tool.status === "completed",
  );

  // Empty completion with no provider error: optional text-only pass.
  // Never soft-fallback after a provider error, when a canvas exists, or when a question
  // card is waiting (text-only cannot call ui_present / ask_agency_question).
  const willSoftFallback =
    !finalResponse && !stopped && !providerError && artifacts.length === 0 && !askedAgencyQuestion;
  if (willSoftFallback) {
    const toolsWereCalled = toolCalls.length > 0;
    const runtimeHasChanges = workspaceRuntime.hasChanges();
    const fallbackMaxOutputTokens = executionConfig.maxOutputTokens ?? config.maxOutputTokens;

    const fallbackInstructions = toolsWereCalled
      ? [
          buildAgentInstructions(workspace),
          runtimeHasChanges
            ? "You already called tools and applied mutations to the workspace. Reply with one short plain-language line. Do not dump JSON. Do not say that tools are unavailable."
            : "You called tools but could not paint a canvas. Reply with one short plain-language line about what you found. Do not dump JSON or markdown tables. Do not say that tools are unavailable.",
        ].join("\n")
      : executionConfig.fallbackInstructions;

    const fallbackIterator = streamTextOnlyPass({
      model,
      modelPreset: config.modelPreset,
      instructions: fallbackInstructions,
      normalizedMessages,
      temperature: config.temperature,
      maxOutputTokens: fallbackMaxOutputTokens,
      contextLength: selectedModel?.contextLength ?? null,
      signal: config.signal,
    });
    let fallbackNext = await fallbackIterator.next();
    while (!fallbackNext.done) {
      yield fallbackNext.value;
      fallbackNext = await fallbackIterator.next();
    }
    finalResponse = fallbackNext.value.responseText;
    usage = fallbackNext.value.usage;
    stopped = stopped || fallbackNext.value.stopped;
    if (!finalResponse.trim() && fallbackNext.value.providerError) {
      providerError = fallbackNext.value.providerError;
    }
  }

  if (!finalResponse.trim() && providerError) {
    finalResponse = providerErrorUserMessage(providerError);
  }

  if (!finalResponse.trim() && !stopped) {
    if (
      toolCalls.some(
        (tool) =>
          (tool.name === "draft_agency_plan" ||
            tool.name === "draft_canvas_plan" ||
            tool.name === "draft_knowledge_plan") &&
          tool.status === "completed",
      )
    ) {
      finalResponse = "Drafted a plan — review the card and Confirm when ready.";
    } else if (
      toolCalls.some(
        (tool) =>
          (tool.name === "propose_agency_action" ||
            tool.name === "propose_canvas_action" ||
            tool.name === "propose_knowledge_action") &&
          tool.status === "completed",
      )
    ) {
      finalResponse = "Proposed a change — review before/after, then Approve or Reject.";
    } else if (askedAgencyQuestion) {
      finalResponse = "Answer the question above to continue.";
    } else if (artifacts.length > 0) {
      finalResponse = "Opened a canvas with the results.";
    } else if (surface === "agency" && toolPreset === "plan") {
      finalResponse =
        "I couldn't draft a plan from that request. Try naming the entries or projects to change, or switch to Ask to inspect time first.";
    } else if (surface === "agency" && toolPreset === "agent") {
      finalResponse =
        "I couldn't propose a change from that request. Try being more specific, or switch to Ask to inspect time first.";
    }
  }

  yield {
    type: "done",
    responseText: finalResponse || (stopped ? "" : "I couldn't generate a response."),
    toolCalls,
    artifacts: cappedArtifacts(artifacts),
    usage,
    model,
    workspaceNodeCount: workspaceRuntime.getNodes().length,
    workspaceSnapshot: workspaceRuntime.hasChanges() ? workspaceRuntime.toSnapshot() : null,
  };
}

export async function runTaskAgent(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  context: {
    taskTitle: string;
    taskStatus: string;
    projectName: string;
    clientName: string;
    assigneeName: string | null;
    recentMessages: Array<{ role: "user" | "assistant"; content: string }>;
  },
  config: {
    model?: string;
    maxOutputTokens?: number;
  } = {},
) {
  const client = createOpenRouterClient();
  const selectedModel = await resolveOpenRouterModel(config.model);
  const model = selectedModel?.id ?? config.model?.trim() ?? DEFAULT_AGENT_MODEL;

  const instructions = [
    "You are Orch's agency task assistant.",
    "Answer questions about the task using only the task context and recent messages provided.",
    "You are read-only in this version: do not edit task status, assignee, or due date.",
    "Be concise and concrete.",
    "",
    "Task context:",
    `- Title: ${context.taskTitle}`,
    `- Status: ${context.taskStatus}`,
    `- Project: ${context.projectName}`,
    `- Client: ${context.clientName}`,
    context.assigneeName ? `- Assignee: ${context.assigneeName}` : "- Assignee: unassigned",
    "",
    "Recent messages in this thread:",
    ...context.recentMessages.map((m) => `${m.role}: ${m.content}`),
  ].join("\n");

  const normalizedMessages = messages.map((m) => ({
    role: m.role,
    content: m.content.trim(),
  }));

  const result = client.callModel({
    model,
    instructions,
    input: normalizedMessages,
    ...(config.maxOutputTokens === undefined ? {} : { maxOutputTokens: config.maxOutputTokens }),
  });

  const [text, response] = await Promise.all([result.getText(), result.getResponse()]);

  return {
    response: text.trim() || "I couldn't generate a response.",
    model,
    usage: normalizeUsage(response.usage, model, selectedModel?.contextLength ?? null),
  };
}

export * from "./agency-actions";
export * from "./canvas-actions";
export * from "./agency-question";
export * from "./attachment-content";
export * from "./models";
export * from "./model-routing";
export * from "./stream-turn";
export * from "./memory-prompt";
export * from "./types";
export { listAgentToolCatalog, resolveUnlockedSurfaces } from "./tool-catalog";
