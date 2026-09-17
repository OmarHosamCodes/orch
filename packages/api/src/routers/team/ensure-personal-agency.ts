import { createTeam, listUserTeams } from "./service";

export async function ensurePersonalAgency(actorUserId: string, input: { name: string }) {
  const existingTeams = await listUserTeams(actorUserId, {});
  const existingTeam = existingTeams[0];
  if (existingTeam) {
    return existingTeam;
  }

  const trimmedName = input.name.trim();
  const agencyName =
    trimmedName.length === 0
      ? "Agency"
      : /agency$/i.test(trimmedName)
        ? trimmedName
        : `${trimmedName}'s agency`;

  return createTeam(actorUserId, { name: agencyName });
}
