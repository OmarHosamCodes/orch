import { z } from "zod";
import { protectedProcedure } from "../../../procedures";
import { teamScopedInputSchema } from "../shared/schemas";
import {
  listMemberCapacity,
  listTeamActivityHeat,
  listTeamLeave,
  setMemberCapacity,
} from "./service";
import { memberLeaveSchema, memberProfileHeatDaySchema } from "../member-profile/schemas";
import {
  getTenurePolicy,
  upsertTenurePolicy,
  listTenureProfiles,
  upsertTenureProfile,
  listTenureExemptions,
  upsertTenureExemption,
  deleteTenureExemption,
  listTenureSummary,
  getTenureMember,
} from "./tenure-service";

const tenurePolicySchema = z.object({
  fiscalYearStartMonth: z.number().int().min(1).max(12),
  fiscalYearStartDay: z.number().int().min(1).max(31),
  quarterlyMinHours: z.number().int().positive(),
  monthlyMinHours: z.number().int().positive(),
  penaltyMonths: z.number().int().positive(),
  internDurationMonths: z.number().int().nonnegative(),
  internDurationWeeks: z.number().int().nonnegative(),
  requiredDailyHours: z.number().int().min(1).max(24),
  weekStartsOn: z.number().int().min(0).max(6),
  weekendDurationDays: z.number().int().min(1).max(3),
  offDayReduceHours: z.number().min(0).max(24),
  policyEffectiveFrom: z.string().datetime(),
  enabled: z.boolean(),
});

