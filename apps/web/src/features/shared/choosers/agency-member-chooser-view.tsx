import { Check, ChevronDown, Plus, Search, UserRound, UsersRound, X } from "lucide-react";

import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import { shouldShowAssigneeStackPlus } from "@/features/shared/choosers/agency-member-stack";
import { Input } from "@/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { Skeleton, SkeletonGroup } from "@/ui/skeleton";
import type { AgencyMemberChooserViewModel } from "@/features/shared/choosers/use-agency-member-chooser";
import {
  agencyAvatarStackRingClass,
  agencyFocusRingClass,
  agencyInputPlaceholderClass,
} from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

type AgencyMemberChooserViewProps = {
  view: AgencyMemberChooserViewModel;
};

export function AgencyMemberChooserView({ view }: AgencyMemberChooserViewProps) {
  const {
    mode,
    disabled,
    loading,
    placeholder,
    searchPlaceholder,
    className,
    triggerVariant,
    stackMaxWidthPx,
    stackVisibleCount,
    stackOverflowCount,
    contentAlign,
    open,
    searchTerm,
    filteredMembers,
    triggerLabel,
    onOpenChange,
    onSearchChange,
    single,
    multiple,
  } = view;

  const showTeamOption = mode === "multiple";
  const showUnassigned = mode === "single" && single?.allowUnassigned;
  const showEmpty = mode === "single" && single?.allowEmpty;
  const selectedMember = single?.selectedMember ?? null;
  const isUnassigned = single?.isUnassigned ?? false;
  const assignedToTeam = multiple?.assignedToTeam ?? false;
  const stackMembers = multiple?.selectedMembers ?? [];
  const stackVisible = stackMembers.slice(0, stackVisibleCount);
  const stackOverflow = stackOverflowCount;
  const showStackPlus =
    !assignedToTeam && shouldShowAssigneeStackPlus(stackMembers.length, stackOverflow);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {triggerVariant === "stack" ? (
          <button
            type="button"
            disabled={disabled || loading}
            className={cn(
              "inline-flex max-w-full items-center",
              "transition-opacity disabled:cursor-not-allowed disabled:opacity-50",
              agencyFocusRingClass,
              "motion-reduce:transition-none",
              className,
            )}
            style={stackMaxWidthPx ? { maxWidth: stackMaxWidthPx } : undefined}
            aria-label={
              triggerLabel === "Unassigned" ? "Add assignees" : `Assignees: ${triggerLabel}`
            }
          >
            {assignedToTeam ? (
              <span
                className={cn(
                  "relative z-0 flex size-6 shrink-0 items-center justify-center rounded-md bg-muted",
                  agencyAvatarStackRingClass,
                )}
                aria-hidden
              >
                <UsersRound className="size-3 text-highlighted" />
              </span>
            ) : stackVisible.length > 0 ? (
              stackVisible.map((member, index) => (
                <span
                  key={member.userId}
                  className={cn(
                    "relative",
                    "transition-[margin,transform,opacity] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-out)]",
                    "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-[var(--motion-duration-fast)]",
                    "motion-reduce:animate-none motion-reduce:transition-none",
                    index > 0 && "-ml-2",
                  )}
                  style={{ zIndex: index + 1 }}
                >
                  <AgencyMemberAvatar
                    name={member.userName}
                    userId={member.userId}
                    avatarUrl={member.userAvatar}
                    size="sm"
                    className={cn("size-6 rounded-md", agencyAvatarStackRingClass)}
                  />
                </span>
              ))
            ) : stackOverflow > 0 ? null : (
              <span
                className={cn(
                  "relative z-0 size-6 shrink-0 rounded-md border border-default bg-elevated/40",
                  agencyAvatarStackRingClass,
                )}
                aria-hidden
              />
            )}
            {stackOverflow > 0 && !assignedToTeam ? (
              <span
                className={cn(
                  "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-md",
                  stackVisible.length > 0 && "-ml-2",
                  "bg-muted text-[9px] font-bold text-foreground tabular-nums",
                  agencyAvatarStackRingClass,
                )}
                aria-hidden
              >
                +{stackOverflow}
              </span>
            ) : null}
            {showStackPlus ? (
              <span
                className={cn(
                  "relative z-20 flex size-6 shrink-0 items-center justify-center rounded-full",
                  "border border-dashed border-default bg-elevated text-muted",
                  "transition-colors hover:border-ring hover:bg-default hover:text-highlighted",
                  "motion-reduce:transition-none",
                  stackVisible.length > 0 ? "-ml-2" : "-ml-1",
                )}
                aria-hidden
              >
                <Plus className="size-3" strokeWidth={2.5} />
              </span>
            ) : null}
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled || loading}
            className={cn(
              "flex h-8 w-full min-w-0 items-center gap-1.5 rounded-full border border-default bg-default px-2.5 text-[11px] font-semibold",
              "transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
              agencyFocusRingClass,
              mode === "single" && selectedMember
                ? "text-highlighted"
                : mode === "multiple" &&
                    (assignedToTeam || (multiple?.selectedUserIds.length ?? 0) > 0)
                  ? "text-highlighted"
                  : "text-muted",
              "motion-reduce:transition-none",
              className,
            )}
            aria-label="Assignee"
          >
            {loading ? null : assignedToTeam ? (
              <UsersRound className="size-3.5 shrink-0 text-muted" aria-hidden />
            ) : selectedMember ? (
              <AgencyMemberAvatar
                name={selectedMember.userName}
                userId={selectedMember.userId}
                avatarUrl={selectedMember.userAvatar}
                size="sm"
              />
            ) : (
              <UserRound className="size-3.5 shrink-0 text-muted" aria-hidden />
            )}
            <span className="min-w-0 flex-1 truncate text-left">
              {loading ? "Loading…" : triggerLabel}
            </span>
            <ChevronDown className="size-3 shrink-0 opacity-70" aria-hidden />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align={contentAlign} size="chooser" className="z-[60] overflow-hidden">
        <div className="shrink-0 border-b border-border p-2">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted" />
            <Input
              autoFocus
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label="Search members"
              className={cn(
                "h-9 rounded-lg border-default bg-default pl-8 text-base md:text-sm",
                agencyInputPlaceholderClass,
              )}
            />
          </div>
        </div>
        {mode === "multiple" && !assignedToTeam && stackMembers.length > 0 ? (
          <div className="flex flex-wrap gap-1 border-b border-border px-2 py-2">
            {stackMembers.map((member) => (
              <button
                key={member.userId}
                type="button"
                className={cn(
                  "inline-flex max-w-full items-center gap-1 rounded-full border border-default bg-elevated py-0.5 pr-0.5 pl-0.5",
                  "transition-colors hover:bg-muted",
                  agencyFocusRingClass,
                  "motion-reduce:transition-none",
                )}
                onClick={() => multiple?.onToggleMember(member.userId)}
                aria-label={`Remove ${member.userName}`}
              >
                <AgencyMemberAvatar
                  name={member.userName}
                  userId={member.userId}
                  avatarUrl={member.userAvatar}
                  size="sm"
                  className="size-5 rounded-full"
                />
                <span className="max-w-[7rem] truncate text-[11px] font-medium text-highlighted">
                  {member.userName}
                </span>
                <X className="mr-1 size-3 text-muted" aria-hidden />
              </button>
            ))}
          </div>
        ) : null}
        <div className="min-h-0 max-h-[24rem] overflow-x-hidden overflow-y-auto p-1">
          {loading ? (
            <SkeletonGroup className="space-y-2 px-3 py-1">
              {[1, 2, 3].map((rowIndex) => (
                <Skeleton key={rowIndex} className="h-8 rounded-lg" />
              ))}
            </SkeletonGroup>
          ) : (
            <>
              {showTeamOption ? (
                <button
                  type="button"
                  className={cn(
                    "flex w-full min-w-0 items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-default/80",
                    assignedToTeam && "bg-primary/10 hover:bg-primary/10",
                    agencyFocusRingClass,
                    "motion-reduce:transition-none",
                  )}
                  onClick={() => multiple?.onToggleEntireTeam()}
                  aria-pressed={assignedToTeam}
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted">
                    <UsersRound className="size-3 text-muted" aria-hidden />
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-xs font-semibold",
                      assignedToTeam ? "text-primary" : "text-highlighted",
                    )}
                  >
                    Entire team
                  </span>
                  {assignedToTeam ? (
                    <Check className="size-3.5 shrink-0 text-primary" aria-hidden />
                  ) : null}
                </button>
              ) : null}

              {showEmpty ? (
                <button
                  type="button"
                  className={cn(
                    "flex w-full min-w-0 items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-default/80",
                    !single?.value && "bg-primary/10 hover:bg-primary/10",
                    agencyFocusRingClass,
                    "motion-reduce:transition-none",
                  )}
                  onClick={() => single?.onClearSelection()}
                  aria-pressed={!single?.value}
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted">
                    <UsersRound className="size-3 text-muted" aria-hidden />
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-xs font-semibold",
                      !single?.value ? "text-primary" : "text-highlighted",
                    )}
                  >
                    {placeholder}
                  </span>
                </button>
              ) : null}

              {showUnassigned ? (
                <button
                  type="button"
                  className={cn(
                    "flex w-full min-w-0 items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-default/80",
                    isUnassigned && "bg-primary/10 hover:bg-primary/10",
                    agencyFocusRingClass,
                    "motion-reduce:transition-none",
                  )}
                  onClick={single?.onSelectUnassigned}
                  aria-pressed={isUnassigned}
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted">
                    <UserRound className="size-3 text-muted" aria-hidden />
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-xs font-semibold",
                      isUnassigned ? "text-primary" : "text-highlighted",
                    )}
                  >
                    Unassigned
                  </span>
                </button>
              ) : null}

              {filteredMembers.length === 0 ? (
                <p className="px-4 py-4 text-center text-xs text-muted">
                  {searchTerm.trim() ? "No matching members." : "No team members."}
                </p>
              ) : (
                filteredMembers.map((member) => {
                  const selected =
                    mode === "single"
                      ? member.userId === single?.value
                      : (multiple?.isMemberSelected(member.userId) ?? false);

                  return (
                    <button
                      key={member.userId}
                      type="button"
                      aria-pressed={selected}
                      className={cn(
                        "flex w-full min-w-0 items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-default/80",
                        selected && "bg-primary/10 hover:bg-primary/10",
                        agencyFocusRingClass,
                        "motion-reduce:transition-none",
                      )}
                      onClick={() =>
                        mode === "single"
                          ? single?.onSelectMember(member.userId)
                          : multiple?.onToggleMember(member.userId)
                      }
                    >
                      <AgencyMemberAvatar
                        name={member.userName}
                        userId={member.userId}
                        avatarUrl={member.userAvatar}
                        size="sm"
                      />
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate text-sm font-medium",
                          selected ? "text-primary" : "text-highlighted",
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
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
