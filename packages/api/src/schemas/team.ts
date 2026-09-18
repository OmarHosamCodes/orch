import { workspaceTeamRoleSchema } from "@orch/workspace";
import { z } from "zod";

export const teamMemberSchema = z.object({
  teamId: z.string().min(1),
  userId: z.string().min(1),
  userName: z.string().min(1),
  userEmail: z.email(),
  userAvatar: z.string().nullable(),
  role: workspaceTeamRoleSchema,
  joinedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const teamInviteStatusSchema = z.enum(["pending", "accepted", "declined"]);

export const teamInviteSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  teamName: z.string().min(1),
  teamImage: z.string().nullable(),
  invitedUserId: z.string().min(1),
  invitedEmail: z.email(),
  invitedName: z.string().min(1),
  invitedAvatar: z.string().nullable(),
  invitedByUserId: z.string().min(1),
  invitedByName: z.string().min(1),
  invitedByAvatar: z.string().nullable(),
  role: workspaceTeamRoleSchema,
  status: teamInviteStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  respondedAt: z.string().datetime().nullable(),
});

export const teamSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  image: z.string().nullable(),
  role: workspaceTeamRoleSchema,
  createdByUserId: z.string().min(1),
  updatedAt: z.string().datetime(),
});

export const teamDetailSchema = teamSummarySchema.extend({
  members: z.array(teamMemberSchema),
  pendingInvites: z.array(teamInviteSchema),
});

export const teamCreateInputSchema = z.object({
  name: z.string().trim().min(1, "Team name is required").max(120),
});

export const teamGetInputSchema = z.object({
  teamId: z.string().min(1),
});

export const teamUpdateInputSchema = z
  .object({
    teamId: z.string().min(1),
    name: z.string().trim().min(1, "Team name is required").max(120).optional(),
    image: z.string().nullable().optional(),
  })
  .refine((value) => value.name !== undefined || value.image !== undefined, {
    message: "Provide a name and/or image to update",
  });

export const teamDeleteInputSchema = z.object({
  teamId: z.string().min(1),
});

export const teamAddMemberInputSchema = z.object({
  teamId: z.string().min(1),
  userEmail: z.email("Enter a valid email address"),
  role: workspaceTeamRoleSchema,
});

export const teamUpdateMemberRoleInputSchema = z.object({
  teamId: z.string().min(1),
  userId: z.string().min(1),
  role: workspaceTeamRoleSchema,
});

export const teamRemoveMemberInputSchema = z.object({
  teamId: z.string().min(1),
  userId: z.string().min(1),
});

export const teamInviteIdInputSchema = z.object({
  inviteId: z.string().min(1),
});

/** Form-only schemas (omit server-assigned teamId). */
export const teamCreateFormSchema = teamCreateInputSchema;
export const teamAddMemberFormSchema = teamAddMemberInputSchema.omit({ teamId: true });
