import { useEffect, useId, useMemo, useRef } from "react";
import { toast } from "sonner";

import { isPaidAgencyPlan } from "@/features/billing/agency-plan-label";
import { useBilling } from "@/features/billing/billing-queries";
import { getServerUrl } from "@/lib/env";
import { getQueryClient } from "@/lib/query-client";
import { orpcClient } from "@/lib/orpc";
import { teamDetailQueryKey, teamListQueryKey } from "@/features/team/team-queries";
import { getErrorMessage } from "@/lib/utils/get-error-message";

import { useTeamSettingsModal } from "./use-team-settings-modal";
import { useTeamSettingsModalState, type TeamSettingsPane } from "./use-team-settings-modal-state";

export type TeamSettingsRole = "owner" | "editor" | "viewer";

type TeamSettingsMember = {
  teamId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string | null;
  role: TeamSettingsRole;
  joinedAt: string;
  updatedAt: string;
};

type TeamSettingsPendingInvite = {
  id: string;
  invitedUserId: string;
  invitedEmail: string;
  invitedName: string;
  invitedAvatar: string | null;
  role: TeamSettingsRole;
  createdAt: string;
};

type TeamSettingsTeam = {
  id: string;
  name: string;
  image: string | null;
  role: TeamSettingsRole;
  createdByUserId: string;
  updatedAt: string;
  members: TeamSettingsMember[];
  pendingInvites?: TeamSettingsPendingInvite[];
};

export type TeamSettingsModalInput = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: TeamSettingsTeam | null;
  onRefetchWorkspace: () => Promise<unknown>;
  initialPane?: TeamSettingsPane;
  membersInviteAutofocus?: boolean;
};

const TEAM_ROLE_RANK: Record<TeamSettingsRole, number> = {
  owner: 0,
  editor: 1,
  viewer: 2,
};

function getOrpcErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const direct = (error as { data?: { code?: string } }).data?.code;
  if (direct) return direct;
  return (error as { error?: { data?: { code?: string } } }).error?.data?.code;
}

