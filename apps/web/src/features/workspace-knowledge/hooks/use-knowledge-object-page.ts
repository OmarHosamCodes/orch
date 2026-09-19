import {
  knowledgeChipLabel,
  knowledgeObjectHref,
  knowledgeObjectTypeSchema,
  parseKnowledgeSourceProperties,
  type KnowledgeObjectType,
  type KnowledgeRelationType,
} from "@orch/workspace";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import type { KnowledgeObjectPageViewProps } from "@/features/workspace-knowledge/knowledge-object-page-view";
import { useWorkspaceKnowledgeStore } from "@/features/workspace-knowledge/stores/workspace-knowledge";
import { knowledgeLinkRelationTypes } from "@/features/workspace-knowledge/knowledge-create";
import { useNavigate, useParams, useSearchParams } from "@/lib/navigation";
import { orpc } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";

function asObjectType(value: string | null): KnowledgeObjectType | undefined {
  if (!value) return undefined;
  const parsed = knowledgeObjectTypeSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function useKnowledgeObjectPage(): KnowledgeObjectPageViewProps {
  const navigate = useNavigate();
  const { id = "" } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const objectType = asObjectType(searchParams.get("objectType"));
  const teamId = searchParams.get("teamId") ?? undefined;

  const query = useQuery({
    ...orpc.workspace.knowledge.get.queryOptions({
      input: { id, objectType, teamId },
    }),
    enabled: id.length > 0,
  });
  const captureKnowledge = useWorkspaceKnowledgeStore((state) => state.captureKnowledge);
  const capturePending = useWorkspaceKnowledgeStore((state) => state.capturePending);
  const [linkRelationType, setLinkRelationType] = useState<string>("about");
  const [linkTargetId, setLinkTargetId] = useState("");

  const targetsQuery = useQuery({
    ...orpc.workspace.knowledge.query.queryOptions({
      input: { teamId, includeAgency: true, limit: 40 },
    }),
  });

  const view = query.data?.view;
  const object = query.data?.object;
  const relations = query.data?.relations ?? [];

  const propertyLines = useMemo(() => {
    const lines: { label: string; value: string }[] = [];
    if (!object) return lines;
    if (object.objectType === "source") {
      const source = parseKnowledgeSourceProperties(object.properties);
      if (source?.kind) lines.push({ label: "Kind", value: source.kind });
      if (source?.filename) lines.push({ label: "File", value: source.filename });
      if (source?.mediaType) lines.push({ label: "Type", value: source.mediaType });
      if (source?.uploadId) lines.push({ label: "Upload", value: source.uploadId });
      if (source?.url) lines.push({ label: "URL", value: source.url });
    }
    if (typeof object.properties.status === "string") {
      lines.push({ label: "Status", value: object.properties.status });
    }
    if (typeof object.properties.recommendation === "string" && object.properties.recommendation) {
      lines.push({ label: "Recommendation", value: object.properties.recommendation });
    }
    return lines;
  }, [object]);

  const body =
    typeof object?.properties.body === "string"
      ? object.properties.body
      : view?.origin === "agency"
        ? null
        : null;

  const backlinks = useMemo(() => {
    return relations
      .filter((relation) => relation.toObjectId === id)
      .map((relation) => ({
        id: relation.id,
        label: `${relation.relationType} from ${relation.fromObjectType}`,
        href: knowledgeObjectHref(
          relation.fromObjectType === "document" ? "document" : relation.fromObjectType,
          relation.fromObjectId,
        ),
      }));
  }, [id, relations]);

  const agencyLinks = useMemo(() => {
    const links: { label: string; href: string }[] = [];
    if (view?.href) {
      links.push({ label: view.title, href: view.href });
    }
    for (const relation of relations) {
      if (!relation.toObjectType.startsWith("agency.") || !relation.toObjectId) continue;
      links.push({
        label: relation.toObjectType.replace("agency.", ""),
        href: knowledgeObjectHref(relation.toObjectType, relation.toObjectId),
      });
    }
    return links;
  }, [relations, view]);

  const onOpenOnBoard = useCallback(() => {
    void navigate("/canvas");
  }, [navigate]);

  const linkTargets = useMemo(
    () =>
      (targetsQuery.data?.items ?? [])
        .filter((item) => item.id !== id)
        .map((item) => ({
          id: `${item.objectType}:${item.id}`,
          label: `${item.title} (${item.objectType})`,
          href: item.href ?? knowledgeObjectHref(item.objectType, item.id),
        })),
    [id, targetsQuery.data?.items],
  );

  const onCreateLink = useCallback(() => {
    const selected = linkTargets.find((item) => item.id === linkTargetId);
    const target = (targetsQuery.data?.items ?? []).find(
      (item) => `${item.objectType}:${item.id}` === linkTargetId,
    );
    if (!selected || !target || !id) return;
    const relationType = knowledgeLinkRelationTypes.includes(
      linkRelationType as (typeof knowledgeLinkRelationTypes)[number],
    )
      ? (linkRelationType as KnowledgeRelationType)
      : "about";
    void captureKnowledge({
      action: {
        type: "relation.create",
        fromObjectId: id,
        to: { objectType: target.objectType, id: target.id },
        relationType,
      },
      canvasWorkspaceId: object?.canvasWorkspaceId ?? view?.canvasWorkspaceId ?? "",
      teamId,
    }).catch(() => undefined);
  }, [
    captureKnowledge,
    id,
    linkRelationType,
    linkTargetId,
    linkTargets,
    object,
    view,
    teamId,
    targetsQuery.data?.items,
  ]);

  return {
    title: view?.title ?? "Knowledge",
    chip: view ? knowledgeChipLabel(view.objectType) : "Object",
    body,
    propertyLines,
    backlinks,
    agencyLinks,
    error: query.error ? getErrorMessage(query.error, "Could not load this object.") : null,
    missing: Boolean(view?.missing),
    linkRelationType,
    linkTargetId,
    linkTargets,
    linkPending: capturePending,
    onLinkRelationTypeChange: setLinkRelationType,
    onLinkTargetIdChange: setLinkTargetId,
    onCreateLink,
    onOpenOnBoard,
  };
}
