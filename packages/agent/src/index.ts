import { stepCountIs } from "@openrouter/sdk/lib/stop-conditions";

import {
  agencyDraftPlanSchema,
  agencyProposalSnapshotSchema,
  type AgencyDraftPlan,
} from "./agency-actions";
import { buildAgencyAgentTools } from "./agency-tools";
import { canvasDraftPlanSchema } from "./canvas-actions";
import { knowledgeDraftPlanSchema } from "./knowledge-actions";
import { buildCanvasScopedPatchNote } from "./canvas-scope-instructions";
import { buildCanvasWriteTools } from "./canvas-tools";
import { buildKnowledgeTools } from "./knowledge-tools";
import { buildMemoryTools } from "./memory-tools";
import {
  createLeakedToolMarkupFilter,
  finalizeAssistantResponseText,
  isIncompleteToolPreamble,
  stripLeakedToolCallMarkup,
} from "./tool-call-markup";
import { resolveUnlockedSurfaces } from "./tool-catalog";
import { agencyToolRetryNote } from "./agency-reports-canvas";
import { createOpenRouterClient, openRouterFetchOptions } from "./client";
import { resolveOpenRouterReasoning } from "./reasoning-effort";
import { resolveOpenRouterModel } from "./models";
import { formatPlannerPlanForTools, runPlannerPass } from "./planner";
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
import { artifactFromToolCall, cappedArtifacts, type AiUiArtifact } from "./ui-artifact";

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

function buildPersonalAssistantInstructions(workspace: DashboardAgentWorkspaceContext) {
  const userLabel = workspace.userName?.trim()
    ? `The current user is ${workspace.userName.trim()}.`
    : "The current user name is unavailable.";
  const todayUtc = new Date().toISOString().slice(0, 10);
  const scopeLines =
    workspace.scopeRefs && workspace.scopeRefs.length > 0
      ? [
          "Pinned scope chips are focus for this turn, not catalog unlocks:",
          ...workspace.scopeRefs.map((ref) => `- ${ref.kind}: ${ref.label} (${ref.id})`),
        ]
      : ["No scope chips are pinned for this turn."];
  const scopedPatchNote = buildCanvasScopedPatchNote({
    scopeNodes: (workspace.scopeNodes ?? []).map((node) => ({ id: node.id, title: node.title })),
  });
  const scopedNodes = getScopedWorkspaceNodes(workspace);
  const scopedWorkspace = hasScopedWorkspace(workspace);
  const focusedWorkspaceDetails = buildFocusedWorkspaceDetails(scopedNodes);
  const scopedContext = buildScopedWorkspaceContext(workspace);

  return [
    "You are Orch, a you-only personal assistant. Agency and Canvas are tools you drive.",
    "There is no Ask, Plan, or Agent mode. First think with an internal plan, then call tools.",
    "Agency data writes must go through propose_agency_action and wait for Approve. Never claim an Agency write applied until the user Approves.",
    "Canvas and knowledge writes apply immediately with apply_canvas_action and apply_knowledge_action. After creating something, name it and how to Open it.",
    "When the user tells you a preference (report format, waste priority, timezone), call remember_fact immediately. Do not store personal preferences as knowledge objects.",
    "Scope chips focus attention; you already have both Agency and Canvas tools.",
    "Ground answers in real tool results. Never invent hours, members, or billable/waste splits.",
    "Never narrate tool calls in prose. Use actual function calls.",
    "After tools return, write the full answer in the same turn. Do not stop at I'll gather / let me check — tool cards already show the work.",
    "Be concise, concrete, and factual. Ask clarifying questions in prose when needed.",
    `Today's date (UTC) is ${todayUtc}. Use YYYY-MM-DD for from/to. For "this month", use month start through today.`,
    "Prefer get_agency_reports_summary for project/client breakdowns; get_agency_time_summary for per-member totals.",
    "Time gap fill: call list_agency_time_gaps first. Report window, tracked hours, uncovered rows, and projected total. Do not propose time_entry.create until the user asks to insert. New entries must not overlap existing ones. Inherit project/task from the gap neighbor. Never mark a whole day as waste.",
    "Waste: propose time_entry.update isWaste on a single entryId from get_agency_time_entry. Never a day total or grouped row.",
    "Money: get_agency_client_bill then propose money.export_client only when the user asks to export/persist. Never say an invoice was sent.",
    "Needs-action / member alerts: list_member_profile_alerts, then propose only targeted time_entry.update (for example isWaste on one entryId). Never waste a whole day. Do not send notifications.",
    userLabel,
    workspace.teamId ? `Active team id: ${workspace.teamId}.` : "Active team id is unavailable.",
    ...scopeLines,
    ...(scopedPatchNote ? [scopedPatchNote] : []),
    `The dashboard currently has ${workspace.nodes.length} nodes.`,
    ...(scopedWorkspace
      ? [
          `The current turn is scoped to ${scopedNodes.length} node${scopedNodes.length === 1 ? "" : "s"}. Prioritize those unless the user asks you to work elsewhere.`,
        ]
      : []),
    scopedWorkspace ? "Scoped dashboard overview:" : "Dashboard overview:",
    buildWorkspaceOverview(scopedNodes),
    ...(scopedContext ? [scopedContext] : []),
    ...(focusedWorkspaceDetails ? [focusedWorkspaceDetails] : []),
  ].join("\n");
}

