import { orpc } from "@/lib/orpc";

export function teamListQueryOptions() {
  return orpc.team.list.queryOptions();
}

export function teamDetailQueryOptions(teamId: string) {
  return orpc.team.get.queryOptions({ input: { teamId } });
}

export function teamInvitesMineQueryOptions() {
  return orpc.team.invites.listMine.queryOptions();
}

export function teamListQueryKey() {
  return teamListQueryOptions().queryKey;
}

export function teamDetailQueryKey(teamId: string) {
  return teamDetailQueryOptions(teamId).queryKey;
}

export function teamInvitesMineQueryKey() {
  return teamInvitesMineQueryOptions().queryKey;
}
