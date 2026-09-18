import { findOrCreatePersonalTeam } from "./service";

export function personalAgencyName(userName: string): string {
  const trimmedName = userName.trim();
  if (trimmedName.length === 0) {
    return "Agency";
  }
  if (/agency$/i.test(trimmedName)) {
    return trimmedName;
  }
  return `${trimmedName}'s agency`;
}

export async function ensurePersonalAgency(actorUserId: string, input: { name: string }) {
  return findOrCreatePersonalTeam(actorUserId, { name: personalAgencyName(input.name) });
}
