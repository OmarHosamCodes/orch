import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AgentSurface, DashboardAgentToolPreset } from "@orch/agent/types";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";

export function useWorkspaceAgentData(args: {
  activeConversationId: string | null;
  surface: AgentSurface;
  unlockedSurfaces: AgentSurface[];
  toolPreset: DashboardAgentToolPreset;
  toolsMenuOpen: boolean;
}) {
  const session = authClient.useSession();
  const queryClient = useQueryClient();
  const authEnabled = Boolean(session.data?.user);
  const conversationsListQueryOptions = orpc.agent.conversations.list.queryOptions({
    input: { filter: "open" },
  });
  const conversationsSettledQueryOptions = orpc.agent.conversations.list.queryOptions({
    input: { filter: "settled" },
  });
  const conversationsCompactQueryOptions = orpc.agent.conversations.compact.queryOptions();
  const conversationsQuery = useQuery({ ...conversationsListQueryOptions, enabled: authEnabled });
  const settledConversationsQuery = useQuery({
    ...conversationsSettledQueryOptions,
    enabled: authEnabled,
  });
  const compactConversationsQuery = useQuery({
    ...conversationsCompactQueryOptions,
    enabled: authEnabled,
    refetchInterval: 8_000,
  });
  const modelCatalogQuery = useQuery({
    ...orpc.agent.modelCatalog.queryOptions(),
    enabled: authEnabled,
    staleTime: 10 * 60 * 1000,
  });
  const accountStatusQuery = useQuery({
    ...orpc.agent.accountStatus.queryOptions(),
    enabled: authEnabled,
    staleTime: 60 * 1000,
  });
  const activeConversationQuery = useQuery({
    ...orpc.agent.conversations.get.queryOptions({
      input: { conversationId: args.activeConversationId ?? "" },
    }),
    enabled: Boolean(authEnabled && args.activeConversationId),
  });
  const toolsCatalogQuery = useQuery({
    ...orpc.agent.tools.catalog.queryOptions({
      input: {
        surface: args.surface,
        mode: args.toolPreset,
        unlockedSurfaces: args.unlockedSurfaces,
      },
    }),
    enabled: false,
    staleTime: 5 * 60 * 1000,
  });
  const composerDraftQueryOptions = orpc.agent.conversations.draft.get.queryOptions({
    input: args.activeConversationId ? { conversationId: args.activeConversationId } : {},
  });
  const composerDraftQuery = useQuery({
    ...composerDraftQueryOptions,
    enabled: authEnabled,
  });
  const inboxQuery = useQuery({
    ...orpc.agent.inbox.list.queryOptions({ input: {} }),
    enabled: authEnabled,
    refetchInterval: 30_000,
  });

  return {
    queryClient,
    conversationsListQueryOptions,
    conversationsSettledQueryOptions,
    conversationsCompactQueryOptions,
    conversationsQuery,
    settledConversationsQuery,
    compactConversationsQuery,
    modelCatalogQuery,
    accountStatusQuery,
    activeConversationQuery,
    toolsCatalogQuery,
    composerDraftQueryOptions,
    composerDraftQuery,
    inboxQuery,
    renameConversationMutation: useMutation(orpc.agent.conversations.rename.mutationOptions()),
    deleteConversationMutation: useMutation(orpc.agent.conversations.delete.mutationOptions()),
    settleConversationMutation: useMutation(orpc.agent.conversations.settle.mutationOptions()),
    unsettleConversationMutation: useMutation(orpc.agent.conversations.unsettle.mutationOptions()),
    markConversationReadMutation: useMutation(orpc.agent.conversations.markRead.mutationOptions()),
    markInboxReadMutation: useMutation(orpc.agent.inbox.markRead.mutationOptions()),
    upsertComposerDraftMutation: useMutation(
      orpc.agent.conversations.draft.upsert.mutationOptions(),
    ),
    discardComposerDraftMutation: useMutation(
      orpc.agent.conversations.draft.discard.mutationOptions(),
    ),
  };
}