export const resourcingRouter = {
  leave: {
    list: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({ items: z.array(memberLeaveSchema) })
          .parse(await listTeamLeave(context.session.user.id, input));
      }),
  },
  activityHeat: {
    list: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          utcOffsetMinutes: z.number().int().min(-840).max(840),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            members: z.array(
              z.object({
                userId: z.string().min(1),
                userName: z.string().min(1),
                days: z.array(memberProfileHeatDaySchema),
              }),
            ),
          })
          .parse(await listTeamActivityHeat(context.session.user.id, input));
      }),
  },
  capacity: {
    list: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          weekStart: z.string().datetime(),
          weeks: z.number().int().min(1).max(12),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            weeks: z.array(
              z.object({
                weekStart: z.string().datetime(),
                members: z.array(
                  z.object({
                    userId: z.string().min(1),
                    userName: z.string().min(1),
                    capacitySeconds: z.number().int().nonnegative(),
                    bookedSeconds: z.number().int().nonnegative(),
                    loggedSeconds: z.number().int().nonnegative(),
                  }),
                ),
              }),
            ),
          })
          .parse(await listMemberCapacity(context.session.user.id, input));
      }),
    set: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          userId: z.string().min(1),
          weekStart: z.string().datetime(),
          capacitySeconds: z.number().int().nonnegative(),
        }),
      )
      .handler(async ({ context, input }) => {
        const result = z
          .object({
            userId: z.string().min(1),
            weekStart: z.string().datetime(),
            capacitySeconds: z.number().int().nonnegative(),
          })
          .parse(await setMemberCapacity(context.session.user.id, input));
        return result;
      }),
  },

  tenure: {
    policy: {
      get: protectedProcedure.input(teamScopedInputSchema).handler(async ({ context, input }) => {
        return z
          .object({
            policy: tenurePolicySchema.nullable(),
          })
          .parse(await getTenurePolicy(context.session.user.id, input));
      }),
      upsert: protectedProcedure
        .input(teamScopedInputSchema.extend(tenurePolicySchema.shape))
        .handler(async ({ context, input }) => {
          return z
            .object({
              policy: tenurePolicySchema,
            })
            .parse(await upsertTenurePolicy(context.session.user.id, input));
        }),
    },
    profiles: {
      list: protectedProcedure.input(teamScopedInputSchema).handler(async ({ context, input }) => {
        return z
          .object({
            items: z.array(
              z.object({
                userId: z.string().min(1),
                userName: z.string().min(1),
                userEmail: z.email(),
                joinedAt: z.string().datetime(),
                internStart: z.string().datetime().nullable(),
                internEnd: z.string().datetime().nullable(),
                internCountsTowardTenure: z.boolean(),
                internExemptFromQuarterMin: z.boolean(),
                notes: z.string().nullable(),
              }),
            ),
          })
          .parse(await listTenureProfiles(context.session.user.id, input));
      }),
      upsert: protectedProcedure
        .input(
          teamScopedInputSchema.extend({
            userId: z.string().min(1),
            internStart: z.string().datetime().nullable().optional(),
            internEnd: z.string().datetime().nullable().optional(),
            internCountsTowardTenure: z.boolean().optional(),
            internExemptFromQuarterMin: z.boolean().optional(),
            notes: z.string().nullable().optional(),
          }),
        )
        .handler(async ({ context, input }) => {
          return z
            .object({
              profile: z.object({
                userId: z.string().min(1),
                userName: z.string().min(1),
                userEmail: z.email(),
                joinedAt: z.string().datetime(),
                internStart: z.string().datetime().nullable(),
                internEnd: z.string().datetime().nullable(),
                internCountsTowardTenure: z.boolean(),
                internExemptFromQuarterMin: z.boolean(),
                notes: z.string().nullable(),
              }),
            })
            .parse(await upsertTenureProfile(context.session.user.id, input));
        }),
    },
    exemptions: {
      list: protectedProcedure
        .input(
          teamScopedInputSchema.extend({
            fiscalYear: z.number().int().optional(),
          }),
        )
        .handler(async ({ context, input }) => {
          return z
            .object({
              items: z.array(
                z.object({
                  id: z.string().min(1),
                  type: z.enum([
                    "team_holiday",
                    "member_waiver",
                    "member_reduced_min",
                    "member_frozen_month",
                  ]),
                  fiscalYear: z.number().int(),
                  fiscalQuarter: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
                  userId: z.string().nullable(),
                  userName: z.string().nullable(),
                  reducedMinHours: z.number().int().nullable(),
                  frozenMonth: z.number().int().nullable(),
                  reason: z.string().nullable(),
                  createdAt: z.string().datetime(),
                }),
              ),
            })
            .parse(await listTenureExemptions(context.session.user.id, input));
        }),
      upsert: protectedProcedure
        .input(
          teamScopedInputSchema.extend({
            id: z.string().min(1).optional(),
            type: z.enum([
              "team_holiday",
              "member_waiver",
              "member_reduced_min",
              "member_frozen_month",
            ]),
            fiscalYear: z.number().int(),
            fiscalQuarter: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
            userId: z.string().nullable().optional(),
            reducedMinHours: z.number().int().positive().nullable().optional(),
            frozenMonth: z.number().int().min(1).max(12).nullable().optional(),
            reason: z.string().nullable().optional(),
          }),
        )
        .handler(async ({ context, input }) => {
          return z
            .object({
              exemption: z.object({
                id: z.string().min(1),
                type: z.enum([
                  "team_holiday",
                  "member_waiver",
                  "member_reduced_min",
                  "member_frozen_month",
                ]),
                fiscalYear: z.number().int(),
                fiscalQuarter: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
                userId: z.string().nullable(),
                userName: z.string().nullable(),
                reducedMinHours: z.number().int().nullable(),
                frozenMonth: z.number().int().nullable(),
                reason: z.string().nullable(),
                createdAt: z.string().datetime(),
              }),
            })
            .parse(await upsertTenureExemption(context.session.user.id, input));
        }),
      delete: protectedProcedure
        .input(
          teamScopedInputSchema.extend({
            exemptionId: z.string().min(1),
          }),
        )
        .handler(async ({ context, input }) => {
          return z
            .object({ ok: z.literal(true) })
            .parse(await deleteTenureExemption(context.session.user.id, input));
        }),
    },
    summary: {
      list: protectedProcedure.input(teamScopedInputSchema).handler(async ({ context, input }) => {
        return z
          .object({
            policyEnabled: z.boolean(),
            items: z.array(
              z.object({
                userId: z.string().min(1),
                userName: z.string().min(1),
                userEmail: z.email(),
                joinedAt: z.string().datetime(),
                departmentId: z.string().nullable(),
                departmentName: z.string().nullable(),
                employmentType: z.string().nullable(),
                workModel: z.string().nullable(),
                status: z.enum(["active", "inactive"]).nullable(),
                hasContact: z.boolean(),
                internStart: z.string().datetime().nullable(),
                internEnd: z.string().datetime().nullable(),
                internDerived: z.boolean(),
                rawTenureMonths: z.number().int().nonnegative(),
                rawTenureLabel: z.string().min(1),
                penaltyMonths: z.number().int().nonnegative(),
                netTenureMonths: z.number().int().nonnegative(),
                netTenureLabel: z.string().min(1),
                failedQuarterCount: z.number().int().nonnegative(),
                awaitingFirstEntry: z.boolean(),
                currentQuarter: z
                  .object({
                    fiscalYear: z.number().int(),
                    fiscalQuarter: z.union([
                      z.literal(1),
                      z.literal(2),
                      z.literal(3),
                      z.literal(4),
                    ]),
                    label: z.string().min(1),
                    requiredHours: z.number().nonnegative(),
                    loggedHours: z.number().nonnegative(),
                    status: z.enum([
                      "intern",
                      "waived",
                      "met",
                      "missed",
                      "on-track",
                      "at-risk",
                      "in-progress",
                      "skipped",
                    ]),
                    penaltyMonthsApplied: z.number().int().nonnegative(),
                    prorated: z.boolean(),
                  })
                  .nullable(),
              }),
            ),
          })
          .parse(await listTenureSummary(context.session.user.id, input));
      }),
    },
    member: {
      get: protectedProcedure
        .input(
          teamScopedInputSchema.extend({
            userId: z.string().min(1),
          }),
        )
        .handler(async ({ context, input }) => {
          return z
            .object({
              policy: tenurePolicySchema.nullable(),
              member: z.object({
                userId: z.string().min(1),
                userName: z.string().min(1),
                userEmail: z.email(),
                joinedAt: z.string().datetime(),
                departmentId: z.string().nullable(),
                departmentName: z.string().nullable(),
                employmentType: z.string().nullable(),
                workModel: z.string().nullable(),
                status: z.enum(["active", "inactive"]).nullable(),
                hasContact: z.boolean(),
                internStart: z.string().datetime().nullable(),
                internEnd: z.string().datetime().nullable(),
                internDerived: z.boolean(),
                internCountsTowardTenure: z.boolean(),
                internExemptFromQuarterMin: z.boolean(),
                notes: z.string().nullable(),
                rawTenureMonths: z.number().int().nonnegative(),
                rawTenureLabel: z.string().min(1),
                penaltyMonths: z.number().int().nonnegative(),
                netTenureMonths: z.number().int().nonnegative(),
                netTenureLabel: z.string().min(1),
                failedQuarterCount: z.number().int().nonnegative(),
                awaitingFirstEntry: z.boolean(),
                currentQuarter: z
                  .object({
                    fiscalYear: z.number().int(),
                    fiscalQuarter: z.union([
                      z.literal(1),
                      z.literal(2),
                      z.literal(3),
                      z.literal(4),
                    ]),
                    label: z.string().min(1),
                    periodStart: z.string().datetime(),
                    periodEnd: z.string().datetime(),
                    requiredHours: z.number().nonnegative(),
                    loggedHours: z.number().nonnegative(),
                    status: z.enum([
                      "intern",
                      "waived",
                      "met",
                      "missed",
                      "on-track",
                      "at-risk",
                      "in-progress",
                      "skipped",
                    ]),
                    penaltyMonthsApplied: z.number().int().nonnegative(),
                    prorated: z.boolean(),
                  })
                  .nullable(),
                quarters: z.array(
                  z.object({
                    fiscalYear: z.number().int(),
                    fiscalQuarter: z.union([
                      z.literal(1),
                      z.literal(2),
                      z.literal(3),
                      z.literal(4),
                    ]),
                    label: z.string().min(1),
                    periodStart: z.string().datetime(),
                    periodEnd: z.string().datetime(),
                    requiredHours: z.number().nonnegative(),
                    loggedHours: z.number().nonnegative(),
                    status: z.enum([
                      "intern",
                      "waived",
                      "met",
                      "missed",
                      "on-track",
                      "at-risk",
                      "in-progress",
                      "skipped",
                    ]),
                    penaltyMonthsApplied: z.number().int().nonnegative(),
                    prorated: z.boolean(),
                  }),
                ),
              }),
            })
            .parse(await getTenureMember(context.session.user.id, input));
        }),
    },
  },
};
