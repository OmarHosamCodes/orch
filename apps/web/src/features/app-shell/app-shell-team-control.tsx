import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, Plus, Settings2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import {
  AppShellTeamCardButton,
  TeamCardOpenIndicator,
} from "@/features/app-shell/app-shell-team-card-trigger";
import { shellFocusRingClass } from "@/features/app-shell/app-shell-ui";
import { teamDetailQueryOptions, teamListQueryOptions } from "@/features/team/team-queries";
import { TeamSettingsModal } from "@/features/team/team-settings-modal";
import { useTeamStore } from "@/features/team/team-store";
import { authClient } from "@/lib/auth-client";
import { getServerUrl } from "@/lib/env";
import { teamCreateFormSchema } from "@/lib/schemas";
import { getTeamAvatarPublicUrl } from "@/features/team/team-avatar-url";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/ui/avatar";
import { Button } from "@/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/form";
import { Input } from "@/ui/input";
import { Skeleton } from "@/ui/skeleton";

type AppShellTeamControlProps = {
  className?: string;
  /** `compact` round toolbar trigger, or a full-width `sidebar` header row. */
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
  const avatarUrl =
    image && teamId && serverUrl
      ? getTeamAvatarPublicUrl({ baseUrl: serverUrl, teamId, storageKey: image })
      : null;
  const initial = name ? name.charAt(0).toUpperCase() : null;

  return (
    <Avatar className={cn("size-7 rounded-lg after:rounded-lg", className)} aria-hidden="true">
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} alt="" className="rounded-lg object-cover" />
      ) : null}
      <AvatarFallback className="rounded-lg bg-primary/10 text-sm font-semibold text-primary">
        {initial ?? <Users className="size-3.5" />}
      </AvatarFallback>
    </Avatar>
  );
}

export function AppShellTeamControl({ className, variant = "compact" }: AppShellTeamControlProps) {
  const session = authClient.useSession();
  const authEnabled = Boolean(session.data?.user);
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const selectedTeamId = useTeamStore((s) => s.selectedTeamId);
  const syncSelectedTeam = useTeamStore((s) => s.syncSelectedTeam);
  const setSelectedTeamId = useTeamStore((s) => s.setSelectedTeamId);
  const createTeamPending = useTeamStore((s) => s.createTeamPending);
  const createTeam = useTeamStore((s) => s.createTeam);

  const teamListQuery = useQuery({
    ...teamListQueryOptions(),
    enabled: authEnabled,
  });

  const teamDetailQuery = useQuery({
    ...teamDetailQueryOptions(selectedTeamId),
    enabled: Boolean(authEnabled && selectedTeamId),
  });

  const teams = useMemo(() => teamListQuery.data?.items ?? [], [teamListQuery.data?.items]);
  const selectedTeam = teamDetailQuery.data ?? null;
  const selectedSummary = teams.find((team) => team.id === selectedTeamId) ?? teams[0] ?? null;
  const displayName = selectedTeam?.name ?? selectedSummary?.name ?? "";
  const displayImage = selectedTeam?.image ?? selectedSummary?.image ?? null;
  const displayTeamId = selectedTeam?.id ?? selectedSummary?.id ?? selectedTeamId;
  const memberCount = selectedTeam?.members.length ?? 0;
  const secondaryLabel = selectedTeam
    ? `${memberCount} member${memberCount === 1 ? "" : "s"}`
    : "Workspace";

  useEffect(() => {
    syncSelectedTeam(teams);
  }, [teams, syncSelectedTeam]);

  const createTeamForm = useForm({
    resolver: zodResolver(teamCreateFormSchema),
    defaultValues: { name: "" },
  });

  if (!authEnabled) {
    return null;
  }

  if (teamListQuery.isPending) {
    return variant === "sidebar" ? (
      <Skeleton className={cn("h-[3.625rem] w-full rounded-[0.875rem]", className)} />
    ) : (
      <Skeleton className={cn("size-8 rounded-full", className)} />
    );
  }

  return (
    <>
      <DropdownMenu
        open={menuOpen}
        onOpenChange={(open) => {
          setMenuOpen(open);
          if (!open) {
            setCreateOpen(false);
            createTeamForm.reset();
          }
        }}
      >
        {variant === "sidebar" ? (
          <div className="group/team-card relative w-full">
            <DropdownMenuTrigger asChild>
              <AppShellTeamCardButton
                className={className}
                name={displayName || "Select team"}
                meta={secondaryLabel}
                ariaLabel={displayName ? `Team: ${displayName}` : "Select team"}
                mark={
                  <TeamMark
                    name={displayName}
                    image={displayImage}
                    teamId={displayTeamId}
                    className="size-9 rounded-lg after:hidden"
                  />
                }
              />
            </DropdownMenuTrigger>
            <TeamCardOpenIndicator open={menuOpen} />
          </div>
        ) : (
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-elevated hover:text-highlighted",
                shellFocusRingClass,
                className,
              )}
              aria-label={displayName ? `Team: ${displayName}` : "Select team"}
              aria-expanded={menuOpen}
              title={displayName || "Select team"}
            >
              <TeamMark
                name={displayName}
                image={displayImage}
                teamId={displayTeamId}
                className="size-8 rounded-full after:rounded-full"
              />
            </button>
          </DropdownMenuTrigger>
        )}

        <DropdownMenuContent align="start" className="w-64">
          {createOpen ? (
            <div className="p-2">
              <Form {...createTeamForm}>
                <form
                  className="flex flex-col gap-2"
                  onSubmit={createTeamForm.handleSubmit(async (values) => {
                    await createTeam(values.name);
                    createTeamForm.reset();
                    setCreateOpen(false);
                    setMenuOpen(false);
                  })}
                >
                  <FormField
                    control={createTeamForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">Team name</FormLabel>
                        <FormControl>
                          <Input placeholder="Team name" autoFocus {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" type="submit" disabled={createTeamPending}>
                      {createTeamPending ? <Loader2 className="size-4 animate-spin" /> : null}
                      Create
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        createTeamForm.reset();
                        setCreateOpen(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          ) : (
            <>
              <DropdownMenuLabel className="font-normal text-muted">
                {teams.length === 0 ? "No teams yet" : "Switch team"}
              </DropdownMenuLabel>
              {teams.length > 0 ? (
                <DropdownMenuGroup>
                  {teams.map((team) => (
                    <DropdownMenuItem
                      key={team.id}
                      onSelect={() => {
                        setSelectedTeamId(team.id);
                      }}
                    >
                      <TeamMark
                        name={team.name}
                        image={team.image}
                        teamId={team.id}
                        className="size-6"
                      />
                      <span className="min-w-0 flex-1 truncate">{team.name}</span>
                      {team.id === selectedTeamId ? (
                        <Check className="size-3.5 shrink-0 text-primary" />
                      ) : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              ) : null}

              <DropdownMenuSeparator />

              {selectedTeamId ? (
                <DropdownMenuItem
                  onSelect={() => {
                    setSettingsOpen(true);
                  }}
                >
                  <Settings2 />
                  Team settings
                </DropdownMenuItem>
              ) : null}

              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  setCreateOpen(true);
                }}
              >
                <Plus />
                Create team
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <TeamSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        team={selectedTeam}
        onRefetchWorkspace={async () => {
          await teamDetailQuery.refetch();
        }}
      />
    </>
  );
}
