import { useEffect, useId, useMemo, useState, type FormEvent } from "react";

import { PROJECT_PALETTE } from "@/features/shared/project-palette";
import { useAgencyOpsStore } from "@/features/shared/stores/agency-ops";

type AgencyTaskChooserProjectCreateClientOption = {
  id: string;
  name: string;
};

type AgencyTaskChooserProjectCreateTemplateOption = {
  id: string;
  name: string;
  milestoneCount: number;
};

export type UseAgencyTaskChooserProjectCreateDialogOptions = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  clients: AgencyTaskChooserProjectCreateClientOption[];
  templates: AgencyTaskChooserProjectCreateTemplateOption[];
  onCreated?: (projectId: string) => void;
};

export type AgencyTaskChooserProjectCreateDialogViewModel = {
  formId: string;
  projectName: string;
  setProjectName: (value: string) => void;
  clientId: string;
  setClientId: (value: string) => void;
  colorHueId: number;
  setColorHueId: (value: number) => void;
  templateId: string;
  setTemplateId: (value: string) => void;
  palette: typeof PROJECT_PALETTE;
  clients: AgencyTaskChooserProjectCreateClientOption[];
  templates: AgencyTaskChooserProjectCreateTemplateOption[];
  canSubmit: boolean;
  isPending: boolean;
  handleSubmit: (event: FormEvent) => Promise<void>;
};

export function useAgencyTaskChooserProjectCreateDialog({
  open,
  onOpenChange,
  teamId,
  clients,
  templates,
  onCreated,
}: UseAgencyTaskChooserProjectCreateDialogOptions): AgencyTaskChooserProjectCreateDialogViewModel {
  const formId = useId();
  const [projectName, setProjectName] = useState("");
  const [clientId, setClientId] = useState("");
  const [colorHueId, setColorHueId] = useState(1);
  const [templateId, setTemplateId] = useState("");
  const createProject = useAgencyOpsStore((state) => state.createProject);
  const isPending = useAgencyOpsStore((state) => state.projectMutationCount > 0);

  useEffect(() => {
    if (!open) {
      setProjectName("");
      setTemplateId("");
      setColorHueId(1);
      return;
    }
    setClientId((current) => current || clients[0]?.id || "");
  }, [open, clients]);

  const canSubmit = useMemo(
    () => Boolean(teamId && clientId && projectName.trim() && !isPending),
    [teamId, clientId, projectName, isPending],
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    const client = clients.find((entry) => entry.id === clientId);
    if (!client) return;

    const projectId = await createProject({
      teamId,
      clientId,
      clientName: client.name,
      name: projectName.trim(),
      colorHueId,
      templateId: templateId || undefined,
    });

    if (projectId) {
      onCreated?.(projectId);
      onOpenChange(false);
    }
  }

  return {
    formId,
    projectName,
    setProjectName,
    clientId,
    setClientId,
    colorHueId,
    setColorHueId,
    templateId,
    setTemplateId,
    palette: PROJECT_PALETTE,
    clients,
    templates,
    canSubmit,
    isPending,
    handleSubmit,
  };
}
