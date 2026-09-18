import { z } from "zod";

import { protectedProcedure } from "../../../procedures";
import { agencyDepartmentSchema, teamScopedInputSchema } from "../shared/schemas";
import {
  createAgencyDepartment,
  deleteAgencyDepartment,
  listAgencyDepartments,
  updateAgencyDepartment,
} from "./service";

const departmentNameSchema = z.string().trim().min(1).max(50);

export const departmentsRouter = {
  departments: {
    list: protectedProcedure.input(teamScopedInputSchema).handler(async ({ context, input }) => {
      return z
        .object({ items: z.array(agencyDepartmentSchema) })
        .parse(await listAgencyDepartments(context.session.user.id, input));
    }),
    create: protectedProcedure
      .input(teamScopedInputSchema.extend({ name: departmentNameSchema }))
      .handler(async ({ context, input }) => {
        return agencyDepartmentSchema.parse(
          await createAgencyDepartment(context.session.user.id, input),
        );
      }),
    update: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          departmentId: z.string().min(1),
          name: departmentNameSchema,
        }),
      )
      .handler(async ({ context, input }) => {
        return agencyDepartmentSchema.parse(
          await updateAgencyDepartment(context.session.user.id, input),
        );
      }),
    delete: protectedProcedure
      .input(teamScopedInputSchema.extend({ departmentId: z.string().min(1) }))
      .handler(async ({ context, input }) => {
        return z
          .object({ departmentId: z.string().min(1), deleted: z.boolean() })
          .parse(await deleteAgencyDepartment(context.session.user.id, input));
      }),
  },
};
