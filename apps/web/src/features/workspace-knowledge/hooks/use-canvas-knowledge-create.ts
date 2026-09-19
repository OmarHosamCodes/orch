import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { CanvasKnowledgeCreateDialogViewProps } from "@/features/workspace-knowledge/canvas-knowledge-create-dialog-view";
import {
  buildObjectCreateAction,
  buildPinPlacementAction,
  type KnowledgeDecisionStatus,
  type KnowledgeDialogKind,
  type KnowledgePinKind,
} from "@/features/workspace-knowledge/knowledge-create";
import { useWorkspaceKnowledgeStore } from "@/features/workspace-knowledge/stores/workspace-knowledge";
import { orpc } from "@/lib/orpc";
import type { KnowledgeObjectType } from "@orch/workspace";

export function useCanvasKnowledgeCreate(input: {
  canvasWorkspaceId: string;
  teamId?: string | null;
  resolveBoardPoint: () => { x: number; y: number } | null;
  onCreateDocument: (point?: { x: number; y: number }) => void;
}): CanvasKnowledgeCreateDialogViewProps {
  const teamId = input.teamId ?? null;
  const canvasWorkspaceId = input.canvasWorkspaceId;
  const { resolveBoardPoint, onCreateDocument } = input;
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<"private" | "team">("private");
  const [status, setStatus] = useState<KnowledgeDecisionStatus>("open");
  const [recommendation, setRecommendation] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [pinKind, setPinKind] = useState<KnowledgePinKind>("agency.project");
  const [pinQuery, setPinQuery] = useState("");
  const [selectedPin, setSelectedPin] = useState<{ id: string; objectType: string } | null>(null);
  const [aboutId, setAboutId] = useState<string | null>(null);

  const captureKnowledge = useWorkspaceKnowledgeStore((state) => state.captureKnowledge);
  const capturePending = useWorkspaceKnowledgeStore((state) => state.capturePending);
  const captureError = useWorkspaceKnowledgeStore((state) => state.captureError);
  const requestedCreateKind = useWorkspaceKnowledgeStore((state) => state.requestedCreateKind);
  const requestCreateKind = useWorkspaceKnowledgeStore((state) => state.requestCreateKind);
  const createDialogOpen = useWorkspaceKnowledgeStore((state) => state.createDialogOpen);
  const createSurface = useWorkspaceKnowledgeStore((state) => state.createSurface);
  const setCreateDialogOpen = useWorkspaceKnowledgeStore((state) => state.setCreateDialogOpen);
  const pendingPlacement = useWorkspaceKnowledgeStore((state) => state.pendingPlacement);
  const setPendingPlacement = useWorkspaceKnowledgeStore((state) => state.setPendingPlacement);
  const uploadKnowledgeSource = useWorkspaceKnowledgeStore((state) => state.uploadKnowledgeSource);

  const surface: KnowledgeDialogKind = createSurface ?? "note";

  const boardQuery = useQuery({
    ...orpc.workspace.knowledge.board.queryOptions({
      input: { canvasWorkspaceId, teamId: teamId ?? undefined },
    }),
    enabled: Boolean(canvasWorkspaceId) && createDialogOpen && surface === "unplaced",
  });

  useEffect(() => {
    if (!createDialogOpen || pendingPlacement) return;
    const point = resolveBoardPoint();
    if (point) setPendingPlacement(point);
  }, [createDialogOpen, pendingPlacement, resolveBoardPoint, setPendingPlacement]);

  useEffect(() => {
    if (requestedCreateKind === "document") {
      onCreateDocument(pendingPlacement ?? resolveBoardPoint() ?? undefined);
      requestCreateKind(null);
      return;
    }
    if (!requestedCreateKind) return;
    requestCreateKind(null);
  }, [
    onCreateDocument,
    pendingPlacement,
    requestCreateKind,
    requestedCreateKind,
    resolveBoardPoint,
  ]);

  useEffect(() => {
    if (!createDialogOpen) return;
    setTitle("");
    setRecommendation("");
    setSourceUrl("");
    setSourceFile(null);
    setSelectedPin(null);
    setPinQuery("");
    setAboutId(null);
  }, [createDialogOpen]);

  const pinQueryResult = useQuery({
    ...orpc.workspace.knowledge.query.queryOptions({
      input: {
        teamId: teamId ?? undefined,
        objectType: pinKind,
        query: pinQuery.trim() || undefined,
        includeAgency: true,
        limit: 8,
      },
    }),
    enabled: createDialogOpen && surface === "pin" && Boolean(teamId),
  });

  const aboutQuery = useQuery({
    ...orpc.workspace.knowledge.query.queryOptions({
      input: {
        teamId: teamId ?? undefined,
        objectType: "agency.project",
        includeAgency: true,
        limit: 20,
      },
    }),
    enabled: createDialogOpen && Boolean(teamId) && (surface === "note" || surface === "decision"),
  });

  const pinOptions = useMemo(
    () =>
      (pinQueryResult.data?.items ?? []).map((item) => ({
        id: item.id,
        label: item.title,
        objectType: item.objectType,
      })),
    [pinQueryResult.data?.items],
  );

  const aboutOptions = useMemo(
    () =>
      (aboutQuery.data?.items ?? []).map((item) => ({
        id: item.id,
        label: item.title,
        objectType: item.objectType,
      })),
    [aboutQuery.data?.items],
  );

  const unplaced = useMemo(
    () =>
      (boardQuery.data?.unplaced ?? []).map((card) => ({
        id: card.id,
        chip: card.chip,
        title: card.title,
      })),
    [boardQuery.data?.unplaced],
  );

  const resolvePoint = useCallback(() => {
    return pendingPlacement ?? resolveBoardPoint();
  }, [pendingPlacement, resolveBoardPoint]);

  const closeDialog = useCallback(() => {
    setCreateDialogOpen(false);
  }, [setCreateDialogOpen]);

  const onSubmit = useCallback(() => {
    const point = resolvePoint();
    if (surface === "unplaced" || surface === "pin") {
      if (surface === "pin") {
        if (!teamId || !selectedPin || !point) return;
        void captureKnowledge({
          action: buildPinPlacementAction({
            objectId: selectedPin.id,
            objectType: selectedPin.objectType as KnowledgePinKind,
            teamId,
            x: point.x,
            y: point.y,
          }),
          canvasWorkspaceId,
          teamId,
        })
          .then(() => {
            setSelectedPin(null);
            closeDialog();
          })
          .catch(() => undefined);
      }
      return;
    }
    const objectKind = surface;
    const about = aboutId ? aboutOptions.find((option) => option.id === aboutId) : null;
    void (async () => {
      let uploadId: string | undefined;
      let filename: string | undefined;
      let mediaType: string | undefined;
      let sourceKind: "url" | "upload" | undefined;
      if (objectKind === "source") {
        if (sourceFile && teamId) {
          const uploaded = await uploadKnowledgeSource({ teamId, file: sourceFile });
          uploadId = uploaded.uploadId;
          filename = uploaded.filename;
          mediaType = uploaded.mediaType;
          sourceKind = "upload";
        } else {
          sourceKind = "url";
        }
      }
      const result = await captureKnowledge({
        action: buildObjectCreateAction({
          kind: objectKind,
          title,
          visibility: teamId ? visibility : "private",
          teamId,
          status,
          recommendation,
          sourceKind,
          url: sourceUrl,
          uploadId,
          filename,
          mediaType,
          about: about
            ? { objectType: about.objectType as KnowledgeObjectType, id: about.id }
            : undefined,
          placement: point ?? undefined,
        }),
        canvasWorkspaceId,
        teamId,
      });
      if (result.status === "applied" || result.status === "pending") {
        closeDialog();
      }
    })().catch(() => undefined);
  }, [
    aboutId,
    aboutOptions,
    captureKnowledge,
    canvasWorkspaceId,
    closeDialog,
    recommendation,
    resolvePoint,
    selectedPin,
    sourceFile,
    sourceUrl,
    status,
    surface,
    teamId,
    title,
    uploadKnowledgeSource,
    visibility,
  ]);

  const onSelectPin = useCallback((option: { id: string; objectType: string }) => {
    setSelectedPin(option);
  }, []);

  const onPlaceUnplaced = useCallback(
    (id: string) => {
      const point = resolvePoint();
      const card = boardQuery.data?.unplaced.find((item) => item.id === id);
      if (!point || !card) return;
      void captureKnowledge({
        action: {
          type: "placement.upsert",
          objectId: id,
          objectType: card.objectType,
          teamId: teamId ?? null,
          x: point.x,
          y: point.y,
          width: card.width,
          height: card.height,
        },
        teamId,
        canvasWorkspaceId,
        silent: true,
      }).catch(() => undefined);
    },
    [boardQuery.data?.unplaced, captureKnowledge, canvasWorkspaceId, resolvePoint, teamId],
  );

  const onRemoveUnplaced = useCallback(
    (id: string) => {
      const card = boardQuery.data?.unplaced.find((item) => item.id === id);
      if (!card) return;
      void captureKnowledge({
        action: { type: "object.delete", objectId: id, objectType: card.objectType },
        canvasWorkspaceId,
        teamId,
      }).catch(() => undefined);
    },
    [boardQuery.data?.unplaced, captureKnowledge, canvasWorkspaceId, teamId],
  );

  return {
    open: createDialogOpen,
    surface,
    title,
    visibility: teamId ? visibility : "private",
    teamSelected: Boolean(teamId),
    status,
    recommendation,
    sourceUrl,
    pinKind,
    pinQuery,
    pinOptions,
    selectedPinId: selectedPin?.id ?? null,
    aboutOptions,
    aboutId,
    unplaced,
    pending: capturePending,
    error: captureError,
    pendingLabel: capturePending
      ? visibility === "team"
        ? "Waiting for Approve in Orch"
        : "Saving"
      : null,
    canUploadSource: Boolean(teamId),
    onOpenChange: setCreateDialogOpen,
    onTitleChange: setTitle,
    onVisibilityChange: setVisibility,
    onStatusChange: setStatus,
    onRecommendationChange: setRecommendation,
    onSourceUrlChange: setSourceUrl,
    onSourceFileChange: setSourceFile,
    onPinKindChange: setPinKind,
    onPinQueryChange: setPinQuery,
    onSelectPin,
    onAboutIdChange: setAboutId,
    onPlaceUnplaced,
    onRemoveUnplaced,
    onSubmit,
  };
}
