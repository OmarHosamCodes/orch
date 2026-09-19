import type { AgencyEntityIconKey } from "@orch/api/routers/agency-ops/shared/entity-icon-catalog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useId, useState, type FormEvent } from "react";

import { useAgencyEntityIconDraft } from "@/features/shared/use-agency-entity-icon-draft";
import { orpc } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";

export function canvasBrainsListQueryOptions() {
  return orpc.workspace.brains.list.queryOptions({ input: {} });
}

export type CanvasBrainListItem = {
  id: string;
  title: string;
  instructions: string;
  iconKey: AgencyEntityIconKey | null;
  colorHueId: number | null;
  updatedAt: string;
};

function mapBrainListItem(item: {
  id: string;
  title: string;
  instructions: string;
  iconKey: AgencyEntityIconKey | null;
  colorHueId: number | null;
  updatedAt: string;
}): CanvasBrainListItem {
  return {
    id: item.id,
    title: item.title,
    instructions: item.instructions,
    iconKey: item.iconKey,
    colorHueId: item.colorHueId,
    updatedAt: item.updatedAt,
  };
}

export function useCanvasBrainCreate(onCreated: (brain: CanvasBrainListItem) => void) {
  const queryClient = useQueryClient();
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [colorHueId, setColorHueId] = useState<number | null>(null);
  const [colorTouched, setColorTouched] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const createBrain = useMutation(orpc.workspace.brains.create.mutationOptions());
  const { displayIconKey, setIconKey, submitIconKey } = useAgencyEntityIconDraft(title, open);

  const reset = useCallback(() => {
    setTitle("");
    setInstructions("");
    setColorHueId(null);
    setColorTouched(false);
    setErrorMessage(null);
  }, []);

  const onOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) reset();
    },
    [reset],
  );

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      const nextTitle = title.trim();
      if (!nextTitle || createBrain.isPending) return;
      setErrorMessage(null);
      try {
        const created = await createBrain.mutateAsync({
          title: nextTitle,
          instructions: instructions.trim() || undefined,
          iconKey: submitIconKey ?? null,
          ...(colorTouched ? { colorHueId } : {}),
        });
        await queryClient.invalidateQueries({ queryKey: orpc.workspace.brains.list.key() });
        reset();
        setOpen(false);
        onCreated(mapBrainListItem(created));
      } catch (error) {
        setErrorMessage(getErrorMessage(error, "Could not create this brain."));
      }
    },
    [
      colorHueId,
      colorTouched,
      createBrain,
      instructions,
      onCreated,
      queryClient,
      reset,
      submitIconKey,
      title,
    ],
  );

  return {
    formId,
    open,
    title,
    instructions,
    iconKey: displayIconKey,
    colorHueId,
    errorMessage,
    isPending: createBrain.isPending,
    canSubmit: title.trim().length > 0 && !createBrain.isPending,
    setTitle,
    setInstructions,
    setIconKey,
    setColorHueId: (next: number) => {
      setColorTouched(true);
      setColorHueId(next);
    },
    onOpenChange,
    openCreate: () => setOpen(true),
    handleSubmit,
  };
}

export function useCanvasBrainsList() {
  const query = useQuery({
    ...canvasBrainsListQueryOptions(),
  });
  return {
    items: (query.data?.items ?? []).map(mapBrainListItem),
    isPending: query.isPending,
    errorMessage: query.error ? getErrorMessage(query.error, "Could not load brains.") : null,
  };
}

export function useCanvasBrainAppearanceUpdate() {
  const queryClient = useQueryClient();
  const updateBrain = useMutation(orpc.workspace.brains.update.mutationOptions());

  const updateAppearance = useCallback(
    async (
      canvasWorkspaceId: string,
      patch: { iconKey?: AgencyEntityIconKey | null; colorHueId?: number | null },
    ) => {
      await updateBrain.mutateAsync({
        canvasWorkspaceId,
        ...patch,
      });
      await queryClient.invalidateQueries({ queryKey: orpc.workspace.brains.list.key() });
    },
    [queryClient, updateBrain],
  );

  return {
    updateAppearance,
    isPending: updateBrain.isPending,
  };
}
