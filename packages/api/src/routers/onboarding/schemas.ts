import { z } from "zod";

import { teamSummarySchema } from "../../schemas/team";

export const firstRunStatusSchema = z.enum(["create", "join", "done"]);

export const firstRunJoinTeamSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const firstRunSessionSchema = z.object({
  status: firstRunStatusSchema,
  completedAt: z.string().datetime().nullable(),
  membershipCount: z.number().int().nonnegative(),
  joinTeam: firstRunJoinTeamSchema.nullable(),
  defaultAgencyName: z.string().min(1).max(120),
});

export const firstRunCreateInputSchema = z.object({
  name: z.string().trim().min(1, "Agency name is required").max(120),
});

export const firstRunCreateOutputSchema = z.object({
  team: teamSummarySchema,
  firstRun: firstRunSessionSchema,
});
