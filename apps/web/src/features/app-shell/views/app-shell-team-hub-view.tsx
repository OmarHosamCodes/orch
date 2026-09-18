import { Check, CreditCard, Plus, Settings2, UserPlus } from "lucide-react";

import {
  AppShellTeamCardButton,
  TeamCardOpenIndicator,
} from "@/features/app-shell/app-shell-team-card-trigger";
import { shellFocusRingClass } from "@/features/app-shell/app-shell-ui";
import type { AppShellTeamHubViewModel } from "@/features/app-shell/hooks/use-app-shell-team-hub";
import { agencyPlanLabel } from "@/features/billing/agency-plan-label";
import { isPaidAgencyPlan } from "@/features/billing/agency-plan-label";
import { getTeamAvatarPublicUrl } from "@/features/team/team-avatar-url";
import { AgencyMarkGlyph } from "@/features/team/team-avatar-glyphs";
import { getTeamPreset, getTeamPresetId } from "@/features/team/team-avatar-presets";
import { getServerUrl } from "@/lib/env";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/ui/avatar";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { Skeleton } from "@/ui/skeleton";

type AppShellTeamHubViewProps = {
  viewModel: AppShellTeamHubViewModel;
  className?: string;
  variant?: "compact" | "sidebar";
};

function TeamMark({
  name,
  image,
  teamId,
  className,
}: {
  name: string;
  image: string | null | undefined;
  teamId: string | null | undefined;
  className?: string;
}) {
  const serverUrl = getServerUrl();
  const preset = getTeamPreset(getTeamPresetId(image));
  const avatarUrl =
    preset || !image || !teamId || !serverUrl
      ? null
      : getTeamAvatarPublicUrl({ baseUrl: serverUrl, teamId, storageKey: image });
  const initial = name ? name.charAt(0).toUpperCase() : null;

  return (
    <Avatar className={cn("size-7 rounded-lg after:rounded-lg", className)} aria-hidden="true">
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} alt="" className="rounded-lg object-cover" />
      ) : (
        <AgencyMarkGlyph
          glyph={preset ? preset.glyph : "initial"}
          initial={initial ?? "?"}
          className="absolute inset-0 size-full rounded-lg"
        />
      )}
      <AvatarFallback className="rounded-lg bg-primary/10 text-sm font-semibold text-primary">
        {initial ?? "?"}
      </AvatarFallback>
    </Avatar>
  );
}

function roleLabel(role: "owner" | "editor" | "viewer" | null) {
  if (role === "owner") return "Owner";
  if (role === "editor") return "Editor";
  if (role === "viewer") return "Viewer";
  return null;
}

export function AppShellTeamHubView({
  viewModel,
  className,
  variant = "compact",
}: AppShellTeamHubViewProps) {
  const {
    hubOpen,
    teams,
    selectedTeamId,
    displayName,
    displayImage,
    displayTeamId,
    memberCount,
    teamRole,
    isOwner,
    plan,
    cardMeta,
    onHubOpenChange,
    onOpenAgencySettings,
    onSelectTeam,
    onSubscribe,
    onOpenCreateDialog,
  } = viewModel;

  const role = roleLabel(teamRole);
  const showSubscribe = isOwner && !isPaidAgencyPlan(plan);

  const trigger =
    variant === "sidebar" ? (
      <div className="group/team-card relative w-full">
        <PopoverTrigger asChild>
          <AppShellTeamCardButton
            className={className}
            name={displayName || "Select agency"}
            meta={cardMeta}
            ariaLabel={displayName ? `Agency: ${displayName}` : "Select agency"}
            mark={
              <TeamMark
                name={displayName}
                image={displayImage}
                teamId={displayTeamId}
                className="size-9 rounded-lg after:hidden"
              />
            }
          />
        </PopoverTrigger>
        <TeamCardOpenIndicator open={hubOpen} />
      </div>
    ) : (
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-elevated hover:text-highlighted",
            shellFocusRingClass,
            className,
          )}
          aria-label={displayName ? `Agency: ${displayName}` : "Select agency"}
          aria-expanded={hubOpen}
          title={displayName || "Select agency"}
        >
          <TeamMark
            name={displayName}
            image={displayImage}
            teamId={displayTeamId}
            className="size-8 rounded-full after:rounded-full"
          />
        </button>
      </PopoverTrigger>
    );

  return (
    <Popover open={hubOpen} onOpenChange={onHubOpenChange}>
      {trigger}
      <PopoverContent
        align="start"
        side={variant === "sidebar" ? "bottom" : "bottom"}
        className="w-[min(20rem,calc(100vw-1.5rem))] p-0"
        size={undefined}
      >
        {selectedTeamId && displayName ? (
          <div className="border-b border-border p-3">
            <div className="flex items-start gap-3">
              <TeamMark
                name={displayName}
                image={displayImage}
                teamId={displayTeamId}
                className="size-10"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant={isPaidAgencyPlan(plan) ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {agencyPlanLabel(plan)}
                  </Badge>
                  {role ? (
                    <span className="text-[11px] text-muted-foreground">
                      {memberCount} member{memberCount === 1 ? "" : "s"} · {role}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">
                      {memberCount} member{memberCount === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {showSubscribe ? (
              <Button type="button" size="sm" className="mt-3 w-full" onClick={onSubscribe}>
                <CreditCard className="size-4" />
                Subscribe — 1 seat
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col p-1">
          {selectedTeamId ? (
            <>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-foreground hover:bg-muted/60",
                  shellFocusRingClass,
                )}
                onClick={() => onOpenAgencySettings({ pane: "general" })}
              >
                <Settings2 className="size-4 shrink-0 text-muted-foreground" />
                Agency settings
              </button>
              {isOwner ? (
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-foreground hover:bg-muted/60",
                    shellFocusRingClass,
                  )}
                  onClick={() =>
                    onOpenAgencySettings({ pane: "members", membersInviteAutofocus: true })
                  }
                >
                  <UserPlus className="size-4 shrink-0 text-muted-foreground" />
                  Invite people
                </button>
              ) : null}
            </>
          ) : null}

          {teams.length > 0 ? (
            <p className="px-2 pt-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Switch agency
            </p>
          ) : (
            <p className="px-2 py-3 text-sm text-muted-foreground">No agencies yet.</p>
          )}

          {teams.map((team) => (
            <button
              key={team.id}
              type="button"
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/60",
                shellFocusRingClass,
              )}
              onClick={() => onSelectTeam(team.id)}
            >
              <TeamMark name={team.name} image={team.image} teamId={team.id} className="size-6" />
              <span className="min-w-0 flex-1 truncate">{team.name}</span>
              {team.id === selectedTeamId ? (
                <Check className="size-3.5 shrink-0 text-primary" aria-hidden />
              ) : null}
            </button>
          ))}
        </div>

        {teams.length === 0 ? (
          <div className="border-t border-border p-1">
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-foreground hover:bg-muted/60",
                shellFocusRingClass,
              )}
              onClick={onOpenCreateDialog}
            >
              <Plus className="size-4 shrink-0 text-muted-foreground" />
              Create agency
            </button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

export function AppShellTeamHubSkeleton({
  className,
  variant = "compact",
}: {
  className?: string;
  variant?: "compact" | "sidebar";
}) {
  return variant === "sidebar" ? (
    <Skeleton className={cn("h-[3.625rem] w-full rounded-[0.875rem]", className)} />
  ) : (
    <Skeleton className={cn("size-8 rounded-full", className)} />
  );
}
