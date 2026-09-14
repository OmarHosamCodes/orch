import { useEffect, useMemo } from "react";
import { toast } from "sonner";

import { getServerUrl } from "@/lib/env";
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

type TeamSettingsTeam = {
  id: string;
  name: string;
  image: string | null;
  role: TeamSettingsRole;
  createdByUserId: string;
  updatedAt: string;
  members: TeamSettingsMember[];
};

export type TeamSettingsModalInput = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: TeamSettingsTeam | null;
  onRefetchWorkspace: () => Promise<unknown>;
};

const TEAM_ROLE_RANK: Record<TeamSettingsRole, number> = {
  owner: 0,
  editor: 1,
  viewer: 2,
};

export function useTeamSettingsModalActions(input: TeamSettingsModalInput) {
  const actions = useTeamSettingsModal(input.team?.role ?? null);
  const state = useTeamSettingsModalState();
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
    if (input.open && input.team) {
      state.setNameDraft(input.team.name);
      state.setNameDirty(false);
    }
    // Sync draft when the modal opens for a team; ignore setter identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open/team sync
  }, [input.open, input.team?.id, input.team?.name]);

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
    if (!input.team || !state.inviteEmail.trim()) return;
    actions.setMemberEmail(state.inviteEmail.trim());
    actions.setMemberRole(state.inviteRole);
    state.setAddingMember(true);
    try {
      await actions.addTeamMember(input.team.id);
      state.setInviteEmail("");
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

  return {
    open: input.open,
    team: input.team,
    teamRole: input.team?.role ?? null,
    displayMemberCount: input.team?.members.length ?? 0,
    sortedMembers,
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
    confirmDelete: state.confirmDelete,
    confirmRemoveUserId: state.confirmRemoveUserId,
    deletingTeam: state.deletingTeam,
    actionButtonDisabled: state.addingMember || !state.inviteEmail.trim(),
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
    onAddMember: () => void addMember(),
    onUpdateMemberRole: (userId: string, role: TeamSettingsRole) =>
      void updateMemberRole(userId, role),
    onRequestRemoveMember: state.setConfirmRemoveUserId,
    onRemoveMember: (userId: string) => void removeMember(userId),
    onCancelRemoveMember: () => state.setConfirmRemoveUserId(null),
    onRequestDeleteTeam: () => state.setConfirmDelete(true),
    onCancelDeleteTeam: () => state.setConfirmDelete(false),
    onDeleteTeam: () => void deleteTeam(),
  };
}

export type TeamSettingsModalViewModel = ReturnType<typeof useTeamSettingsModalActions>;
