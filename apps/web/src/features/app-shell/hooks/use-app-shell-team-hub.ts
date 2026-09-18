import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { agencyPlanLabel, isPaidAgencyPlan } from "@/features/billing/agency-plan-label";
import { useBilling } from "@/features/billing/billing-queries";
import { teamDetailQueryOptions, teamListQueryOptions } from "@/features/team/team-queries";
import { toTeamPresetImage } from "@/features/team/team-avatar-presets";
import { useTeamSettingsModalActions } from "@/features/team/hooks/use-team-settings-modal-actions";
import type { TeamSettingsPane } from "@/features/team/hooks/use-team-settings-modal-state";
import type { TeamSettingsRole } from "@/features/team/hooks/use-team-settings-modal-actions";
import type { CreateAgencyInviteDraft } from "@/features/team/views/team-create-agency-dialog-view";
import type { TeamInviteCardYou } from "@/features/team/views/team-invite-card-view";
import { useTeamStore } from "@/features/team/team-store";
import { authClient } from "@/lib/auth-client";
import { getServerUrl } from "@/lib/env";
import { orpcClient } from "@/lib/orpc";
import { teamCreateFormSchema } from "@/lib/schemas";
import { toast } from "sonner";

export type AppShellTeamHubSettingsLaunch = {
  pane: TeamSettingsPane;
  membersInviteAutofocus?: boolean;
};

