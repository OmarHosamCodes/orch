import { z } from "zod";

import { protectedProcedure } from "../../procedures";
import {
  notificationDeliverySettingsSchema,
  notificationDeliverySettingsSetInputSchema,
  notificationListInputSchema,
  notificationMarkReadInputSchema,
  notificationPreferenceSchema,
  notificationRecordSchema,
  pushSubscribeInputSchema,
  pushUnsubscribeInputSchema,
  teamScopedNotificationInputSchema,
} from "./schemas";
import {
  getNotificationPreferences,
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationsSeen,
  setNotificationDeliverySettings,
  setNotificationPreferences,
  subscribePush,
  unsubscribePush,
} from "./service";

export const notificationsRouter = {
  list: protectedProcedure
    .input(notificationListInputSchema)
    .handler(async ({ context, input }) => {
      const result = await listNotifications(context.session.user.id, input);
      return z
        .object({
          items: z.array(notificationRecordSchema),
          nextCursor: z.string().datetime().nullable(),
        })
        .parse(result);
    }),
  unreadCount: protectedProcedure
    .input(teamScopedNotificationInputSchema)
    .handler(async ({ context, input }) => {
      return z
        .object({
          count: z.number().int().nonnegative(),
          actionCount: z.number().int().nonnegative(),
        })
        .parse(await getUnreadNotificationCount(context.session.user.id, input));
    }),
  markSeen: protectedProcedure
    .input(teamScopedNotificationInputSchema)
    .handler(async ({ context, input }) => {
      return z
        .object({ updated: z.boolean() })
        .parse(await markNotificationsSeen(context.session.user.id, input));
    }),
  markRead: protectedProcedure
    .input(notificationMarkReadInputSchema)
    .handler(async ({ context, input }) => {
      return z
        .object({ notificationId: z.string().min(1), read: z.boolean() })
        .parse(await markNotificationRead(context.session.user.id, input));
    }),
  markAllRead: protectedProcedure
    .input(teamScopedNotificationInputSchema)
    .handler(async ({ context, input }) => {
      return z
        .object({ updated: z.boolean() })
        .parse(await markAllNotificationsRead(context.session.user.id, input));
    }),
  preferences: {
    get: protectedProcedure
      .input(teamScopedNotificationInputSchema)
      .handler(async ({ context, input }) => {
        const result = await getNotificationPreferences(context.session.user.id, input);
        return z
          .object({
            items: z.array(notificationPreferenceSchema),
            delivery: notificationDeliverySettingsSchema,
          })
          .parse(result);
      }),
    set: protectedProcedure
      .input(
        teamScopedNotificationInputSchema.extend({
          preferences: z.array(notificationPreferenceSchema).min(1),
        }),
      )
      .handler(async ({ context, input }) => {
        const result = await setNotificationPreferences(context.session.user.id, input);
        return z
          .object({
            items: z.array(notificationPreferenceSchema),
            delivery: notificationDeliverySettingsSchema,
          })
          .parse(result);
      }),
    setDelivery: protectedProcedure
      .input(notificationDeliverySettingsSetInputSchema)
      .handler(async ({ context, input }) => {
        const result = await setNotificationDeliverySettings(context.session.user.id, input);
        return z
          .object({
            items: z.array(notificationPreferenceSchema),
            delivery: notificationDeliverySettingsSchema,
          })
          .parse(result);
      }),
  },
  push: {
    subscribe: protectedProcedure
      .input(pushSubscribeInputSchema)
      .handler(async ({ context, input }) => {
        return z
          .object({ subscribed: z.boolean() })
          .parse(await subscribePush(context.session.user.id, input));
      }),
    unsubscribe: protectedProcedure
      .input(pushUnsubscribeInputSchema)
      .handler(async ({ context, input }) => {
        return z
          .object({ unsubscribed: z.boolean() })
          .parse(await unsubscribePush(context.session.user.id, input));
      }),
  },
};
