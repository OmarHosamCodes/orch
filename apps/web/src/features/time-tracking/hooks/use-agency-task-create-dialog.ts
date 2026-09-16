import type { AgencyEntityIconKey } from "@orch/api/routers/agency-ops/shared/entity-icon-catalog";
import { useEffect, useId, useState, type FormEvent } from "react";

import { useAgencyEntityIconDraft } from "@/features/shared/use-agency-entity-icon-draft";
import { useAgencyOpsStore } from "@/features/shared/stores/agency-ops";

export type UseAgencyTaskCreateDialogOptions = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  projectId: string;
  onCreated?: (taskId: string) => void;
};

export type AgencyTaskCreateDialogViewModel = {
  formId: string;
  title: string;
  setTitle: (value: string) => void;
  iconKey: AgencyEntityIconKey | null;
  setIconKey: (value: AgencyEntityIconKey | null) => void;
  canSubmit: boolean;
  isPending: boolean;
  handleSubmit: (event: FormEvent) => Promise<void>;
};

export function useAgencyTaskCreateDialog({
  open,
  onOpenChange,
  teamId,
  projectId,
  onCreated,
}: UseAgencyTaskCreateDialogOptions): AgencyTaskCreateDialogViewModel {
  const formId = useId();
  const [title, setTitle] = useState("");
  const { displayIconKey, setIconKey, submitIconKey } = useAgencyEntityIconDraft(title, open);
  const createProjectTask = useAgencyOpsStore((state) => state.createProjectTask);
  const isPending = useAgencyOpsStore((state) => state.isCreatingTask);

  useEffect(() => {
    if (!open) setTitle("");
  }, [open]);

  const canSubmit = Boolean(teamId && projectId && title.trim() && !isPending);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    const taskId = await createProjectTask({
      teamId,
      projectId,
      title: title.trim(),
      iconKey: submitIconKey,
      successToast: false,
    });

    if (taskId) {
      onCreated?.(taskId);
      onOpenChange(false);
    }
  }

  return {
    formId,
    title,
    setTitle,
    iconKey: displayIconKey,
    setIconKey,
    canSubmit,
    isPending,
    handleSubmit,
  };
}
