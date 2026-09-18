import { Plus, SendHorizontal, X } from "lucide-react";

import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import { AgencyMarkGlyph } from "@/features/team/team-avatar-glyphs";
import { AgencyModeSegment } from "@/features/shared/dialog-kit/agency-mode-segment";
import {
  agencyAvatarStackRingClass,
  agencyFocusRingClass,
  agencyFormFieldClass,
  agencyFormLabelClass,
  agencyInputPlaceholderClass,
} from "@/features/shared/agency-ui";
import type { TeamSettingsRole } from "@/features/team/hooks/use-team-settings-modal-actions";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import type { Ref } from "react";

export type TeamInviteCardPending = {
  email: string;
  error?: string | null;
};

export type TeamInviteCardYou = {
  key: string;
  name: string;
  avatarUrl?: string | null;
  userId?: string | null;
};

type TeamInviteCardViewProps = {
  you: TeamInviteCardYou | null;
  members: TeamInviteCardYou[];
  emailInputId: string;
  pending: TeamInviteCardPending[];
  inviteEmail: string;
  defaultRole: TeamSettingsRole;
  staging: boolean;
  formError: string | null;
  headline?: string | null;
  description?: string | null;
  sendLabel?: string | null;
  inputRef?: Ref<HTMLInputElement>;
  onInviteEmailChange: (value: string) => void;
  onDefaultRoleChange: (role: TeamSettingsRole) => void;
  onStageInvite: () => void;
  onRemovePending: (email: string) => void;
  onSendInvites?: () => void;
};

const STACK_VISIBLE = 5;

