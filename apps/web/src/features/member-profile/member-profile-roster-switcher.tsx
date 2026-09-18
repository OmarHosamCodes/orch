import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import type { AgencyMemberProfileViewModel } from "@/features/member-profile/hooks/use-agency-member-profile";
import {
  filterMemberProfileRoster,
  type MemberProfileRosterMember,
} from "@/features/member-profile/member-profile-roster-nav";
import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import {
  AgencyPickerEmpty,
  AgencyPickerRow,
  AgencyPickerSearch,
} from "@/features/shared/pickers/agency-picker-shell";
import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { Skeleton } from "@/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip";

type MemberNav = AgencyMemberProfileViewModel["memberNav"];

function RosterAvatar({
  member,
  size = "sm",
  className,
}: {
  member: MemberProfileRosterMember;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <AgencyMemberAvatar
      name={member.userName}
      userId={member.userId}
      avatarUrl={member.userAvatarUrl}
      size={size}
      className={cn(size === "md" ? "size-7 rounded-xl" : "size-7 rounded-md", className)}
      alt=""
    />
  );
}

function NeighborButton({
  member,
  direction,
  disabled,
  onClick,
}: {
  member: MemberProfileRosterMember | null;
  direction: "previous" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const label =
    direction === "previous"
      ? member
        ? `Previous member: ${member.userName}`
        : "No previous member"
      : member
        ? `Next member: ${member.userName}`
        : "No next member";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || !member}
          onClick={onClick}
          aria-label={label}
          className={cn(
            "h-9 gap-1 rounded-xl px-1.5 text-muted-foreground",
            "hover:bg-default hover:text-foreground",
            "disabled:opacity-35",
            agencyFocusRingClass,
          )}
        >
          {direction === "previous" ? (
            <>
              <ChevronLeft className="size-4 shrink-0" aria-hidden />
              {member ? (
                <RosterAvatar member={member} className="opacity-90" />
              ) : (
                <span className="size-7 shrink-0 rounded-lg border border-dashed border-border/70" />
              )}
            </>
          ) : (
            <>
              {member ? (
                <RosterAvatar member={member} className="opacity-90" />
              ) : (
                <span className="size-7 shrink-0 rounded-lg border border-dashed border-border/70" />
              )}
              <ChevronRight className="size-4 shrink-0" aria-hidden />
            </>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{member ? member.userName : label}</TooltipContent>
    </Tooltip>
  );
}

export function MemberProfileRosterSwitcher({ memberNav }: { memberNav: MemberNav }) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = useMemo(
    () => filterMemberProfileRoster(memberNav.members, searchTerm),
    [memberNav.members, searchTerm],
  );

  if (memberNav.loading && memberNav.members.length === 0) {
    return <Skeleton className="h-9 w-48 rounded-xl" />;
  }

  if (!memberNav.current) return null;

  return (
    <div
      className="flex items-center gap-0.5 rounded-xl border border-default bg-default/60 p-0.5"
      role="group"
      aria-label="Switch member profile"
    >
      <NeighborButton
        member={memberNav.previous}
        direction="previous"
        disabled={!memberNav.canGoPrevious}
        onClick={memberNav.onGoPrevious}
      />

      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSearchTerm("");
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-9 max-w-[14rem] gap-2 rounded-xl px-2 font-semibold text-foreground",
              "hover:bg-elevated",
              agencyFocusRingClass,
            )}
            aria-label={`Current member: ${memberNav.current.userName}. Open member list`}
            aria-haspopup="dialog"
          >
            <RosterAvatar member={memberNav.current} size="md" className="size-7" />
            <span className="min-w-0 flex-1 truncate text-left text-xs">
              {memberNav.current.userName}
            </span>
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" size="chooser" className="overflow-hidden">
          <AgencyPickerSearch
            autoFocus
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Find a member…"
          />
          {memberNav.indexLabel ? (
            <p className="border-b border-border px-3 pb-2 text-[11px] text-muted-foreground">
              {memberNav.indexLabel}
            </p>
          ) : null}
          <div className="max-h-[18rem] overflow-y-auto p-1" aria-label="Team members">
            {filtered.length === 0 ? (
              <AgencyPickerEmpty>No members match.</AgencyPickerEmpty>
            ) : (
              filtered.map((member) => (
                <AgencyPickerRow
                  key={member.userId}
                  bareGlyph
                  glyph={<RosterAvatar member={member} />}
                  label={member.userName}
                  query={searchTerm}
                  selected={member.userId === memberNav.current?.userId}
                  onSelect={() => {
                    setOpen(false);
                    setSearchTerm("");
                    memberNav.onSelectMember(member.userId);
                  }}
                />
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      <NeighborButton
        member={memberNav.next}
        direction="next"
        disabled={!memberNav.canGoNext}
        onClick={memberNav.onGoNext}
      />
    </div>
  );
}
