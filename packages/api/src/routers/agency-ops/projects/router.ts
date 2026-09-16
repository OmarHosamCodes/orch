import { z } from "zod";
import { protectedProProcedure } from "../../../procedures";
import {
  teamScopedInputSchema,
  agencyProjectSchema,
  agencyProjectJourneySchema,
  agencyProjectColorHueIdSchema,
  agencyProjectTrashFilterSchema,
  agencyEntityIconKeySchema,
} from "../shared/schemas";
import {
  listAgencyProjects,
  createAgencyProject,
  createAgencyProjectWithJourney,
  updateAgencyProject,
  deleteAgencyProject,
  restoreAgencyProject,
  getAgencyProjectJourney,
  updateAgencyProjectJourneySteps,
  addAgencyProjectJourneyStep,
  previewRemoveAgencyProjectJourneyStep,
  removeAgencyProjectJourneyStep,
} from "./service";

export const projectsRouter = {
  projects: {
    list: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          clientId: z.string().min(1).optional(),
          archiveFilter: z.enum(["all", "archived", "nonarchived"]).optional(),
          trashFilter: agencyProjectTrashFilterSchema.optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({ items: z.array(agencyProjectSchema) })
          .parse(await listAgencyProjects(context.session.user.id, input));
      }),
    create: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          clientId: z.string().min(1),
          name: z.string().trim().min(1).max(160),
          colorHueId: agencyProjectColorHueIdSchema.nullable().optional(),
          iconKey: agencyEntityIconKeySchema.nullable().optional(),
          templateId: z.string().min(1).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        const project = agencyProjectSchema.parse(
          await createAgencyProject(context.session.user.id, input),
        );
        return project;
      }),
    createWithJourney: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          clientId: z.string().min(1),
          name: z.string().trim().min(1).max(160),
          colorHueId: agencyProjectColorHueIdSchema.nullable().optional(),
          iconKey: agencyEntityIconKeySchema.nullable().optional(),
          milestones: z
            .array(
              z.object({
                title: z.string().trim().min(1).max(240),
                assigneeUserIds: z.array(z.string().min(1)).default([]),
              }),
            )
            .min(1),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            project: agencyProjectSchema,
            journey: agencyProjectJourneySchema,
          })
          .parse(await createAgencyProjectWithJourney(context.session.user.id, input));
      }),
    journey: {
      get: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            projectId: z.string().min(1),
          }),
        )
        .handler(async ({ context, input }) => {
          return agencyProjectJourneySchema.parse(
            await getAgencyProjectJourney(context.session.user.id, input),
          );
        }),
      updateSteps: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            projectId: z.string().min(1),
            steps: z.array(
              z.object({
                id: z.string().min(1),
                sortOrder: z.number().int().nonnegative().optional(),
                label: z.string().trim().min(1).max(240).optional(),
              }),
            ),
          }),
        )
        .handler(async ({ context, input }) => {
          return agencyProjectJourneySchema.parse(
            await updateAgencyProjectJourneySteps(context.session.user.id, input),
          );
        }),
      addStep: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            projectId: z.string().min(1),
            label: z.string().trim().min(1).max(240),
            assigneeUserIds: z.array(z.string().min(1)).optional(),
            sortOrder: z.number().int().nonnegative().optional(),
            stepKind: z.enum(["milestone", "checkpoint"]).optional(),
          }),
        )
        .handler(async ({ context, input }) => {
          return agencyProjectJourneySchema.parse(
            await addAgencyProjectJourneyStep(context.session.user.id, input),
          );
        }),
      removeStep: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            projectId: z.string().min(1),
            stepId: z.string().min(1),
          }),
        )
        .handler(async ({ context, input }) => {
          return agencyProjectJourneySchema.parse(
            await removeAgencyProjectJourneyStep(context.session.user.id, input),
          );
        }),
      previewRemoveStep: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            projectId: z.string().min(1),
            stepId: z.string().min(1),
          }),
        )
        .handler(async ({ context, input }) => {
          return z
            .object({
              stepId: z.string().min(1),
              label: z.string().min(1),
              timeEntryCount: z.number().int().nonnegative(),
            })
            .parse(await previewRemoveAgencyProjectJourneyStep(context.session.user.id, input));
        }),
    },
    update: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          projectId: z.string().min(1),
          clientId: z.string().min(1).optional(),
          name: z.string().trim().min(1).max(160).optional(),
          colorHueId: agencyProjectColorHueIdSchema.nullable().optional(),
          iconKey: agencyEntityIconKeySchema.nullable().optional(),
          billableRateAmount: z.number().int().nonnegative().nullable().optional(),
          currency: z.string().length(3).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        const project = agencyProjectSchema.parse(
          await updateAgencyProject(context.session.user.id, input),
        );
        return project;
      }),
    delete: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          projectId: z.string().min(1),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({ projectId: z.string().min(1), deleted: z.literal(true) })
          .parse(await deleteAgencyProject(context.session.user.id, input));
      }),
    restore: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          projectId: z.string().min(1),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({ projectId: z.string().min(1), deleted: z.literal(false) })
          .parse(await restoreAgencyProject(context.session.user.id, input));
      }),
  },
};
