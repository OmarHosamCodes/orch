import { z } from "zod";
import { protectedProProcedure } from "../../../procedures";
import {
  teamScopedInputSchema,
  agencyClientCategorySchema,
  agencyClientSchema,
} from "../shared/schemas";
import {
  listAgencyClients,
  listAgencyClientsBookIndex,
  getAgencyClient,
  getAgencyClientCommercialSummary,
  createAgencyClient,
  updateAgencyClient,
  archiveAgencyClient,
  unarchiveAgencyClient,
  getClientContact,
  upsertClientContact,
} from "./service";

const clientCommercialSummarySchema = z.object({
  client: agencyClientSchema,
  contact: z
    .object({
      id: z.string().min(1),
      name: z.string(),
      email: z.string(),
      phone: z.string(),
    })
    .nullable(),
  activeProjectCount: z.number().int().nonnegative(),
  trashedProjectCount: z.number().int().nonnegative(),
  weekDurationSeconds: z.number().int().nonnegative(),
  monthDurationSeconds: z.number().int().nonnegative(),
  monthUninvoicedDurationSeconds: z.number().int().nonnegative(),
  billing: z.object({
    canView: z.boolean(),
    openInvoiceCount: z.number().int().nonnegative(),
    outstandingAmount: z.number().int().nonnegative(),
    currency: z.string().min(1),
    recentInvoices: z.array(
      z.object({
        id: z.string().min(1),
        number: z.string().min(1),
        status: z.string().min(1),
        amount: z.number().int().nonnegative(),
        remainingAmount: z.number().int().nonnegative(),
        currency: z.string().min(1),
        periodStart: z.string().datetime(),
        periodEnd: z.string().datetime(),
      }),
    ),
  }),
});

export const clientsRouter = {
  clients: {
    list: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          includeArchived: z.boolean().optional(),
          archiveFilter: z.enum(["all", "archived", "nonarchived"]).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({ items: z.array(agencyClientSchema) })
          .parse(await listAgencyClients(context.session.user.id, input));
      }),
    bookIndex: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          includeArchived: z.boolean().optional(),
          archiveFilter: z.enum(["all", "archived", "nonarchived"]).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            canViewBilling: z.boolean(),
            items: z.array(
              z.object({
                clientId: z.string().min(1),
                weekDurationSeconds: z.number().int().nonnegative(),
                monthUninvoicedDurationSeconds: z.number().int().nonnegative(),
                outstandingAmount: z.number().int().nonnegative(),
                billingCurrency: z.string().min(1),
                contactName: z.string(),
                contactEmail: z.string(),
                contactPhone: z.string(),
              }),
            ),
          })
          .parse(await listAgencyClientsBookIndex(context.session.user.id, input));
      }),
    get: protectedProProcedure
      .input(teamScopedInputSchema.extend({ clientId: z.string().min(1) }))
      .handler(async ({ context, input }) => {
        return agencyClientSchema.parse(await getAgencyClient(context.session.user.id, input));
      }),
    commercialSummary: protectedProProcedure
      .input(teamScopedInputSchema.extend({ clientId: z.string().min(1) }))
      .handler(async ({ context, input }) => {
        return clientCommercialSummarySchema.parse(
          await getAgencyClientCommercialSummary(context.session.user.id, input),
        );
      }),
    create: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          name: z.string().trim().min(1).max(120),
          category: agencyClientCategorySchema.optional(),
          billableRateAmount: z.number().int().nonnegative().nullable().optional(),
          currency: z.string().min(1).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        const client = agencyClientSchema.parse(
          await createAgencyClient(context.session.user.id, input),
        );
        return client;
      }),
    update: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          clientId: z.string().min(1),
          name: z.string().trim().min(1).max(120).optional(),
          category: agencyClientCategorySchema.optional(),
          billableRateAmount: z.number().int().nonnegative().nullable().optional(),
          currency: z.string().min(1).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        const client = agencyClientSchema.parse(
          await updateAgencyClient(context.session.user.id, input),
        );
        return client;
      }),
    archive: protectedProProcedure
      .input(teamScopedInputSchema.extend({ clientId: z.string().min(1) }))
      .handler(async ({ context, input }) => {
        const result = z
          .object({ clientId: z.string().min(1), archived: z.boolean() })
          .parse(await archiveAgencyClient(context.session.user.id, input));
        return result;
      }),
    unarchive: protectedProProcedure
      .input(teamScopedInputSchema.extend({ clientId: z.string().min(1) }))
      .handler(async ({ context, input }) => {
        const result = z
          .object({ clientId: z.string().min(1), archived: z.boolean() })
          .parse(await unarchiveAgencyClient(context.session.user.id, input));
        return result;
      }),
  },

  contacts: {
    get: protectedProProcedure
      .input(teamScopedInputSchema.extend({ clientId: z.string().min(1) }))
      .handler(async ({ context, input }) => {
        const contactSchema = z
          .object({
            id: z.string().min(1),
            teamId: z.string().min(1),
            clientId: z.string().min(1),
            name: z.string(),
            email: z.string(),
            phone: z.string(),
            createdAt: z.string().datetime(),
            updatedAt: z.string().datetime(),
          })
          .nullable();
        return contactSchema.parse(await getClientContact(context.session.user.id, input));
      }),
    upsert: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          clientId: z.string().min(1),
          name: z.string().trim().max(200).optional(),
          email: z.string().trim().email().or(z.literal("")).optional(),
          phone: z.string().trim().max(50).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        const contactSchema = z.object({
          id: z.string().min(1),
          teamId: z.string().min(1),
          clientId: z.string().min(1),
          name: z.string(),
          email: z.string(),
          phone: z.string(),
          createdAt: z.string().datetime(),
          updatedAt: z.string().datetime(),
        });
        const contact = contactSchema.parse(
          await upsertClientContact(context.session.user.id, input),
        );
        return contact;
      }),
  },
};
