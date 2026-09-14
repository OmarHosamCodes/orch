import { create } from "zustand";

type CurrentAgencyTeamState = {
  currentAgencyTeamId: string | null;
  setCurrentAgencyTeamId: (teamId: string | null) => void;
};

export const useCurrentAgencyTeamStore = create<CurrentAgencyTeamState>((set) => ({
  currentAgencyTeamId: null,
  setCurrentAgencyTeamId: (teamId) => set({ currentAgencyTeamId: teamId || null }),
}));

export function useCurrentAgencyTeam() {
  const currentAgencyTeamId = useCurrentAgencyTeamStore((s) => s.currentAgencyTeamId);
  const setCurrentAgencyTeamId = useCurrentAgencyTeamStore((s) => s.setCurrentAgencyTeamId);
  return { currentAgencyTeamId, setCurrentAgencyTeamId };
}
