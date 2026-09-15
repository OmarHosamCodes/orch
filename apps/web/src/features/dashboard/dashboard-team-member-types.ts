export type DashboardTeamMemberActivity = {
  description: string;
  projectName: string;
  clientName: string | null;
  startedAt?: string | null;
};

export type DashboardTeamMemberSheetMember = {
  userId: string;
  userName: string;
  userEmail: string;
  avatar: string | null;
  totalSeconds: number;
  isTracking: boolean;
  activity: DashboardTeamMemberActivity | null;
  projectBreakdown: Array<{
    projectId: string;
    projectName: string;
    clientName: string;
    seconds: number;
  }>;
};
