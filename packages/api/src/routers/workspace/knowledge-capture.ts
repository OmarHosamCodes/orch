import type { KnowledgeAction } from "@orch/agent/knowledge-actions";
import { knowledgeActionLabel } from "@orch/agent/knowledge-actions";

import { applyKnowledgeAction } from "./knowledge-service";

export async function captureKnowledgeAction(
  actorUserId: string,
  input: { action: KnowledgeAction; teamId?: string | null; label?: string },
) {
  const action = input.action;
  const teamId = input.teamId ?? null;
  const label = input.label?.trim() || knowledgeActionLabel(action);
  const applied = await applyKnowledgeAction(actorUserId, { action, teamId });
  return {
    status: "applied" as const,
    proposalId: null,
    objectId: applied.objectId,
    before: applied.before,
    after: applied.after,
    label,
  };
}
