import { findOrCreatePersonalTeam } from "./service";

export async function ensurePersonalAgency(actorUserId: string, input: { name: string }) {
  const trimmedName = input.name.trim();
  const agencyName =
    trimmedName.length === 0
      ? "Agency"
      : /agency$/i.test(trimmedName)
        ? trimmedName
        : `${trimmedName}'s agency`;

  return findOrCreatePersonalTeam(actorUserId, { name: agencyName });
}