export function TeamInviteCardView({
  you,
  members,
  emailInputId,
  pending,
  inviteEmail,
  defaultRole,
  staging,
  formError,
  headline,
  description,
  sendLabel,
  inputRef,
  onInviteEmailChange,
  onDefaultRoleChange,
  onStageInvite,
  onRemovePending,
  onSendInvites,
}: TeamInviteCardViewProps) {
  const others = members.filter((member) => member.key !== you?.key);
  const people = [...(you ? [you] : []), ...others];
  const visiblePeople = people.slice(0, STACK_VISIBLE);
  const visiblePending = pending.slice(0, Math.max(0, STACK_VISIBLE - visiblePeople.length));
  const overflowCount =
    people.length - visiblePeople.length + (pending.length - visiblePending.length);

  return (
    <div className="flex flex-col gap-3">
      {headline || description ? (
        <div className="flex flex-col gap-0.5">
          {headline ? <p className="text-sm font-semibold text-highlighted">{headline}</p> : null}
          {description ? <p className="text-xs text-muted">{description}</p> : null}
        </div>
      ) : null}

      <div className={agencyFormFieldClass}>
        <span className={agencyFormLabelClass} id={`${emailInputId}-team-label`}>
          Team
        </span>
        <div
          className="flex items-center"
          role="img"
          aria-labelledby={`${emailInputId}-team-label`}
        >
          {visiblePeople.map((person, index) => (
            <span
              key={person.key}
              className={cn(
                "relative shrink-0",
                "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-[var(--motion-duration-fast)]",
                "motion-reduce:animate-none",
                index > 0 && "-ml-2",
              )}
              style={{ zIndex: index + 1 }}
              title={person.key === you?.key ? `${person.name} (you)` : person.name}
            >
              <AgencyMemberAvatar
                name={person.name}
                userId={person.userId}
                avatarUrl={person.avatarUrl}
                size="sm"
                alt=""
                className={cn("size-6 rounded-md", agencyAvatarStackRingClass)}
              />
            </span>
          ))}
          {visiblePending.map((invite) => (
            <span
              key={invite.email.toLowerCase()}
              className={cn(
                "relative -ml-2 size-6 shrink-0 overflow-hidden rounded-md",
                agencyAvatarStackRingClass,
              )}
              title={invite.email}
            >
              <AgencyMarkGlyph glyph="initial" initial={invite.email} className="size-full" />
            </span>
          ))}
          {overflowCount > 0 ? (
            <span
              className={cn(
                "relative -ml-2 flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-[9px] font-bold text-foreground tabular-nums",
                agencyAvatarStackRingClass,
              )}
              aria-hidden
            >
              +{overflowCount}
            </span>
          ) : null}
          <button
            type="button"
            aria-label="Invite someone new"
            disabled={staging}
            onClick={() => document.getElementById(emailInputId)?.focus()}
            className={cn(
              "relative flex size-6 shrink-0 items-center justify-center rounded-full",
              "border border-dashed border-default bg-elevated text-muted",
              "transition-colors hover:border-ring hover:bg-default hover:text-highlighted",
              "motion-reduce:transition-none",
              (visiblePeople.length > 0 || visiblePending.length > 0) && "-ml-2",
              agencyFocusRingClass,
            )}
          >
            <Plus className="size-3" strokeWidth={2.5} aria-hidden />
          </button>
        </div>
      </div>

      <div className={agencyFormFieldClass}>
        <Label htmlFor={emailInputId} className={agencyFormLabelClass}>
          Invite by email
        </Label>
        <div className="flex items-center gap-1.5">
          <Input
            ref={inputRef}
            id={emailInputId}
            type="email"
            value={inviteEmail}
            placeholder="colleague@company.com"
            disabled={staging}
            className={cn(
              "h-9 rounded-xl border-default bg-default text-sm",
              agencyInputPlaceholderClass,
            )}
            onChange={(e) => onInviteEmailChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onStageInvite();
              }
            }}
          />
          <Button
            type="button"
            disabled={staging || !inviteEmail.trim()}
            onClick={onStageInvite}
            className="h-9 shrink-0 rounded-full px-4 text-sm"
          >
            <SendHorizontal className="size-4" aria-hidden />
            Invite
          </Button>
        </div>
        {formError ? (
          <p className="text-xs text-destructive" role="alert">
            {formError}
          </p>
        ) : null}
        <p className="text-[11px] text-muted">Every member needs a seat.</p>
      </div>

      <div className={agencyFormFieldClass}>
        <span className={agencyFormLabelClass} id={`${emailInputId}-role-label`}>
          Default role
        </span>
        <AgencyModeSegment
          value={defaultRole}
          aria-label="Default role for new members"
          disabled={staging}
          options={[
            { value: "viewer", label: "Viewer" },
            { value: "editor", label: "Editor" },
            { value: "owner", label: "Owner" },
          ]}
          onChange={onDefaultRoleChange}
        />
      </div>

      {pending.length > 0 ? (
        <ul className="flex max-h-40 flex-col overflow-y-auto">
          {pending.map((invite) => (
            <li
              key={invite.email.toLowerCase()}
              className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-[var(--motion-duration-fast)] motion-reduce:animate-none"
            >
              <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-out)] hover:bg-default/60 motion-reduce:transition-none">
                <span className="min-w-0 flex-1 truncate text-sm text-highlighted">
                  {invite.email}
                </span>
                <span className="shrink-0 text-[11px] text-muted capitalize">{defaultRole}</span>
                <button
                  type="button"
                  aria-label={`Remove ${invite.email}`}
                  disabled={staging}
                  onClick={() => onRemovePending(invite.email)}
                  className={cn(
                    "rounded-md p-1 text-muted transition-colors hover:bg-elevated hover:text-highlighted",
                    agencyFocusRingClass,
                  )}
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </div>
              {invite.error ? (
                <p className="px-2 pb-1 text-[11px] text-destructive" role="alert">
                  {invite.error}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {sendLabel && onSendInvites ? (
        <Button
          type="button"
          disabled={staging || pending.length === 0}
          onClick={onSendInvites}
          className="h-9 w-full rounded-full text-sm"
        >
          {sendLabel}
        </Button>
      ) : null}
    </div>
  );
}
