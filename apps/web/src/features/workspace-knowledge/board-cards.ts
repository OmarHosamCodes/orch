import {
  KNOWLEDGE_INBOX_CLUSTER_ID,
  type KnowledgeBoardCard,
  type WorkspaceNodeTint,
} from "@orch/workspace";

import type { CanvasNodeModel } from "@/features/workspace/canvas/canvas-types";

export function isDocumentBoardCard(node: CanvasNodeModel): boolean {
  return !node.kind || node.kind === "document";
}

function documentToCanvasCard(node: CanvasNodeModel): CanvasNodeModel {
  return {
    ...node,
    kind: "document",
    objectType: "document",
    href: `/node/${node.id}`,
  };
}

function knowledgeCardToCanvasNode(card: KnowledgeBoardCard): CanvasNodeModel {
  return {
    id: card.id,
    kind: card.kind,
    objectType: card.objectType,
    title: card.title,
    label: card.title,
    x: card.x,
    y: card.y,
    width: card.width,
    height: card.height,
    parentId: card.parentId ?? null,
    href: card.href,
    agencyHref: card.agencyHref,
    chip: card.chip,
    bodyPreview: card.bodyPreview,
    readOnly: card.readOnly,
    unplaced: card.unplaced,
    nodeType: card.nodeType,
    connections: card.connections ?? [],
    dashboard: card.tint ? { tint: card.tint as WorkspaceNodeTint } : undefined,
  };
}

export function mergeCanvasBoard(
  documents: CanvasNodeModel[],
  knowledge: KnowledgeBoardCard[],
): CanvasNodeModel[] {
  const documentIds = new Set(documents.map((node) => node.id));
  const docs = documents.map(documentToCanvasCard);
  const extras = knowledge
    .filter((card) => !documentIds.has(card.id))
    .map(knowledgeCardToCanvasNode);
  return [...docs, ...extras];
}

export function findFolderDropTarget(nodes: CanvasNodeModel[], cardId: string): string | null {
  const card = nodes.find((node) => node.id === cardId);
  if (!card || card.kind === "folder" || card.kind === "inbox" || isDocumentBoardCard(card)) {
    return null;
  }
  const centerX = card.x + card.width / 2;
  const centerY = card.y + card.height / 2;
  for (const folder of nodes) {
    if (folder.kind !== "folder" || folder.id === card.id) continue;
    if (
      centerX >= folder.x &&
      centerX <= folder.x + folder.width &&
      centerY >= folder.y &&
      centerY <= folder.y + folder.height
    ) {
      return folder.id;
    }
  }
  return null;
}

function pointInRect(node: CanvasNodeModel, x: number, y: number): boolean {
  return x >= node.x && x <= node.x + node.width && y >= node.y && y <= node.y + node.height;
}

export function shouldPersistKnowledgeGeometry(nodes: CanvasNodeModel[], cardId: string): boolean {
  const card = nodes.find((node) => node.id === cardId);
  if (!card || isDocumentBoardCard(card) || card.kind === "inbox") {
    return false;
  }
  if (findFolderDropTarget(nodes, cardId)) {
    return true;
  }
  const inbox = nodes.find(
    (node) => node.id === KNOWLEDGE_INBOX_CLUSTER_ID || node.kind === "inbox",
  );
  const stillUnplaced =
    Boolean(card.unplaced) ||
    card.parentId === KNOWLEDGE_INBOX_CLUSTER_ID ||
    card.parentId === inbox?.id;
  if (!stillUnplaced || !inbox) {
    return true;
  }
  const centerX = card.x + card.width / 2;
  const centerY = card.y + card.height / 2;
  return !pointInRect(inbox, centerX, centerY);
}

export function knowledgeOpenHref(node: CanvasNodeModel, teamId?: string | null): string | null {
  if (node.kind === "inbox") return null;
  if (isDocumentBoardCard(node)) return `/node/${node.id}`;
  if (node.kind === "agency") {
    const params = new URLSearchParams();
    if (node.objectType) params.set("objectType", node.objectType);
    if (teamId) params.set("teamId", teamId);
    const query = params.toString();
    return `/object/${node.id}${query ? `?${query}` : ""}`;
  }
  return node.href ?? `/object/${node.id}`;
}