export function useAppShellTeamHub() {
  const session = authClient.useSession();
  const authEnabled = Boolean(session.data?.user);

  const [hubOpen, setHubOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsLaunch, setSettingsLaunch] = useState<AppShellTeamHubSettingsLaunch>({
    pane: "general",
  });

  const selectedTeamId = useTeamStore((s) => s.selectedTeamId);
  const syncSelectedTeam = useTeamStore((s) => s.syncSelectedTeam);
  const setSelectedTeamId = useTeamStore((s) => s.setSelectedTeamId);
  const createTeamPending = useTeamStore((s) => s.createTeamPending);

  const [createStep, setCreateStep] = useState(0);
  const [createStepDirection, setCreateStepDirection] = useState(1);
  const createInviteInputId = useId();
  const [createPresetId, setCreatePresetId] = useState<string | null>(null);
  const [createLogoFile, setCreateLogoFile] = useState<File | null>(null);
  const [createLogoPreviewUrl, setCreateLogoPreviewUrl] = useState<string | null>(null);
  const [createInvites, setCreateInvites] = useState<CreateAgencyInviteDraft[]>([]);
  const [createInviteEmail, setCreateInviteEmail] = useState("");
  const [createInviteRole, setCreateInviteRole] = useState<TeamSettingsRole>("viewer");
  const [createCurrency, setCreateCurrency] = useState("USD");
  const [createSubmitError, setCreateSubmitError] = useState<string | null>(null);

  const teamListQuery = useQuery({
    ...teamListQueryOptions(),
    enabled: authEnabled,
  });

  const teamDetailQuery = useQuery({
    ...teamDetailQueryOptions(selectedTeamId),
    enabled: Boolean(authEnabled && selectedTeamId),
  });

  const teams = useMemo(() => teamListQuery.data?.items ?? [], [teamListQuery.data?.items]);
  const selectedTeam = teamDetailQuery.data ?? null;
  const selectedSummary = teams.find((team) => team.id === selectedTeamId) ?? teams[0] ?? null;
  const displayName = selectedTeam?.name ?? selectedSummary?.name ?? "";
  const displayImage = selectedTeam?.image ?? selectedSummary?.image ?? null;
  const displayTeamId = selectedTeam?.id ?? selectedSummary?.id ?? selectedTeamId;
  const memberCount = selectedTeam?.members.length ?? 0;
  const teamRole = selectedTeam?.role ?? selectedSummary?.role ?? null;
  const isOwner = teamRole === "owner";

  const { plan, checkout } = useBilling(displayTeamId, authEnabled && Boolean(displayTeamId));

  const cardMeta = selectedTeam
    ? `${agencyPlanLabel(plan)} · ${memberCount} member${memberCount === 1 ? "" : "s"}`
    : "Select agency";

  useEffect(() => {
    syncSelectedTeam(teams);
  }, [teams, syncSelectedTeam]);

  const createTeamForm = useForm({
    resolver: zodResolver(teamCreateFormSchema),
    defaultValues: { name: "" },
  });

  function openAgencySettings(launch: AppShellTeamHubSettingsLaunch = { pane: "general" }) {
    setSettingsLaunch(launch);
    setSettingsOpen(true);
    setHubOpen(false);
  }

  function handleSettingsOpenChange(open: boolean) {
    if (!open) {
      setSettingsLaunch({ pane: "general" });
    }
    setSettingsOpen(open);
  }

  function selectTeam(teamId: string) {
    setSelectedTeamId(teamId);
    setHubOpen(false);
  }

  async function submitCreateAgency() {
    const values = createTeamForm.getValues();
    if (!values.name.trim() || createTeamPending) return;
    setCreateSubmitError(null);
    const store = useTeamStore.getState();
    await store.createTeam(values.name.trim());
    const newTeamId = useTeamStore.getState().selectedTeamId;
    if (!newTeamId) return;

    // ponytail: sequential post-create patches, no new team.create payload.
    const failedInvites: string[] = [];
    try {
      if (createLogoFile) {
        const serverUrl = getServerUrl();
        const formData = new FormData();
        formData.append("teamId", newTeamId);
        formData.append("file", createLogoFile);
        const response = await fetch(`${serverUrl}/uploads/team-avatar`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        if (response.ok) {
          const { storageKey } = (await response.json()) as { storageKey: string };
          await store.saveTeamImage(newTeamId, storageKey);
        }
      } else if (createPresetId) {
        await store.saveTeamImage(newTeamId, toTeamPresetImage(createPresetId));
      }

      for (const invite of createInvites) {
        try {
          await orpcClient.team.members.add({
            teamId: newTeamId,
            userEmail: invite.email,
            role: invite.role,
          });
        } catch {
          failedInvites.push(invite.email);
        }
      }

      if (createCurrency && createCurrency !== "USD") {
        try {
          await orpcClient.agencyOps.moneySettings.setCurrency({
            teamId: newTeamId,
            currency: createCurrency,
          });
        } catch {
          // ponytail: currency stays editable later in Money settings.
        }
      }
    } finally {
      if (failedInvites.length > 0) {
        toast.error(
          failedInvites.length === 1
            ? `Couldn't invite ${failedInvites[0]}`
            : `Couldn't invite ${failedInvites.length} people`,
          { description: "They may not have an Orch account yet. Try again from Agency settings later." },
        );
      }
      resetCreateWizard();
      setCreateOpen(false);
      setHubOpen(false);
    }
  }

  function resetCreateWizard() {
    createTeamForm.reset();
    setCreateStep(0);
    setCreatePresetId(null);
    setCreateLogoFile(null);
    setCreateLogoPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
    setCreateInvites([]);
    setCreateInviteEmail("");
    setCreateInviteRole("viewer");
    setCreateCurrency("USD");
    setCreateSubmitError(null);
  }

  function handleCreateOpenChange(open: boolean) {
    if (!open) resetCreateWizard();
    setCreateOpen(open);
  }

  function pickCreateLogo() {
    const inputEl = document.createElement("input");
    inputEl.type = "file";
    inputEl.accept = "image/*";
    inputEl.addEventListener("change", () => {
      const file = inputEl.files?.[0];
      if (!file) return;
      setCreateLogoFile(file);
      setCreateLogoPreviewUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return URL.createObjectURL(file);
      });
    });
    inputEl.click();
  }

  function clearCreateLogo() {
    setCreateLogoFile(null);
    setCreateLogoPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
  }

  function addCreateInvite() {
    const email = createInviteEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setCreateSubmitError("Enter a valid email address");
      return;
    }
    if (createInvites.some((invite) => invite.email.toLowerCase() === email.toLowerCase())) return;
    setCreateInvites((previous) => [...previous, { email, role: createInviteRole }]);
    setCreateInviteEmail("");
    setCreateSubmitError(null);
  }

  function openCreateDialog() {
    resetCreateWizard();
    setCreateOpen(true);
    setHubOpen(false);
  }

  function handleSubscribe() {
    if (!isOwner || isPaidAgencyPlan(plan)) return;
    void checkout("agency");
    setHubOpen(false);
  }

  const sessionUser = session.data?.user ?? null;
  const createYou: TeamInviteCardYou | null = sessionUser
    ? {
        key: sessionUser.id,
        name: sessionUser.name || sessionUser.email,
        avatarUrl: (sessionUser as { image?: string | null }).image ?? null,
        userId: sessionUser.id,
      }
    : null;

  const teamSettingsViewModel = useTeamSettingsModalActions({
    open: settingsOpen,
    onOpenChange: handleSettingsOpenChange,
    team: selectedTeam,
    initialPane: settingsLaunch.pane,
    membersInviteAutofocus: settingsLaunch.membersInviteAutofocus,
    onRefetchWorkspace: async () => {
      await teamDetailQuery.refetch();
    },
  });

  return {
    authEnabled,
    listPending: teamListQuery.isPending,
    hubOpen,
    createOpen,
    settingsOpen,
    settingsLaunch,
    teams,
    selectedTeamId,
    selectedTeam,
    displayName,
    displayImage,
    displayTeamId,
    memberCount,
    teamRole,
    isOwner,
    plan,
    cardMeta,
    createTeamPending,
    createName: createTeamForm.watch("name"),
    createError: createTeamForm.formState.errors.name?.message ?? createSubmitError,
    createStep,
    createStepDirection,
    createInviteInputId,
    createPresetId,
    createLogoPreviewUrl,
    createInvites,
    createInviteEmail,
    createInviteRole,
    createCurrency,
    createYou,
    onHubOpenChange: setHubOpen,
    onCreateOpenChange: handleCreateOpenChange,
    onSettingsOpenChange: handleSettingsOpenChange,
    onCreateNameChange: (value: string) =>
      createTeamForm.setValue("name", value, { shouldValidate: true }),
    onCreateStepChange: (step: number) => {
      const clamped = Math.min(Math.max(step, 0), 2);
      setCreateStepDirection(clamped >= createStep ? 1 : -1);
      setCreateStep(clamped);
    },
    onCreatePresetChange: setCreatePresetId,
    onPickCreateLogo: pickCreateLogo,
    onClearCreateLogo: clearCreateLogo,
    onCreateInviteEmailChange: setCreateInviteEmail,
    onCreateInviteRoleChange: setCreateInviteRole,
    onAddCreateInvite: addCreateInvite,
    onRemoveCreateInvite: (email: string) =>
      setCreateInvites((previous) => previous.filter((invite) => invite.email !== email)),
    onCreateCurrencyChange: setCreateCurrency,
    onSubmitCreateAgency: () => void submitCreateAgency(),
    onOpenCreateDialog: openCreateDialog,
    onOpenAgencySettings: openAgencySettings,
    onSelectTeam: selectTeam,
    onSubscribe: handleSubscribe,
    teamSettingsViewModel,
  };
}

export type AppShellTeamHubViewModel = ReturnType<typeof useAppShellTeamHub>;
