import { Box, CreditCard, Users } from "lucide-react";

import { AgencySettingsDialogShell } from "@/features/shared/agency-settings-dialog-shell";
import type { TeamSettingsModalViewModel } from "@/features/team/hooks/use-team-settings-modal-actions";
import type { TeamSettingsPane } from "@/features/team/hooks/use-team-settings-modal-state";
import { getTeamAvatarPublicUrl } from "@/features/team/team-avatar-url";
import { getTeamPreset, getTeamPresetId } from "@/features/team/team-avatar-presets";
import { TeamSettingsBillingPaneView } from "@/features/team/views/team-settings-billing-pane-view";
import { TeamSettingsGeneralPaneView } from "@/features/team/views/team-settings-general-pane-view";
import { TeamSettingsMembersPaneView } from "@/features/team/views/team-settings-members-pane-view";
import { getServerUrl } from "@/lib/env";

type TeamSettingsModalViewProps = {
  viewModel: TeamSettingsModalViewModel;
};

type NavItem = {
  id: TeamSettingsPane;
  label: string;
  icon: typeof Box;
  visible: boolean;
};

const PANE_COPY: Record<TeamSettingsPane, { title: string; description: string }> = {
  general: {
    title: "General",
    description: "Name and mark for this agency across Orch.",
  },
  members: {
    title: "Members",
    description: "Invite teammates and manage roles.",
  },
  billing: {
    title: "Billing",
    description: "Plan, seats, and invoices for this agency.",
  },
};

export function TeamSettingsModalView({ viewModel }: TeamSettingsModalViewProps) {
  const {
    open,
    team,
    sortedMembers,
    pendingInvites,
    currentUserId,
    permissions: perms,
    pane,
    nameDraft,
    nameDirty,
    savingName,
    uploadingImage,
    inviteEmail,
    inviteRole,
    addingMember,
    stagedInvites,
    inviteFormError,
    inviteYou,
    confirmDelete,
    confirmRemoveUserId,
    deletingTeam,
    removeTargetName,
    plan,
    billingLoading,
    billingSeats,
    inviteEmailRef,
    inviteInputId,
    onOpenChange,
    onPaneChange,
    onNameDraftChange,
    onSaveName,
    onPickImage,
    onInviteEmailChange,
    onInviteRoleChange,
    onStageInvite,
    onRemoveStagedInvite,
    onSendInvites,
    onUpdateMemberRole,
    onRequestRemoveMember,
    onRemoveMember,
    onCancelRemoveMember,
    onRequestDeleteTeam,
    onCancelDeleteTeam,
    onDeleteTeam,
    onBillingAction,
  } = viewModel;

  if (!team) return null;

  const serverUrl = getServerUrl();
  const teamPreset = getTeamPreset(getTeamPresetId(team.image));
  const teamAvatarUrl =
    teamPreset || !team.image || !serverUrl
      ? null
      : getTeamAvatarPublicUrl({
          baseUrl: serverUrl,
          teamId: team.id,
          storageKey: team.image,
        });
  const teamInitial = team.name.charAt(0).toUpperCase();
  const isOwner = team.role === "owner";

  const navItems: NavItem[] = [
    { id: "general", label: "General", icon: Box, visible: true },
    { id: "members", label: "Members", icon: Users, visible: true },
    { id: "billing", label: "Billing", icon: CreditCard, visible: isOwner },
  ];

  const activePane = navItems.some((item) => item.visible !== false && item.id === pane)
    ? pane
    : "general";

  const paneCopy = PANE_COPY[activePane];

  return (
    <AgencySettingsDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Agency settings"
      description={`Manage ${team.name}: profile, members, and billing.`}
      pane={activePane}
      onPaneChange={onPaneChange}
      navItems={navItems}
      paneTitle={paneCopy.title}
      paneDescription={paneCopy.description}
    >
      {activePane === "general" ? (
        <TeamSettingsGeneralPaneView
          teamName={team.name}
          teamInitial={teamInitial}
          teamAvatarUrl={teamAvatarUrl}
          teamPresetGlyph={teamPreset ? teamPreset.glyph : "initial"}
          canManage={perms.canManageSelectedTeam}
          canDelete={perms.canDeleteTeam}
          nameDraft={nameDraft}
          nameDirty={nameDirty}
          savingName={savingName}
          uploadingImage={uploadingImage}
          confirmDelete={confirmDelete}
          deletingTeam={deletingTeam}
          onNameDraftChange={onNameDraftChange}
          onSaveName={onSaveName}
          onPickImage={onPickImage}
          onRequestDeleteTeam={onRequestDeleteTeam}
          onCancelDeleteTeam={onCancelDeleteTeam}
          onDeleteTeam={onDeleteTeam}
        />
      ) : null}

      {activePane === "members" ? (
        <TeamSettingsMembersPaneView
          canInvite={perms.canInvite}
          canModifyRoles={perms.canModifyRoles}
          sortedMembers={sortedMembers}
          pendingInvites={pendingInvites}
          currentUserId={currentUserId}
          inviteYou={inviteYou}
          inviteInputId={inviteInputId}
          stagedInvites={stagedInvites}
          inviteEmail={inviteEmail}
          inviteRole={inviteRole}
          addingMember={addingMember}
          inviteFormError={inviteFormError}
          inviteEmailRef={inviteEmailRef}
          confirmRemoveUserId={confirmRemoveUserId}
          removeTargetName={removeTargetName}
          onInviteEmailChange={onInviteEmailChange}
          onInviteRoleChange={onInviteRoleChange}
          onStageInvite={onStageInvite}
          onRemoveStagedInvite={onRemoveStagedInvite}
          onSendInvites={onSendInvites}
          onUpdateMemberRole={onUpdateMemberRole}
          onRequestRemoveMember={onRequestRemoveMember}
          onRemoveMember={onRemoveMember}
          onCancelRemoveMember={onCancelRemoveMember}
        />
      ) : null}

      {activePane === "billing" && isOwner ? (
        <TeamSettingsBillingPaneView
          plan={plan}
          billingLoading={billingLoading}
          seats={billingSeats}
          memberCount={sortedMembers.length}
          onBillingAction={onBillingAction}
        />
      ) : null}
    </AgencySettingsDialogShell>
  );
}
