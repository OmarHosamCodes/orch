import { z } from "zod";
import { protectedProProcedure } from "../../../procedures";
import {
  teamScopedInputSchema,
  agencyProjectTaskBlueprintSchema,
  agencyProjectTaskSchema,
  agencyEntityIconKeySchema,
} from "../shared/schemas";
import {
  listAgencyProjectTasks,
  createAgencyProjectTask,
  completeAgencyProjectTaskForMember,
  updateAgencyProjectTaskBlueprint,
  updateAgencyProjectTask,
  deleteAgencyProjectTask,
} from "./service";

export const tasksRouter = {
  projectTasks: {
    list: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          projectId: z.string().min(1).optional(),
          status: z.enum(["open", "in_progress", "done", "archived"]).optional(),
          statuses: z.array(z.enum(["open", "in_progress", "done", "archived"])).optional(),
          assigneeUserId: z.string().min(1).optional(),
          delegatedByUserId: z.string().min(1).optional(),
          journeyDiscoveryForUserId: z.string().min(1).optional(),
          search: z.string().optional(),
          page: z.number().int().min(1).optional(),
          pageSize: z.number().int().min(1).max(100).optional(),
          detail: z.enum(["full", "chooser"]).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            items: z.array(agencyProjectTaskSchema),
            page: z.number().int().min(1),
            pageSize: z.number().int().min(1),
            total: z.number().int().nonnegative(),
          })
          .parse(await listAgencyProjectTasks(context.session.user.id, input));
      }),
    create: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          projectId: z.string().min(1),
          title: z.string().trim().min(1).max(240),
          iconKey: agencyEntityIconKeySchema.nullable().optional(),
          status: z.enum(["open", "in_progress", "done", "archived"]).optional(),
          assignedToTeam: z.boolean().optional(),
          assigneeUserIds: z.array(z.string().min(1)).optional(),
          dueDate: z.string().datetime().optional(),
          estimateMinutes: z.number().int().min(1).max(1440).nullable().optional(),
          description: z.string().max(4000).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        const task = agencyProjectTaskSchema.parse(
          await createAgencyProjectTask(context.session.user.id, input),
        );
        return task;
      }),
    update: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          taskId: z.string().min(1),
          title: z.string().trim().min(1).max(240).optional(),
          iconKey: agencyEntityIconKeySchema.nullable().optional(),
          status: z.enum(["open", "in_progress", "done", "archived"]).optional(),
          assignedToTeam: z.boolean().optional(),
          assigneeUserIds: z.array(z.string().min(1)).optional(),
          dueDate: z.string().datetime().nullable().optional(),
          estimateMinutes: z.number().int().min(1).max(1440).nullable().optional(),
          isWaste: z.boolean().optional(),
          billableRateAmount: z.number().int().nonnegative().nullable().optional(),
          currency: z.string().min(1).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        const task = agencyProjectTaskSchema.parse(
          await updateAgencyProjectTask(context.session.user.id, input),
        );
        return task;
      }),
    delete: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          taskId: z.string().min(1),
        }),
      )
      .handler(async ({ context, input }) => {
        const result = z
          .object({
            taskId: z.string().min(1),
            deleted: z.boolean(),
          })
          .parse(await deleteAgencyProjectTask(context.session.user.id, input));
        return result;
      }),
    completeForMember: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          taskId: z.string().min(1),
        }),
      )
      .handler(async ({ context, input }) => {
        const task = agencyProjectTaskSchema.parse(
          await completeAgencyProjectTaskForMember(context.session.user.id, input),
        );
        return task;
      }),
    updateBlueprint: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          blueprintId: z.string().min(1),
          description: z.string().max(4000),
        }),
      )
      .handler(async ({ context, input }) => {
        const blueprint = agencyProjectTaskBlueprintSchema.parse(
          await updateAgencyProjectTaskBlueprint(context.session.user.id, input),
        );
        return blueprint;
      }),
  },
};
