export type AgencyTeamMemberRole = "owner" | "editor" | "viewer" | (string & {});

export function agencyTeamCapabilities(role: AgencyTeamMemberRole | undefined) {
  const canEditRecords = role === "owner" || role === "editor";
  const canEditRates = role === "owner";
  const isOwner = role === "owner";
  return { canEditRecords, canEditRates, isOwner };
}
