import { type ReactNode } from "react";
import { Box, CreditCard, Loader2, MoreHorizontal, Trash2, UserMinus, Users } from "lucide-react";

import { agencyPlanLabel, isPaidAgencyPlan } from "@/features/billing/agency-plan-label";
import { shellFocusRingClass } from "@/features/app-shell/app-shell-ui";
import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import { AgencySettingsDialogShell } from "@/features/shared/agency-settings-dialog-shell";
import type {
  TeamSettingsModalViewModel,
  TeamSettingsRole,
} from "@/features/team/hooks/use-team-settings-modal-actions";
import type { TeamSettingsPane } from "@/features/team/hooks/use-team-settings-modal-state";
import { getTeamAvatarPublicUrl } from "@/features/team/team-avatar-url";
import { AgencyMarkGlyph } from "@/features/team/team-avatar-glyphs";
import { getTeamPreset, getTeamPresetId } from "@/features/team/team-avatar-presets";
import { TeamInviteCardView } from "@/features/team/views/team-invite-card-view";
import { getServerUrl } from "@/lib/env";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/ui/avatar";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";

const roleOptions: Array<{ value: TeamSettingsRole; label: string }> = [
  { value: "viewer", label: "Viewer" },
  { value: "editor", label: "Editor" },
  { value: "owner", label: "Owner" },
];

type TeamSettingsModalViewProps = {
  viewModel: TeamSettingsModalViewModel;
};

type NavItem = {
  id: TeamSettingsPane;
  label: string;
  icon: typeof Box;
  visible: boolean;
};

function SettingsRow({
  label,
  children,
  htmlFor,
  description,
}: {
  label: string;
  children: ReactNode;
  htmlFor?: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-4 last:border-b-0">
      <div className="min-w-0 shrink-0">
        <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
          {label}
        </Label>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">{children}</div>
    </div>
  );
}

