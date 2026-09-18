import { create } from "zustand";

import {
  teamDetailQueryKey,
  teamInvitesMineQueryKey,
  teamListQueryKey,
} from "@/features/team/team-queries";
import { useTeamStore } from "@/features/team/team-store";
import { orpc, orpcClient } from "@/lib/orpc";
import { getQueryClient } from "@/lib/query-client";
import { getErrorMessage } from "@/lib/utils/get-error-message";

type AcceptedTeam = {
  id: string;
  name: string;
  role: "owner" | "editor" | "viewer";
};

type TeamInvitesStoreState = {
  reviewInviteId: string | null;
  dismissedDialogIds: string[];
  acceptingId: string | null;
  decliningId: string | null;
  actionError: string | null;
  openReview: (inviteId: string) => void;
  dismissDialog: (inviteId: string) => void;
  acceptInvite: (inviteId: string) => Promise<AcceptedTeam | null>;
  declineInvite: (inviteId: string) => Promise<boolean>;
};

function firstRunQueryKey() {
  return orpc.onboarding.get.queryOptions().queryKey;
}

async function refreshAfterInvite(teamId: string | null) {
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: teamInvitesMineQueryKey() }),
    queryClient.invalidateQueries({ queryKey: teamListQueryKey() }),
    queryClient.invalidateQueries({ queryKey: firstRunQueryKey() }),
    teamId
      ? queryClient.invalidateQueries({ queryKey: teamDetailQueryKey(teamId) })
      : Promise.resolve(),
  ]);
}

export const useTeamInvitesStore = create<TeamInvitesStoreState>((set, get) => ({
  reviewInviteId: null,
  dismissedDialogIds: [],
  acceptingId: null,
  decliningId: null,
  actionError: null,

  openReview: (inviteId) =>
    set((state) => ({
      reviewInviteId: inviteId,
      dismissedDialogIds: state.dismissedDialogIds.filter((id) => id !== inviteId),
      actionError: null,
    })),

  dismissDialog: (inviteId) =>
    set((state) => ({
      reviewInviteId: state.reviewInviteId === inviteId ? null : state.reviewInviteId,
      dismissedDialogIds: state.dismissedDialogIds.includes(inviteId)
        ? state.dismissedDialogIds
        : [...state.dismissedDialogIds, inviteId],
    })),

  acceptInvite: async (inviteId) => {
    set({ acceptingId: inviteId, actionError: null });
    try {
      const result = await orpcClient.team.invites.accept({ inviteId });
      useTeamStore.getState().setSelectedTeamId(result.team.id);
      await refreshAfterInvite(result.team.id);
      set({ reviewInviteId: get().reviewInviteId === inviteId ? null : get().reviewInviteId });
      return result.team;
    } catch (error) {
      set({
        actionError: getErrorMessage(error, "Couldn't join this agency. Try again."),
      });
      return null;
    } finally {
      set({ acceptingId: null });
    }
  },

  declineInvite: async (inviteId) => {
    set({ decliningId: inviteId, actionError: null });
    try {
      await orpcClient.team.invites.decline({ inviteId });
      await refreshAfterInvite(null);
      set({
        reviewInviteId: get().reviewInviteId === inviteId ? null : get().reviewInviteId,
      });
      return true;
    } catch (error) {
      set({
        actionError: getErrorMessage(error, "Couldn't decline this invite. Try again."),
      });
      return false;
    } finally {
      set({ decliningId: null });
    }
  },
}));