function buildAgentInstructions(workspace: DashboardAgentWorkspaceContext) {
  return buildPersonalAssistantInstructions(workspace);
}

function buildDirectAnswerInstructions(workspace: DashboardAgentWorkspaceContext, note?: string) {
  return [
    buildPersonalAssistantInstructions(workspace),
    "Answer directly from the provided workspace context.",
    "Do not call tools in this pass.",
    "If the context is incomplete, say what is missing instead of returning an empty response.",
    ...(note ? [note] : []),
  ].join("\n");
}

function resolveAgentExecutionConfig(
  workspace: DashboardAgentWorkspaceContext,
  _toolPreset: DashboardAgentToolPreset,
  supportsTools: boolean,
) {
  void _toolPreset;
  const fallback = buildDirectAnswerInstructions(
    workspace,
    "Tooling is unavailable for the selected model, so say you cannot load live data instead of inventing it.",
  );
  return {
    shouldUseTools: supportsTools,
    instructions: supportsTools ? buildPersonalAssistantInstructions(workspace) : fallback,
    fallbackInstructions: fallback,
    maxSteps: 10,
    maxOutputTokens: 1_200,
    shouldRetryForInspection: supportsTools,
  };
}

function formatToolFindingsForSynthesis(tools: AgentToolCall[]): string {
  const lines: string[] = [];
  let used = 0;
  for (const tool of tools) {
    if (tool.status !== "completed" && tool.status !== "error") continue;
    const payload = tool.status === "error" ? { error: tool.error } : (tool.output ?? null);
    let body = "";
    try {
      body = JSON.stringify(payload);
    } catch {
      body = String(payload);
    }
    if (body.length > 800) body = `${body.slice(0, 800)}…`;
    const line = `${tool.name}: ${body}`;
    if (used + line.length > 4_000) break;
    lines.push(line);
    used += line.length;
  }
  return lines.join("\n");
}

function normalizeMessages(messages: AgentModelInputMessage[]) {
  return messages.map((message) => ({
    role: message.role,
    content:
      typeof message.content === "string"
        ? stripLeakedToolCallMarkup(message.content) || message.content.trim()
        : message.content,
  }));
}

