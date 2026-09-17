import { z } from "zod";
import { protectedProcedure } from "../../../procedures";
import { teamScopedInputSchema } from "../shared/schemas";
import {
  createAgencyProjectTemplate,
  deleteAgencyProjectTemplate,
  listAgencyProjectTemplates,
  updateAgencyProjectTemplate,
} from "./service";

const templateMilestoneSchema = z.object({
  title: z.string().trim().min(1).max(240),
  assigneeUserIds: z.array(z.string().min(1)).optional(),
});

const agencyProjectTemplateSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  name: z.string().min(1),
  milestones: z.array(templateMilestoneSchema),
  milestoneCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const projectTemplatesRouter = {
  projectTemplates: {
    list: protectedProcedure.input(teamScopedInputSchema).handler(async ({ context, input }) => {
      return z
        .object({ items: z.array(agencyProjectTemplateSchema) })
        .parse(await listAgencyProjectTemplates(context.session.user.id, input));
    }),
    create: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          name: z.string().trim().min(1).max(160),
          milestones: z.array(templateMilestoneSchema).min(1),
        }),
      )
      .handler(async ({ context, input }) => {
        return agencyProjectTemplateSchema.parse(
          await createAgencyProjectTemplate(context.session.user.id, input),
        );
      }),
    update: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          templateId: z.string().min(1),
          name: z.string().trim().min(1).max(160).optional(),
          milestones: z.array(templateMilestoneSchema).min(1).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return agencyProjectTemplateSchema.parse(
          await updateAgencyProjectTemplate(context.session.user.id, input),
        );
      }),
    delete: protectedProcedure
      .input(teamScopedInputSchema.extend({ templateId: z.string().min(1) }))
      .handler(async ({ context, input }) => {
        return z
          .object({ templateId: z.string().min(1), deleted: z.boolean() })
          .parse(await deleteAgencyProjectTemplate(context.session.user.id, input));
      }),
  },
};
