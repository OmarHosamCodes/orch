import { useState } from "react";

type TeamRole = "owner" | "editor" | "viewer";

export type TeamSettingsPane = "general" | "members" | "billing";

export type StagedTeamInvite = {
  email: string;
  error: string | null;
};

export function useTeamSettingsModalState() {
  const [pane, setPane] = useState<TeamSettingsPane>("general");
  const [nameDraft, setNameDraft] = useState("");
  const [nameDirty, setNameDirty] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("viewer");
  const [addingMember, setAddingMember] = useState(false);
  const [stagedInvites, setStagedInvites] = useState<StagedTeamInvite[]>([]);
  const [inviteFormError, setInviteFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRemoveUserId, setConfirmRemoveUserId] = useState<string | null>(null);
  const [deletingTeam, setDeletingTeam] = useState(false);

  return {
    pane,
    setPane,
    nameDraft,
    setNameDraft,
    nameDirty,
    setNameDirty,
    savingName,
    setSavingName,
    uploadingImage,
    setUploadingImage,
    inviteEmail,
    setInviteEmail,
    inviteRole,
    setInviteRole,
    addingMember,
    setAddingMember,
    stagedInvites,
    setStagedInvites,
    inviteFormError,
    setInviteFormError,
    confirmDelete,
    setConfirmDelete,
    confirmRemoveUserId,
    setConfirmRemoveUserId,
    deletingTeam,
    setDeletingTeam,
  };
}