type ToolPassArgs = {
  model: string;
  modelPreset?: AgentModelPreset;
  workspace: DashboardAgentWorkspaceContext;
  workspaceRuntime: DashboardAgentWorkspaceRuntime;
  toolPreset: DashboardAgentToolPreset;
  agencyRuntime?: DashboardAgentConfig["agencyRuntime"];
  canvasRuntime?: DashboardAgentConfig["canvasRuntime"];
  memoryRuntime?: DashboardAgentConfig["memoryRuntime"];
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
      type: "created_object";
      object: { kind: "node" | "block" | "knowledge"; id: string; title: string; href: string };
    }
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
  | ReturnType<typeof buildAgencyAgentTools>[number]
  | ReturnType<typeof buildMemoryTools>[number];

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
  const memoryTools: MergedAgentTool[] = args.memoryRuntime
    ? buildMemoryTools(args.memoryRuntime)
    : [];
  const availableTools = mergeOpenRouterTools([
    canvasReads,
    canvasWrites,
    agencyTools,
    memoryTools,
  ]);
  const tools = args.allowedToolNames
    ? availableTools.filter(
        (entry) =>
          entry.type === "function" && args.allowedToolNames?.includes(entry.function.name),
      )
    : availableTools;
  const calls = new Map<string, AgentToolCall>();
  const callOrder: string[] = [];
  const reasoning = resolveOpenRouterReasoning(args.modelPreset);
  const result = createOpenRouterClient().callModel(
    {
      model: args.model,
      instructions: args.instructions,
      input: args.normalizedMessages,
      tools,
      stopWhen: [stepCountIs(args.maxSteps)],
      ...(args.temperature === undefined ? {} : { temperature: args.temperature }),
      ...(args.maxOutputTokens === undefined ? {} : { maxOutputTokens: args.maxOutputTokens }),
      ...(reasoning ? { reasoning } : {}),
    },
    openRouterFetchOptions(args.signal),
  );

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
    const markupFilter = createLeakedToolMarkupFilter();
    try {
      for await (const delta of result.getTextStream()) {
        if (args.signal?.aborted) {
          stopped = true;
          break;
        }
        if (!delta) continue;
        accumulated += delta;
        const visible = markupFilter.push(delta);
        if (visible) enqueue({ type: "token", delta: visible });
      }
      const rest = markupFilter.flush();
      if (rest) enqueue({ type: "token", delta: rest });
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
            if (tool.name === "apply_canvas_action" || tool.name === "apply_knowledge_action") {
              const output =
                tool.output && typeof tool.output === "object"
                  ? (tool.output as Record<string, unknown>)
                  : {};
              const label = typeof output.label === "string" ? output.label : "Created";
              const href = typeof output.boardHref === "string" ? output.boardHref : "/canvas";
              if (tool.name === "apply_canvas_action") {
                const nodeId = typeof output.nodeId === "string" ? output.nodeId : null;
                const blockId = typeof output.blockId === "string" ? output.blockId : null;
                const id = blockId ?? nodeId;
                if (id) {
                  enqueue({
                    type: "created_object",
                    object: {
                      kind: blockId ? "block" : "node",
                      id,
                      title: label,
                      href,
                    },
                  });
                }
              } else {
                const objectId = typeof output.objectId === "string" ? output.objectId : null;
                if (objectId) {
                  enqueue({
                    type: "created_object",
                    object: {
                      kind: "knowledge",
                      id: objectId,
                      title: label,
                      href:
                        !href || href === "/canvas" || href === "/" ? `/object/${objectId}` : href,
                    },
                  });
                }
              }
            }
            if (tool.name === "propose_agency_action") {
              const proposal = agencyProposalSnapshotSchema.safeParse({
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
    accumulated = stripLeakedToolCallMarkup(responseText || accumulated);
    usage = normalizeUsage(response.usage, args.model, args.contextLength);
  } catch (error) {
    providerError = error instanceof Error ? error.message : String(error);
    accumulated = stripLeakedToolCallMarkup(accumulated);
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
  const result = createOpenRouterClient().callModel(
    {
      model: args.model,
      instructions: args.instructions,
      input: args.normalizedMessages,
      ...(args.temperature === undefined ? {} : { temperature: args.temperature }),
      ...(args.maxOutputTokens === undefined ? {} : { maxOutputTokens: args.maxOutputTokens }),
      ...(reasoning ? { reasoning } : {}),
    },
    openRouterFetchOptions(args.signal),
  );

  let accumulated = "";
  let stopped = Boolean(args.signal?.aborted);
  const cancelOnAbort = () => {
    stopped = true;
    void result.cancel();
  };
  args.signal?.addEventListener("abort", cancelOnAbort, { once: true });

  const markupFilter = createLeakedToolMarkupFilter();
  try {
    for await (const delta of result.getTextStream()) {
      if (args.signal?.aborted) {
        stopped = true;
        break;
      }
      if (!delta) continue;
      accumulated += delta;
      const visible = markupFilter.push(delta);
      if (visible) yield { type: "token", delta: visible };
    }
    const rest = markupFilter.flush();
    if (rest) yield { type: "token", delta: rest };
  } catch {
    // cancelled
  }

  let usage: DashboardConversationUsageLatest | null = null;
  let providerError: string | null = null;
  try {
    const [responseText, response] = await Promise.all([result.getText(), result.getResponse()]);
    accumulated = stripLeakedToolCallMarkup(responseText || accumulated);
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
  const workspaceRuntime = createDashboardAgentWorkspaceRuntime({
    nodes: workspace.nodes,
    updatedAt: workspace.updatedAt,
  });
  const selectedModel = await resolveOpenRouterModel(config.model);
  const model = selectedModel?.id ?? config.model?.trim() ?? DEFAULT_AGENT_MODEL;
  const surface = workspace.surface ?? "canvas";
  const toolPreset = "agent" as const;
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
      let plannerNote = formatPlannerPlanForTools("");
      try {
        plannerNote = formatPlannerPlanForTools(
          await runPlannerPass({
            model,
            messages: normalizedMessages,
            signal: config.signal,
          }),
        );
      } catch {
        plannerNote = formatPlannerPlanForTools("");
      }
      const instructions = `${executionConfig.instructions}\n${plannerNote}`;
      const initialIterator = streamToolEnabledPass({
        model,
        modelPreset: config.modelPreset,
        workspace: { ...workspace, surface },
        workspaceRuntime,
        toolPreset,
        agencyRuntime: config.agencyRuntime,
        canvasRuntime: config.canvasRuntime,
        memoryRuntime: config.memoryRuntime,
        normalizedMessages,
        instructions,
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
            memoryRuntime: config.memoryRuntime,
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
    } catch {
      // Keep any tools/artifacts already streamed; only clear empty text.
      if (!responseText.trim()) {
        responseText = "";
      }
    }
  }

  let finalResponse = responseText.trim();

  const toolsWereCalled = toolCalls.length > 0;
  const willSoftFallback =
    !stopped &&
    !providerError &&
    artifacts.length === 0 &&
    (toolsWereCalled ? isIncompleteToolPreamble(finalResponse) : !finalResponse);
  if (willSoftFallback) {
    const runtimeHasChanges = workspaceRuntime.hasChanges();
    const fallbackMaxOutputTokens = executionConfig.maxOutputTokens ?? config.maxOutputTokens;
    const findings = formatToolFindingsForSynthesis(toolCalls);

    const fallbackInstructions = toolsWereCalled
      ? [
          buildAgentInstructions(workspace),
          runtimeHasChanges
            ? "You already called tools and applied mutations to the workspace. Write the actual answer now. Do not dump JSON. Do not say that tools are unavailable."
            : "You already called tools. Write the actual answer to the user from these findings. Include figures, dates, risks, and next steps when they asked for them. Do not dump JSON or markdown tables. Do not say you will gather or look something up. This is the final reply.",
          findings ? `Findings:\n${findings}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      : executionConfig.fallbackInstructions;

    if (finalResponse) {
      yield { type: "token", delta: "\n\n" };
    }

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
    const synthesized = fallbackNext.value.responseText.trim();
    finalResponse = synthesized || finalResponse;
    usage = fallbackNext.value.usage;
    stopped = stopped || fallbackNext.value.stopped;
    if (!synthesized && fallbackNext.value.providerError) {
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
      toolCalls.some((tool) => tool.name === "propose_agency_action" && tool.status === "completed")
    ) {
      finalResponse = "Proposed an Agency change — review before/after, then Approve or Reject.";
    } else if (
      toolCalls.some(
        (tool) =>
          (tool.name === "apply_canvas_action" || tool.name === "apply_knowledge_action") &&
          tool.status === "completed",
      )
    ) {
      finalResponse = "Created it for you — Open from What I created.";
    }
  }

  yield {
    type: "done",
    responseText: finalizeAssistantResponseText({
      responseText: finalResponse,
      stopped,
      toolCount: toolCalls.length,
    }),
    toolCalls,
    artifacts: cappedArtifacts(artifacts),
    usage,
    model,
    workspaceNodeCount: workspaceRuntime.getNodes().length,
    workspaceSnapshot: workspaceRuntime.hasChanges() ? workspaceRuntime.toSnapshot() : null,
  };
}

export * from "./agency-actions";
export * from "./canvas-actions";
export * from "./agency-question";
export * from "./attachment-content";
export * from "./models";
export * from "./model-routing";
export * from "./stream-turn";
export * from "./budget-model";
export * from "./write-class";
export * from "./planner";
export * from "./memory-prompt";
export * from "./memory-tools";
export * from "./tool-call-markup";
export * from "./types";
export { listAgentToolCatalog, resolveUnlockedSurfaces } from "./tool-catalog";
