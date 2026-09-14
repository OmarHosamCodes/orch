import { create } from "zustand";

export const AGENCY_TIME_ENTRIES_DEFAULT_PAGE_SIZE = 50;

type AgencyTimeEntriesLogState = {
  page: number;
  pageSize: number;
  expandedGroupKeys: Set<string>;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  toggleGroupExpand: (collapseKey: string) => void;
  resetForTeam: () => void;
};

export const useAgencyTimeEntriesLogStore = create<AgencyTimeEntriesLogState>((set) => ({
  page: 1,
  pageSize: AGENCY_TIME_ENTRIES_DEFAULT_PAGE_SIZE,
  expandedGroupKeys: new Set(),
  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize, page: 1 }),
  toggleGroupExpand: (collapseKey) =>
    set((state) => {
      const next = new Set(state.expandedGroupKeys);
      if (next.has(collapseKey)) next.delete(collapseKey);
      else next.add(collapseKey);
      return { expandedGroupKeys: next };
    }),
  resetForTeam: () =>
    set({
      page: 1,
      expandedGroupKeys: new Set(),
    }),
}));
