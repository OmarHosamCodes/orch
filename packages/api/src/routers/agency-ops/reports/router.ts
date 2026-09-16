import { z } from "zod";
import { protectedProProcedure } from "../../../procedures";
import {
  teamScopedInputSchema,
  agencyTimeEntrySchema,
  reportsSummarySchema,
  reportsDashboardSummarySchema,
  reportsInputSchema,
  reportsPreviewSchema,
  savedReportActivityActionSchema,
  savedReportSnapshotInputSchema,
  savedReportRecordSchema,
  savedReportListItemSchema,
  savedReportActivityRecordSchema,
} from "../shared/schemas";
import {
  getAgencyReportsSummary,
  getAgencyDashboardSummary,
  exportAgencyReportsCsv,
  listAllAgencyTimeEntries,
  updateAnyAgencyTimeEntry,
  deleteAnyAgencyTimeEntry,
  duplicateAnyAgencyTimeEntry,
} from "./service";
import { getAgencyReportPreview } from "./preview-service";
import {
  createSavedReport,
  listSavedReports,
  getSavedReport,
  updateSavedReport,
  deleteSavedReport,
  listSavedReportActivity,
} from "./saved-reports-service";

export const reportsRouter = {
  reports: {
    dashboard: protectedProProcedure
      .input(reportsInputSchema)
      .handler(async ({ context, input }) => {
        return z
          .object({
            summary: reportsDashboardSummarySchema,
          })
          .parse(await getAgencyDashboardSummary(context.session.user.id, input));
      }),
    summary: protectedProProcedure.input(reportsInputSchema).handler(async ({ context, input }) => {
      return z
        .object({
          summary: reportsSummarySchema,
        })
        .parse(await getAgencyReportsSummary(context.session.user.id, input));
    }),
    preview: protectedProProcedure.input(reportsInputSchema).handler(async ({ context, input }) => {
      return reportsPreviewSchema.parse(
        await getAgencyReportPreview(context.session.user.id, input),
      );
    }),
    exportCsv: protectedProProcedure
      .input(reportsInputSchema)
      .handler(async ({ context, input }) => {
        return z
          .object({
            contentType: z.literal("text/csv"),
            fileName: z.string().min(1),
            csv: z.string(),
            totalRows: z.number().int().nonnegative(),
          })
          .parse(await exportAgencyReportsCsv(context.session.user.id, input));
      }),
    listEntries: protectedProProcedure
      .input(
        reportsInputSchema.extend({
          page: z.number().int().min(1).optional(),
          // ponytail: 5k bulk page for Reports table paint; upgrade path is server-side grouping.
          pageSize: z.number().int().min(1).max(5_000).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            items: z.array(agencyTimeEntrySchema),
            page: z.number().int().min(1),
            pageSize: z.number().int().min(1),
            total: z.number().int().nonnegative(),
          })
          .parse(await listAllAgencyTimeEntries(context.session.user.id, input));
      }),
    updateEntry: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          entryId: z.string().min(1),
          startAt: z.string().datetime().optional(),
          endAt: z.string().datetime().optional(),
          description: z.string().max(2_000).optional(),
          projectId: z.string().min(1).optional(),
          taskId: z.string().min(1).nullable().optional(),
          tagIds: z.array(z.string().min(1)).optional(),
          links: z.array(z.string().max(2_048)).max(10).optional(),
          isBillable: z.boolean().optional(),
          isWaste: z.boolean().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        const entry = agencyTimeEntrySchema.parse(
          await updateAnyAgencyTimeEntry(context.session.user.id, input),
        );
        return entry;
      }),
    deleteEntry: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          entryId: z.string().min(1),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            entryId: z.string().min(1),
            deleted: z.boolean(),
          })
          .parse(await deleteAnyAgencyTimeEntry(context.session.user.id, input));
      }),
    duplicateEntry: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          entryId: z.string().min(1),
        }),
      )
      .handler(async ({ context, input }) => {
        return agencyTimeEntrySchema.parse(
          await duplicateAnyAgencyTimeEntry(context.session.user.id, input),
        );
      }),
    saved: {
      create: protectedProProcedure
        .input(savedReportSnapshotInputSchema)
        .handler(async ({ context, input }) => {
          return savedReportRecordSchema.parse(
            await createSavedReport(context.session.user.id, input),
          );
        }),
      list: protectedProProcedure
        .input(teamScopedInputSchema)
        .handler(async ({ context, input }) => {
          return z
            .object({ items: z.array(savedReportListItemSchema) })
            .parse(await listSavedReports(context.session.user.id, input));
        }),
      get: protectedProProcedure
        .input(teamScopedInputSchema.extend({ reportId: z.string().min(1) }))
        .handler(async ({ context, input }) => {
          return savedReportRecordSchema.parse(
            await getSavedReport(context.session.user.id, input),
          );
        }),
      update: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            reportId: z.string().min(1),
            name: z.string().trim().min(1).max(240).optional(),
            excludedEntryIds: z.array(z.string().min(1)).optional(),
            actions: z
              .array(
                z.object({
                  action: savedReportActivityActionSchema,
                  payload: z.record(z.string(), z.unknown()).optional(),
                }),
              )
              .optional(),
          }),
        )
        .handler(async ({ context, input }) => {
          return savedReportRecordSchema.parse(
            await updateSavedReport(context.session.user.id, input),
          );
        }),
      delete: protectedProProcedure
        .input(teamScopedInputSchema.extend({ reportId: z.string().min(1) }))
        .handler(async ({ context, input }) => {
          return z
            .object({ reportId: z.string().min(1), deleted: z.boolean() })
            .parse(await deleteSavedReport(context.session.user.id, input));
        }),
      listActivity: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            reportId: z.string().min(1),
            limit: z.number().int().min(1).max(50).optional(),
          }),
        )
        .handler(async ({ context, input }) => {
          return z
            .object({ items: z.array(savedReportActivityRecordSchema) })
            .parse(await listSavedReportActivity(context.session.user.id, input));
        }),
    },
  },
};
