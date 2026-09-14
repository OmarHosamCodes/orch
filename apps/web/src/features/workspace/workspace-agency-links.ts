import type { WorkspaceNode } from "@orch/workspace";

export function agencyProjectHref(projectId: string) {
  return `/agency/projects/${projectId}`;
}

function agencyTaskHref(projectId: string, taskId: string) {
  return `/agency/projects/${projectId}?taskId=${encodeURIComponent(taskId)}`;
}

export function canvasNodeHref(nodeId: string) {
  return `/node/${nodeId}`;
}

export function findCanvasNodeForAgencyProject(nodes: WorkspaceNode[], projectId: string) {
  return (
    nodes.find(
      (node) =>
        node.visibility === "team" &&
        node.agencyRef?.projectId === projectId &&
        !node.agencyRef.taskId,
    ) ?? nodes.find((node) => node.visibility === "team" && node.agencyRef?.projectId === projectId)
  );
}

export function agencyRefHref(ref: NonNullable<WorkspaceNode["agencyRef"]>) {
  if (ref.taskId && ref.projectId) return agencyTaskHref(ref.projectId, ref.taskId);
  if (ref.projectId) return agencyProjectHref(ref.projectId);
  return null;
}

export function agencyRefFromKnowledgeTargets(input: {
  teamId: string;
  projectId?: string;
  taskId?: string;
}) {
  if (!input.projectId) return null;
  return {
    teamId: input.teamId,
    projectId: input.projectId,
    ...(input.taskId ? { taskId: input.taskId } : {}),
  };
}
