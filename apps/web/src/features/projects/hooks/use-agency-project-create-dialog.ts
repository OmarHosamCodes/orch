import type { AgencyEntityIconKey } from "@orch/api/routers/agency-ops/shared/entity-icon-catalog";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useState, type FormEvent } from "react";
import { orpc } from "@/lib/orpc";
import { withAgencySyncQueryOptions } from "@/features/shared/agency-query-options";
import { useAgencyEntityIconDraft } from "@/features/shared/use-agency-entity-icon-draft";
import {
  selectIsProjectMutationPending,
  useAgencyOpsStore,
} from "@/features/shared/stores/agency-ops";
import {
  toAgencyMemberOption,
  type AgencyMemberOption,
} from "@/features/shared/agency-member-option";

export type ProjectCreateMode = "normal" | "journey";

export type AgencyClientOption = {
  id: string;
  name: string;
};

type MilestoneDraft = {
  key: string;
  title: string;
  assignedToTeam: boolean;
  assigneeUserIds: string[];
};

export type AgencyProjectCreateDialogViewModel = {
  formId: string;
  mode: ProjectCreateMode;
  setMode: (mode: ProjectCreateMode) => void;
  clientId: string;
  setClientId: (id: string) => void;
  projectName: string;
  setProjectName: (name: string) => void;
  iconKey: AgencyEntityIconKey | null;
  setIconKey: (value: AgencyEntityIconKey | null) => void;
  milestones: MilestoneDraft[];
  setMilestones: React.Dispatch<React.SetStateAction<MilestoneDraft[]>>;
  formError: string | null;
  setFormError: (err: string | null) => void;
  isJourneyMode: boolean;
  members: AgencyMemberOption[];
  isMembersLoading: boolean;
  resolvedClientId: string;
  selectedClient: AgencyClientOption | null;
  clientLocked: boolean;
  updateMilestone: (key: string, patch: Partial<MilestoneDraft>) => void;
  addMilestone: () => void;
  removeMilestone: (key: string) => void;
  handleSubmit: (event: FormEvent) => Promise<void>;
  canSubmit: boolean;
  isProjectMutationPending: boolean;
};

function createMilestoneDraft(): MilestoneDraft {
  return {
    key: crypto.randomUUID(),
    title: "",
    assignedToTeam: false,
    assigneeUserIds: [],
  };
}

type UseAgencyProjectCreateDialogOptions = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  clients: AgencyClientOption[];
  lockClientId?: string;
  defaultClientId?: string;
  onCreated?: (projectId: string) => void;
};

export function useAgencyProjectCreateDialog({
  open,
  onOpenChange,
  teamId,
  clients,
  lockClientId,
  defaultClientId,
  onCreated,
}: UseAgencyProjectCreateDialogOptions): AgencyProjectCreateDialogViewModel {
  const agencyOps = useAgencyOpsStore();
  const isProjectMutationPending = useAgencyOpsStore(selectIsProjectMutationPending);
  const formId = useId();

  const [mode, setMode] = useState<ProjectCreateMode>("journey");
  const [clientId, setClientId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [milestones, setMilestones] = useState<MilestoneDraft[]>(() => [createMilestoneDraft()]);
  const [formError, setFormError] = useState<string | null>(null);
  const { displayIconKey, setIconKey, submitIconKey } = useAgencyEntityIconDraft(projectName, open);

  const isJourneyMode = mode === "journey";

  const membersQuery = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.team.members.list.queryOptions({ input: { teamId } }),
        enabled: Boolean(teamId) && open && isJourneyMode,
      },
      "cold",
      { liveGated: true, teamId },
    ),
  );

  const members: AgencyMemberOption[] = (membersQuery.data?.items ?? []).map(toAgencyMemberOption);

  const resolvedClientId = lockClientId ?? clientId;
  const selectedClient = clients.find((client) => client.id === resolvedClientId) ?? null;
  const clientLocked = Boolean(lockClientId);

  useEffect(() => {
    if (!open) return;

    const initialClientId = lockClientId ?? defaultClientId ?? clients[0]?.id ?? "";
    setMode("journey");
    setClientId(initialClientId);
    setProjectName("");
    setMilestones([createMilestoneDraft()]);
    setFormError(null);
  }, [open, lockClientId, defaultClientId, clients]);

  function updateMilestone(key: string, patch: Partial<MilestoneDraft>) {
    setMilestones((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
    setFormError(null);
  }

  function addMilestone() {
    setMilestones((current) => [...current, createMilestoneDraft()]);
    setFormError(null);
  }

  function removeMilestone(key: string) {
    setMilestones((current) => {
      if (current.length <= 1) return current;
      return current.filter((row) => row.key !== key);
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const name = projectName.trim();
    if (!teamId || !resolvedClientId || !name || !selectedClient) return;

    if (isJourneyMode) {
      const validMilestones = milestones
        .map((row) => ({
          title: row.title.trim(),
          assigneeUserIds: row.assignedToTeam ? [] : [...new Set(row.assigneeUserIds)],
        }))
        .filter((row) => row.title.length > 0);

      if (validMilestones.length === 0) {
        setFormError("Add at least one milestone.");
        return;
      }

      const projectId = await agencyOps.createProjectWithJourney({
        teamId,
        clientId: resolvedClientId,
        clientName: selectedClient.name,
        name,
        iconKey: submitIconKey,
        milestones: validMilestones,
      });

      if (projectId) {
        onOpenChange(false);
        onCreated?.(projectId);
      }
      return;
    }

    const projectId = await agencyOps.createProject({
      teamId,
      clientId: resolvedClientId,
      clientName: selectedClient.name,
      name,
      iconKey: submitIconKey,
    });

    if (projectId) {
      onOpenChange(false);
      onCreated?.(projectId);
    }
  }

  const canSubmit =
    Boolean(projectName.trim()) &&
    Boolean(resolvedClientId) &&
    (!isJourneyMode || milestones.length > 0) &&
    !isProjectMutationPending;

  return {
    formId,
    mode,
    setMode,
    clientId,
    setClientId,
    projectName,
    setProjectName,
    iconKey: displayIconKey,
    setIconKey,
    milestones,
    setMilestones,
    formError,
    setFormError,
    isJourneyMode,
    members,
    isMembersLoading: membersQuery.isPending,
    resolvedClientId,
    selectedClient,
    clientLocked,
    updateMilestone,
    addMilestone,
    removeMilestone,
    handleSubmit,
    canSubmit,
    isProjectMutationPending,
  };
}
