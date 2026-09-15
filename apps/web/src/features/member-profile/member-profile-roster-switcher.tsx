import { Check, ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";

import type { AgencyMemberProfileViewModel } from "@/features/member-profile/hooks/use-agency-member-profile";
import {
  filterMemberProfileRoster,
  type MemberProfileRosterMember,
} from "@/features/member-profile/member-profile-roster-nav";
import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import { agencyFocusRingClass, agencyInputPlaceholderClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
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
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                autoFocus
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Find a member…"
                className={cn(
                  "h-9 rounded-lg border-border bg-background pl-8 text-sm",
                  agencyInputPlaceholderClass,
                )}
                aria-label="Find a member"
              />
            </div>
            {memberNav.indexLabel ? (
              <p className="mt-1.5 px-0.5 text-[11px] text-muted-foreground">
                {memberNav.indexLabel}
              </p>
            ) : null}
          </div>
          <div className="max-h-[18rem] overflow-y-auto p-1" aria-label="Team members">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                No members match.
              </p>
            ) : (
              filtered.map((member) => {
                const selected = member.userId === memberNav.current?.userId;
                return (
                  <button
                    key={member.userId}
                    type="button"
                    aria-current={selected ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors",
                      "hover:bg-muted/80",
                      selected && "bg-primary/10 hover:bg-primary/10",
                      agencyFocusRingClass,
                      "motion-reduce:transition-none",
                    )}
                    onClick={() => {
                      setOpen(false);
                      setSearchTerm("");
                      memberNav.onSelectMember(member.userId);
                    }}
                  >
                    <RosterAvatar member={member} />
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-xs font-semibold",
                        selected ? "text-primary" : "text-foreground",
                      )}
                    >
                      {member.userName}
                    </span>
                    {selected ? (
                      <Check className="size-3.5 shrink-0 text-primary" aria-hidden />
                    ) : null}
                  </button>
                );
              })
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
