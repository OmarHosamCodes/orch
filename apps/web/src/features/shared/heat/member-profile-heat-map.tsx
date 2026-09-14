type MemberProfileHeatDay = {
  date: string;
  totalSeconds: number;
  intensity: number;
  off: { type: string; reason: string | null } | null;
  offBand: "start" | "middle" | "end" | "single" | null;
  hoursLabel: string;
  dayOfMonthLabel: string;
};

export type MemberProfileHeatMapData = {
  startDate: string;
  endDate: string;
  days: MemberProfileHeatDay[];
};
