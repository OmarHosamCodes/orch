import { createContext, useContext, type ReactNode } from "react";

import {
  useAgencyTrackerRightPanel,
  type AgencyTrackerRightPanelViewModel,
} from "@/features/task-management/hooks/use-agency-tracker-right-panel";

const AgencyTrackerRightPanelContext = createContext<AgencyTrackerRightPanelViewModel | null>(null);

type AgencyTrackerRightPanelProviderProps = {
  teamId: string;
  children: ReactNode;
};

export function AgencyTrackerRightPanelProvider({
  teamId,
  children,
}: AgencyTrackerRightPanelProviderProps) {
  const panel = useAgencyTrackerRightPanel({ teamId });
  return (
    <AgencyTrackerRightPanelContext.Provider value={panel}>
      {children}
    </AgencyTrackerRightPanelContext.Provider>
  );
}

export function useAgencyTrackerRightPanelContext(): AgencyTrackerRightPanelViewModel {
  const panel = useContext(AgencyTrackerRightPanelContext);
  if (!panel) {
    throw new Error("AgencyTrackerRightPanelProvider is missing");
  }
  return panel;
}