export function useTeamSettingsModalActions(input: TeamSettingsModalInput) {
  const actions = useTeamSettingsModal(input.team?.role ?? null);
  const state = useTeamSettingsModalState();
  const inviteEmailRef = useRef<HTMLInputElement>(null);
  const inviteInputId = useId();
  const teamId = input.team?.id ?? null;
  const { plan, checkout, openPortal } = useBilling(teamId, input.open && Boolean(teamId));
  const sortedMembers = useMemo(
    () =>
      input.team
        ? [...input.team.members].sort(
            (a, b) =>
              TEAM_ROLE_RANK[a.role] - TEAM_ROLE_RANK[b.role] ||
              a.userName.localeCompare(b.userName),
          )
        : [],
    [input.team],
  );

  useEffect(() => {
    if (!input.open || !input.team) return;
    state.setNameDraft(input.team.name);
    state.setNameDirty(false);
    state.setPane(input.initialPane ?? "general");
    // Sync draft when the modal opens for a team; ignore setter identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open/team sync
  }, [input.open, input.team?.id, input.team?.name, input.initialPane]);

  function handleBillingAction() {
    void (isPaidAgencyPlan(plan) ? openPortal() : checkout("agency"));
  }

  useEffect(() => {
    if (!input.open || state.pane !== "members" || !input.membersInviteAutofocus) return;
    if (!actions.permissions.canInvite) return;
    const timer = window.setTimeout(() => inviteEmailRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- focus when members invite opens
  }, [input.open, state.pane, input.membersInviteAutofocus, actions.permissions.canInvite]);

  async function saveName() {
    if (!input.team || !state.nameDraft.trim() || !state.nameDirty) return;
    state.setSavingName(true);
    try {
      await actions.saveTeamName(input.team.id, state.nameDraft.trim());
      state.setNameDirty(false);
    } finally {
      state.setSavingName(false);
    }
  }

  async function uploadImage(file: File) {
    if (!input.team || !actions.permissions.canManageSelectedTeam) return;

    const serverUrl = getServerUrl();
    state.setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("teamId", input.team.id);
      formData.append("file", file);
      const response = await fetch(`${serverUrl}/uploads/team-avatar`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const err = (await response.json().catch(() => ({ error: "Upload failed" }))) as {
          error?: string;
        };
        toast.error("Couldn't update profile image", {
          description: err.error ?? "Try again.",
        });
        return;
      }

      const { storageKey } = (await response.json()) as { storageKey: string };
      await actions.saveTeamImage(input.team.id, storageKey);
    } catch (error) {
      toast.error("Couldn't update profile image", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      state.setUploadingImage(false);
    }
  }

  function pickImage() {
    if (!input.team || !actions.permissions.canManageSelectedTeam) return;
    const inputEl = document.createElement("input");
    inputEl.type = "file";
    inputEl.accept = "image/*";
    inputEl.addEventListener("change", () => {
      const file = inputEl.files?.[0];
      if (file) void uploadImage(file);
    });
    inputEl.click();
  }

  async function addMember() {
    const email = state.inviteEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      state.setInviteFormError("Enter a valid email address");
      return;
    }
    if (state.stagedInvites.some((staged) => staged.email.toLowerCase() === email.toLowerCase())) {
      return;
    }
    if (sortedMembers.some((member) => member.userEmail.toLowerCase() === email.toLowerCase())) {
      state.setInviteFormError("They're already in this agency");
      return;
    }
    state.setStagedInvites((previous) => [...previous, { email, error: null }]);
    state.setInviteEmail("");
    state.setInviteFormError(null);
  }

  function removeStagedInvite(email: string) {
    state.setStagedInvites((previous) =>
      previous.filter((staged) => staged.email.toLowerCase() !== email.toLowerCase()),
    );
  }

  function inviteErrorForCode(code: string | undefined): string {
    if (code === "NOT_FOUND") return "No Orch account for this email yet";
    if (code === "seat_required") return "Needs a seat — add one to invite them";
    if (code === "CONFLICT") return "They're already on this agency";
    return "Couldn't invite this email. Try sending again.";
  }

  async function sendInvites() {
    if (!input.team || state.stagedInvites.length === 0 || state.addingMember) return;
    state.setAddingMember(true);
    try {
      const failed = new Map<string, string | undefined>();
      let sent = 0;
      for (const staged of state.stagedInvites) {
        try {
          await orpcClient.team.members.add({
            teamId: input.team.id,
            userEmail: staged.email,
            role: state.inviteRole,
          });
          sent += 1;
        } catch (error) {
          failed.set(staged.email.toLowerCase(), getOrpcErrorCode(error));
        }
      }
      state.setStagedInvites((previous) =>
        previous
          .filter((staged) => failed.has(staged.email.toLowerCase()))
          .map((staged) => ({
            ...staged,
            error: inviteErrorForCode(failed.get(staged.email.toLowerCase())),
          })),
      );
      if (sent > 0) {
        toast.success(sent === 1 ? "Invite sent" : `${sent} invites sent`);
        const queryClient = getQueryClient();
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: teamDetailQueryKey(input.team.id) }),
          queryClient.invalidateQueries({ queryKey: teamListQueryKey() }),
        ]);
      }
    } finally {
      state.setAddingMember(false);
    }
  }

  async function removeMember(userId: string) {
    if (!input.team) return;
    state.setConfirmRemoveUserId(null);
    await actions.removeMember(input.team.id, userId, input.onRefetchWorkspace);
  }

  async function updateMemberRole(userId: string, role: TeamSettingsRole) {
    if (!input.team) return;
    await actions.updateMemberRole(input.team.id, userId, role);
  }

  async function deleteTeam() {
    if (!input.team) return;
    state.setDeletingTeam(true);
    try {
      await actions.deleteSelectedTeam(input.team.id, input.onRefetchWorkspace);
      handleOpenChange(false);
    } finally {
      state.setDeletingTeam(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      state.setPane("general");
      state.setNameDraft("");
      state.setNameDirty(false);
      state.setInviteEmail("");
      state.setInviteRole("viewer");
      state.setStagedInvites([]);
      state.setInviteFormError(null);
      state.setConfirmDelete(false);
      state.setConfirmRemoveUserId(null);
    }
    input.onOpenChange(nextOpen);
  }

  function handleNameDraftChange(value: string) {
    state.setNameDraft(value);
    state.setNameDirty(value !== input.team?.name);
  }

  function handlePaneChange(pane: TeamSettingsPane) {
    state.setConfirmDelete(false);
    state.setConfirmRemoveUserId(null);
    state.setPane(pane);
  }

  const inviteYouMember = sortedMembers.find((member) => member.userId === actions.currentUserId);

  return {
    open: input.open,
    team: input.team,
    teamRole: input.team?.role ?? null,
    displayMemberCount: input.team?.members.length ?? 0,
    sortedMembers,
    pendingInvites: input.team?.pendingInvites ?? [],
    currentUserId: actions.currentUserId,
    permissions: actions.permissions,
    pane: state.pane,
    nameDraft: state.nameDraft,
    nameDirty: state.nameDirty,
    savingName: state.savingName,
    uploadingImage: state.uploadingImage,
    inviteEmail: state.inviteEmail,
    inviteRole: state.inviteRole,
    addingMember: state.addingMember,
    stagedInvites: state.stagedInvites,
    inviteFormError: state.inviteFormError,
    inviteYou: inviteYouMember
      ? {
          key: inviteYouMember.userId,
          name: inviteYouMember.userName || inviteYouMember.userEmail,
          avatarUrl: inviteYouMember.userAvatar,
          userId: inviteYouMember.userId,
        }
      : null,
    confirmDelete: state.confirmDelete,
    confirmRemoveUserId: state.confirmRemoveUserId,
    deletingTeam: state.deletingTeam,
    removeTargetName:
      sortedMembers.find((member) => member.userId === state.confirmRemoveUserId)?.userName ||
      "member",
    onOpenChange: handleOpenChange,
    onPaneChange: handlePaneChange,
    onNameDraftChange: handleNameDraftChange,
    onSaveName: () => void saveName(),
    onPickImage: pickImage,
    onInviteEmailChange: state.setInviteEmail,
    onInviteRoleChange: state.setInviteRole,
    onStageInvite: () => addMember(),
    onRemoveStagedInvite: removeStagedInvite,
    onSendInvites: () => void sendInvites(),
    onUpdateMemberRole: (userId: string, role: TeamSettingsRole) =>
      void updateMemberRole(userId, role),
    onRequestRemoveMember: state.setConfirmRemoveUserId,
    onRemoveMember: (userId: string) => void removeMember(userId),
    onCancelRemoveMember: () => state.setConfirmRemoveUserId(null),
    onRequestDeleteTeam: () => state.setConfirmDelete(true),
    onCancelDeleteTeam: () => state.setConfirmDelete(false),
    onDeleteTeam: () => void deleteTeam(),
    plan,
    membersInviteAutofocus: input.membersInviteAutofocus ?? false,
    inviteEmailRef,
    inviteInputId,
    onBillingAction: handleBillingAction,
  };
}

export type TeamSettingsModalViewModel = ReturnType<typeof useTeamSettingsModalActions>;
