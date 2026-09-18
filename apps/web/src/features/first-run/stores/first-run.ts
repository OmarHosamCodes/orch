import { create } from "zustand";

import { teamDetailQueryKey, teamListQueryKey } from "@/features/team/team-queries";
import { toTeamPresetImage } from "@/features/team/team-avatar-presets";
import { useTeamStore } from "@/features/team/team-store";
import type { BootFirstRun } from "@/lib/authenticated-boot";
import { getServerUrl } from "@/lib/env";
import { orpc, orpcClient } from "@/lib/orpc";
import { getQueryClient } from "@/lib/query-client";
import { getErrorMessage } from "@/lib/utils/get-error-message";

type FirstRunAgencyIdentity = {
  presetId: string | null;
  logoFile: File | null;
};

type FirstRunStoreState = {
  creating: boolean;
  completing: boolean;
  actionError: string | null;
  createAgency: (name: string, identity?: FirstRunAgencyIdentity) => Promise<BootFirstRun | null>;
  complete: () => Promise<BootFirstRun | null>;
  clearActionError: () => void;
};

function firstRunQueryKey() {
  return orpc.onboarding.get.queryOptions().queryKey;
}

async function applyAgencyIdentity(teamId: string, identity: FirstRunAgencyIdentity | undefined) {
  if (!identity) return;
  const store = useTeamStore.getState();
  if (identity.logoFile) {
    const formData = new FormData();
    formData.append("teamId", teamId);
    formData.append("file", identity.logoFile);
    const response = await fetch(`${getServerUrl()}/uploads/team-avatar`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (!response.ok) return;
    const { storageKey } = (await response.json()) as { storageKey: string };
    await store.saveTeamImage(teamId, storageKey);
    return;
  }
  if (identity.presetId) {
    await store.saveTeamImage(teamId, toTeamPresetImage(identity.presetId));
  }
}

async function refreshTeams(teamId: string | null) {
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: teamListQueryKey() }),
    teamId
      ? queryClient.invalidateQueries({ queryKey: teamDetailQueryKey(teamId) })
      : Promise.resolve(),
  ]);
}

export const useFirstRunStore = create<FirstRunStoreState>((set) => ({
  creating: false,
  completing: false,
  actionError: null,
  clearActionError: () => set({ actionError: null }),

  createAgency: async (name, identity) => {
    const teamName = name.trim();
    if (!teamName) {
      set({ actionError: "Agency name is required" });
      return null;
    }

    set({ creating: true, actionError: null });
    try {
      const result = await orpcClient.onboarding.createAgency({ name: teamName });
      const queryClient = getQueryClient();
      queryClient.setQueryData(firstRunQueryKey(), result.firstRun);
      if (result.team.id) {
        useTeamStore.getState().setSelectedTeamId(result.team.id);
        try {
          await applyAgencyIdentity(result.team.id, identity);
        } catch {
          // ponytail: mark stays editable later in team settings.
        }
      }
      await refreshTeams(result.team.id);
      return result.firstRun;
    } catch (error) {
      set({
        actionError: getErrorMessage(error, "Couldn't create the agency. Try again."),
      });
      return null;
    } finally {
      set({ creating: false });
    }
  },

  complete: async () => {
    set({ completing: true, actionError: null });
    try {
      const firstRun = await orpcClient.onboarding.complete();
      getQueryClient().setQueryData(firstRunQueryKey(), firstRun);
      if (firstRun.joinTeam?.id) {
        useTeamStore.getState().setSelectedTeamId(firstRun.joinTeam.id);
      }
      await refreshTeams(firstRun.joinTeam?.id ?? null);
      return firstRun;
    } catch (error) {
      set({
        actionError: getErrorMessage(error, "Couldn't continue. Try again."),
      });
      return null;
    } finally {
      set({ completing: false });
    }
  },
}));
