import { Loader2, MoreHorizontal, UserMinus, Users } from "lucide-react";

import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import { AgencyFirstRunEmptyView } from "@/features/shared/views/agency-first-run-empty-view";
import { AgencySettingsPaneSection } from "@/features/shared/views/agency-settings-pane-section";
import type {
  TeamSettingsRole,
  TeamSettingsModalViewModel,
} from "@/features/team/hooks/use-team-settings-modal-actions";
import { TeamInviteCardView } from "@/features/team/views/team-invite-card-view";
import { cn } from "@/lib/utils";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";

const roleOptions: Array<{ value: TeamSettingsRole; label: string }> = [
  { value: "viewer", label: "Viewer" },
  { value: "editor", label: "Editor" },
  { value: "owner", label: "Owner" },
];

function roleLabel(role: TeamSettingsRole) {
  if (role === "owner") return "Owner";
  if (role === "editor") return "Editor";
  return "Viewer";
}

type MemberRow = TeamSettingsModalViewModel["sortedMembers"][number];
type PendingInvite = TeamSettingsModalViewModel["pendingInvites"][number];

type TeamSettingsMembersPaneViewProps = {
  canInvite: boolean;
  canModifyRoles: boolean;
  sortedMembers: MemberRow[];
  pendingInvites: PendingInvite[];
  currentUserId: string | null;
  inviteYou: TeamSettingsModalViewModel["inviteYou"];
  inviteInputId: string;
  stagedInvites: TeamSettingsModalViewModel["stagedInvites"];
  inviteEmail: string;
  inviteRole: TeamSettingsRole;
  addingMember: boolean;
  inviteFormError: string | null;
  inviteEmailRef: TeamSettingsModalViewModel["inviteEmailRef"];
  confirmRemoveUserId: string | null;
  removeTargetName: string;
  onInviteEmailChange: (value: string) => void;
  onInviteRoleChange: (role: TeamSettingsRole) => void;
  onStageInvite: () => void;
  onRemoveStagedInvite: (email: string) => void;
  onSendInvites: () => void;
  onUpdateMemberRole: (userId: string, role: TeamSettingsRole) => void;
  onRequestRemoveMember: (userId: string) => void;
  onRemoveMember: (userId: string) => void;
  onCancelRemoveMember: () => void;
};

function MembersTableHeader() {
  return (
    <div
      className="hidden grid-cols-[minmax(0,1fr)_5.5rem_2.5rem] gap-3 px-3 pb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:grid"
      aria-hidden
    >
      <span>Name</span>
      <span>Role</span>
      <span className="text-right">Actions</span>
    </div>
  );
}

export function TeamSettingsMembersPaneView({
  canInvite,
  canModifyRoles,
  sortedMembers,
  pendingInvites,
  currentUserId,
  inviteYou,
  inviteInputId,
  stagedInvites,
  inviteEmail,
  inviteRole,
  addingMember,
  inviteFormError,
  inviteEmailRef,
  confirmRemoveUserId,
  removeTargetName,
  onInviteEmailChange,
  onInviteRoleChange,
  onStageInvite,
  onRemoveStagedInvite,
  onSendInvites,
  onUpdateMemberRole,
  onRequestRemoveMember,
  onRemoveMember,
  onCancelRemoveMember,
}: TeamSettingsMembersPaneViewProps) {
  const memberCount = sortedMembers.length;
  const hasRoster = memberCount > 0 || pendingInvites.length > 0;

  return (
    <div className="flex flex-col gap-8">
      {canInvite ? (
        <AgencySettingsPaneSection
          title="Invite"
          description="Add teammates by email. Every member needs a seat on a paid plan."
        >
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
            headline={null}
            description={null}
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
        </AgencySettingsPaneSection>
      ) : null}

      <AgencySettingsPaneSection
        title="People"
        description={
          memberCount > 0
            ? `${memberCount} member${memberCount === 1 ? "" : "s"}${pendingInvites.length > 0 ? ` · ${pendingInvites.length} pending` : ""}`
            : "Members who can track time and open shared work."
        }
      >
        {confirmRemoveUserId ? (
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-semibold text-destructive">Remove {removeTargetName}?</p>
            <p className="mt-1 text-xs text-destructive/80">
              This revokes access to all shared nodes immediately.
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

        {!hasRoster ? (
          <AgencyFirstRunEmptyView
            icon={Users}
            title="No members yet"
            body="Invite someone to track time and share projects on this agency."
            className="border-0 bg-transparent p-0"
          />
        ) : (
          <>
            <MembersTableHeader />
            <div className="flex flex-col gap-0.5">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="grid grid-cols-1 items-center gap-2 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/40 md:grid-cols-[minmax(0,1fr)_5.5rem_2.5rem]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <AgencyMemberAvatar
                      name={invite.invitedName || invite.invitedEmail}
                      userId={invite.invitedUserId}
                      avatarUrl={invite.invitedAvatar}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
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
                  </div>
                  <Badge variant="secondary" className="w-fit shrink-0 md:justify-self-start">
                    {roleLabel(invite.role)}
                  </Badge>
                  <span className="hidden md:block" aria-hidden />
                </div>
              ))}

              {sortedMembers.map((member) => {
                const isSelf = member.userId === currentUserId;
                const canAct = canModifyRoles && !isSelf;
                const isRemoving = confirmRemoveUserId === member.userId;

                return (
                  <div
                    key={member.userId}
                    className={cn(
                      "grid grid-cols-1 items-center gap-2 rounded-xl px-3 py-2.5 transition-colors md:grid-cols-[minmax(0,1fr)_5.5rem_2.5rem]",
                      isRemoving ? "bg-destructive/5" : "hover:bg-muted/40",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <AgencyMemberAvatar
                        name={member.userName || member.userEmail}
                        userId={member.userId}
                        avatarUrl={member.userAvatar}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
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
                    </div>

                    <Badge
                      variant={member.role === "owner" ? "default" : "secondary"}
                      className="w-fit shrink-0 md:justify-self-start"
                    >
                      {roleLabel(member.role)}
                    </Badge>

                    <div className="flex justify-end md:justify-self-end">
                      {canAct ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            {isRemoving ? (
                              <div className="flex items-center gap-1.5 px-2 text-xs text-destructive">
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
            </div>
          </>
        )}
      </AgencySettingsPaneSection>
    </div>
  );
}
