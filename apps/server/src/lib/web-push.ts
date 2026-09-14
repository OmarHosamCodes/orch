import { db } from "@orch/db";
import { pushSubscription } from "@orch/db/schema";
import { env, primaryCorsOrigin } from "@orch/env/server";
import { eq } from "drizzle-orm";
import webpush from "web-push";

import type { NotificationRecord } from "@orch/api/schemas/notifications";
import { notificationPushCopy } from "@orch/api/routers/notifications/copy";
import { listPushSubscriptionsForUser } from "@orch/api/routers/notifications/service";

import { shouldDropPushSubscription } from "./web-push-errors";

let configured = false;

function ensureWebPushConfigured() {
  if (configured) return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    return false;
  }

  webpush.setVapidDetails(
    env.VAPID_SUBJECT ?? `mailto:ops@${new URL(primaryCorsOrigin).hostname}`,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY,
  );
  configured = true;
  return true;
}

export async function sendWebPushForNotification(notification: NotificationRecord) {
  if (!ensureWebPushConfigured()) return;

  const subscriptions = await listPushSubscriptionsForUser(notification.recipientUserId, {});
  if (subscriptions.length === 0) return;

  const copy = notificationPushCopy(notification);
  const payload = JSON.stringify({
    title: copy.title,
    body: copy.body,
    url: copy.url,
    notificationId: notification.id,
    teamId: notification.teamId,
  });

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload,
        );
      } catch (error) {
        if (shouldDropPushSubscription(error)) {
          await db
            .delete(pushSubscription)
            .where(eq(pushSubscription.endpoint, subscription.endpoint));
        } else {
          console.error("Web push delivery failed:", error);
        }
      }
    }),
  );
}
