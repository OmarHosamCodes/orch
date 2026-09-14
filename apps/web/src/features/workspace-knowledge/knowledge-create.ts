import type { KnowledgeAction } from "@orch/agent/knowledge-actions";
import {
  defaultKnowledgePlacementSize,
  knowledgeChipLabel,
  type KnowledgeObjectType,
} from "@orch/workspace";

export const knowledgeCreateKinds = [
  "note",
  "decision",
  "folder",
  "person",
  "source",
  "pin",
  "document",
] as const;

export type KnowledgeCreateKind = (typeof knowledgeCreateKinds)[number];

export const knowledgeDecisionStatuses = ["open", "decided", "deferred"] as const;
export type KnowledgeDecisionStatus = (typeof knowledgeDecisionStatuses)[number];

export const knowledgePinKinds = [
  "agency.project",
  "agency.task",
  "agency.client",
  "agency.member",
] as const;
export type KnowledgePinKind = (typeof knowledgePinKinds)[number];

export const knowledgeLinkRelationTypes = ["about", "supports", "related", "mentions"] as const;

export function knowledgeCreateDescription(kind: KnowledgeCreateKind): string {
  switch (kind) {
    case "note":
      return "A short thought. Lands on the board where you clicked.";
    case "decision":
      return "A call with status. Link it to a project if you have one.";
    case "folder":
      return "A frame you can drop other cards into.";
    case "person":
      return "Someone in this knowledge graph, not an Agency member pin.";
    case "source":
      return "A URL or uploaded file. Bytes stay in storage.";
    case "pin":
      return "A live Agency record. Placement only. Nothing is copied.";
    case "document":
      return "A canvas node with blocks and a page.";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export type KnowledgeDialogKind = Exclude<KnowledgeCreateKind, "document"> | "unplaced";

export function knowledgeCreateAccentClass(kind: KnowledgeDialogKind): string {
  switch (kind) {
    case "note":
      return "bg-amber-500/12 text-amber-800 dark:text-amber-200";
    case "decision":
      return "bg-violet-500/12 text-violet-800 dark:text-violet-200";
    case "folder":
      return "bg-sky-500/12 text-sky-800 dark:text-sky-200";
    case "person":
      return "bg-teal-500/12 text-teal-800 dark:text-teal-200";
    case "source":
      return "bg-orange-500/12 text-orange-800 dark:text-orange-200";
    case "pin":
      return "bg-primary/10 text-primary";
    case "unplaced":
      return "bg-muted text-foreground";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function knowledgeCreateIconClass(kind: KnowledgeCreateKind): string {
  switch (kind) {
    case "note":
      return "text-amber-600 dark:text-amber-400";
    case "decision":
      return "text-violet-600 dark:text-violet-400";
    case "folder":
      return "text-sky-600 dark:text-sky-400";
    case "person":
      return "text-teal-600 dark:text-teal-400";
    case "source":
      return "text-orange-600 dark:text-orange-400";
    case "pin":
      return "text-primary";
    case "document":
      return "text-foreground";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function knowledgeCreateSubmitLabel(kind: KnowledgeCreateKind): string {
  switch (kind) {
    case "note":
      return "Place note";
    case "decision":
      return "Place decision";
    case "folder":
      return "Place folder";
    case "person":
      return "Place person";
    case "source":
      return "Place source";
    case "pin":
      return "Pin on board";
    case "document":
      return "Open editor";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function knowledgeCreateLabel(kind: KnowledgeCreateKind): string {
  switch (kind) {
    case "note":
      return "Note";
    case "decision":
      return "Decision";
    case "folder":
      return "Folder";
    case "person":
      return "Person";
    case "source":
      return "Source";
    case "pin":
      return "Agency pin";
    case "document":
      return "Node";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function buildObjectCreateAction(input: {
  kind: Exclude<KnowledgeCreateKind, "pin" | "document">;
  title: string;
  visibility: "private" | "team";
  teamId?: string | null;
  status?: KnowledgeDecisionStatus;
  recommendation?: string;
  sourceKind?: "url" | "upload";
  url?: string;
  uploadId?: string;
  filename?: string;
  mediaType?: string;
  about?: { objectType: KnowledgeObjectType; id: string };
  placement?: { x: number; y: number };
}): KnowledgeAction {
  const title = input.title.trim();
  const visibility = input.visibility;
  const teamId = visibility === "team" ? (input.teamId ?? null) : null;
  if (input.kind === "source") {
    const properties =
      input.sourceKind === "upload"
        ? {
            kind: "upload" as const,
            uploadId: input.uploadId ?? "",
            filename: input.filename,
            mediaType: input.mediaType,
          }
        : { kind: "url" as const, url: input.url ?? "" };
    return {
      type: "object.create",
      objectType: "source",
      title,
      visibility,
      teamId,
      properties,
      about: input.about,
      placement: input.placement,
    };
  }
  if (input.kind === "decision") {
    return {
      type: "object.create",
      objectType: "decision",
      title,
      visibility,
      teamId,
      properties: {
        status: input.status ?? "open",
        recommendation: input.recommendation ?? "",
      },
      about: input.about,
      placement: input.placement,
    };
  }
  if (input.kind === "folder") {
    return {
      type: "object.create",
      objectType: "folder",
      title,
      visibility,
      teamId,
      placement: input.placement,
    };
  }
  return {
    type: "object.create",
    objectType: input.kind,
    title,
    visibility,
    teamId,
    about: input.about,
    placement: input.placement,
  };
}

export function buildPinPlacementAction(input: {
  objectId: string;
  objectType: KnowledgePinKind;
  teamId: string;
  x: number;
  y: number;
}): KnowledgeAction {
  const size = defaultKnowledgePlacementSize(input.objectType);
  return {
    type: "placement.upsert",
    objectId: input.objectId,
    objectType: input.objectType,
    teamId: input.teamId,
    x: input.x,
    y: input.y,
    width: size.width,
    height: size.height,
  };
}

export function pinChipLabel(objectType: KnowledgePinKind): string {
  return knowledgeChipLabel(objectType);
}