function roleLabel(role: TeamSettingsRole) {
  if (role === "owner") return "Owner";
  if (role === "editor") return "Editor";
  return "Viewer";
}

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

  const paneTitle =
    activePane === "general" ? "General" : activePane === "members" ? "Members" : "Billing";

  return (
    <AgencySettingsDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Agency settings"
      description={`Manage ${team.name}: profile, members, and billing.`}
      pane={activePane}
      onPaneChange={onPaneChange}
      navItems={navItems}
      paneTitle={paneTitle}
    >
      {activePane === "general" ? (
        <div className="mt-6 flex flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-border pb-5">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-foreground">Agency profile</p>
              <p className="text-xs text-muted-foreground">
                Shown in the workspace switcher across Orch.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Avatar size="lg" className="size-14 rounded-xl after:rounded-xl">
                {teamAvatarUrl ? (
                  <AvatarImage src={teamAvatarUrl} alt="" className="rounded-xl object-cover" />
                ) : (
                  <AgencyMarkGlyph
                    glyph={teamPreset ? teamPreset.glyph : "initial"}
                    initial={teamInitial}
                    className="absolute inset-0 size-full rounded-xl"
                  />
                )}
                <AvatarFallback className="rounded-xl text-base font-semibold">
                  {teamInitial}
                </AvatarFallback>
              </Avatar>
              {perms.canManageSelectedTeam ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={uploadingImage}
                  onClick={onPickImage}
                >
                  {uploadingImage ? <Loader2 className="size-4 animate-spin" /> : null}
                  Change
                </Button>
              ) : null}
            </div>
          </div>

          <SettingsRow label="Agency name" htmlFor="team-name">
            {perms.canManageSelectedTeam ? (
              <>
                <Input
                  id="team-name"
                  value={nameDraft || team.name}
                  placeholder="Agency name"
                  className={cn("max-w-56", shellFocusRingClass)}
                  onChange={(e) => onNameDraftChange(e.target.value)}
                  onFocus={() => {
                    if (!nameDraft) onNameDraftChange(team.name);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && nameDirty) onSaveName();
                  }}
                />
                {nameDirty ? (
                  <Button size="sm" disabled={savingName} onClick={onSaveName}>
                    {savingName ? <Loader2 className="size-4 animate-spin" /> : null}
                    Save
                  </Button>
                ) : null}
              </>
            ) : (
              <span className="text-sm text-muted-foreground">{team.name}</span>
            )}
          </SettingsRow>

          {perms.canDeleteTeam ? (
            <div className="mt-8 rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-sm font-medium text-foreground">Delete agency</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Permanently delete {team.name} and detach all shared nodes. This cannot be undone.
              </p>
              {confirmDelete ? (
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={deletingTeam}
                    onClick={onDeleteTeam}
                  >
                    {deletingTeam ? <Loader2 className="size-4 animate-spin" /> : null}
                    Confirm delete
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={deletingTeam}
                    onClick={onCancelDeleteTeam}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="mt-4" onClick={onRequestDeleteTeam}>
                  <Trash2 className="size-4" />
                  Delete agency
                </Button>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {activePane === "members" ? (
        <div className="mt-6 flex flex-col gap-6">
          {perms.canInvite ? (
            <TeamInviteCardView
              you={inviteYou}
              members={sortedMembers.map((member) => ({
                key: member.userId,
                name: member.userName || member.userEmail,
                avatarUrl: member.userAvatar,
                userId: member.userId,
              }))}
              emailInputId={inviteInputId}
              pending={stagedInvites}
              inviteEmail={inviteEmail}
              defaultRole={inviteRole}
              staging={addingMember}
              formError={inviteFormError}
              headline="Invite your team"
              description="Track time together, share projects, and keep everyone aligned."
              sendLabel={
                stagedInvites.length > 0
                  ? `Send ${stagedInvites.length} invite${stagedInvites.length === 1 ? "" : "s"}`
                  : "Send invites"
              }
              inputRef={inviteEmailRef}
              onInviteEmailChange={onInviteEmailChange}
              onDefaultRoleChange={onInviteRoleChange}
              onStageInvite={onStageInvite}
              onRemovePending={onRemoveStagedInvite}
              onSendInvites={onSendInvites}
            />
          ) : null}

          <div className="flex flex-col gap-1">
            {sortedMembers.length === 0 && pendingInvites.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members yet.</p>
            ) : (
              <>
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/40"
                  >
                    <AgencyMemberAvatar
                      name={invite.invitedName || invite.invitedEmail}
                      userId={invite.invitedUserId}
                      avatarUrl={invite.invitedAvatar}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-foreground">
                          {invite.invitedName || invite.invitedEmail.split("@")[0]}
                        </span>
                        <Badge variant="outline" className="text-[10px] leading-none">
                          Pending
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {invite.invitedEmail}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 border-l border-border pl-3">
                      <Badge variant="secondary" className="shrink-0">
                        {roleLabel(invite.role)}
                      </Badge>
                    </div>
                  </div>
                ))}
                {sortedMembers.map((member) => {
                  const isSelf = member.userId === currentUserId;
                  const canAct = perms.canModifyRoles && !isSelf;
                  const isRemoving = confirmRemoveUserId === member.userId;

                  return (
                    <div
                      key={member.userId}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                        isRemoving ? "bg-destructive/5" : "hover:bg-muted/40",
                      )}
                    >
                      <AgencyMemberAvatar
                        name={member.userName || member.userEmail}
                        userId={member.userId}
                        avatarUrl={member.userAvatar}
                        size="md"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">
                            {member.userName || member.userEmail.split("@")[0]}
                          </span>
                          {isSelf ? (
                            <Badge variant="outline" className="text-[10px] leading-none">
                              You
                            </Badge>
                          ) : null}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{member.userEmail}</p>
                      </div>

                      <div className="flex items-center gap-2 border-l border-border pl-3">
                        <Badge
                          variant={member.role === "owner" ? "default" : "secondary"}
                          className="shrink-0"
                        >
                          {roleLabel(member.role)}
                        </Badge>

                        {canAct ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              {isRemoving ? (
                                <div className="flex items-center gap-1.5 text-xs text-destructive">
                                  <Loader2 className="size-3 animate-spin" />
                                  Removing
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 shrink-0 rounded-lg text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                                  aria-label={`Actions for ${member.userName || member.userEmail}`}
                                >
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              )}
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              {roleOptions.map((option) =>
                                option.value !== member.role ? (
                                  <DropdownMenuItem
                                    key={option.value}
                                    onClick={() => onUpdateMemberRole(member.userId, option.value)}
                                  >
                                    Make {option.label}
                                  </DropdownMenuItem>
                                ) : null,
                              )}
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => onRequestRemoveMember(member.userId)}
                              >
                                Remove from agency
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {confirmRemoveUserId ? (
              <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm font-semibold text-destructive">Remove {removeTargetName}?</p>
                <p className="mt-1 text-xs text-destructive/80">
                  This will revoke access to all shared nodes immediately.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onRemoveMember(confirmRemoveUserId)}
                  >
                    <UserMinus className="size-4" />
                    Remove
                  </Button>
                  <Button size="sm" variant="ghost" onClick={onCancelRemoveMember}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {activePane === "billing" && isOwner ? (
        <div className="mt-6 flex flex-col">
          <SettingsRow label="Plan">
            <Badge variant={isPaidAgencyPlan(plan) ? "default" : "secondary"}>
              {agencyPlanLabel(plan)}
            </Badge>
          </SettingsRow>

          <SettingsRow
            label="Subscription"
            description={
              isPaidAgencyPlan(plan)
                ? "Manage billing, invoices, and seats."
                : "Subscribe to keep Tracker, projects, money, and people for this agency."
            }
          >
            <Button type="button" size="sm" onClick={onBillingAction}>
              <CreditCard className="size-4" />
              {isPaidAgencyPlan(plan) ? "Manage billing" : "Subscribe — 1 seat"}
            </Button>
          </SettingsRow>
        </div>
      ) : null}
    </AgencySettingsDialogShell>
  );
}
