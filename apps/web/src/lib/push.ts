import { orpcClient } from "@/lib/orpc";

const PUSH_DISMISSED_KEY = "orch:push-prompt-dismissed";

function getVapidPublicKey() {
  return import.meta.env.VITE_PUBLIC_VAPID_KEY as string | undefined;
}

export function isPushPromptDismissed() {
  try {
    return localStorage.getItem(PUSH_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissPushPrompt() {
  try {
    localStorage.setItem(PUSH_DISMISSED_KEY, "1");
  } catch {
    // ignore
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }
  return output;
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export async function subscribeToPushNotifications() {
  const vapidKey = getVapidPublicKey();
  if (!vapidKey) {
    throw new Error("Push is not configured for this environment.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { granted: false as const };
  }

  const registration = (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready);
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    }));

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error("Push subscription is missing keys.");
  }

  await orpcClient.notifications.push.subscribe({
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  });

  return { granted: true as const };
}

export function canUsePushNotifications() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    Boolean(getVapidPublicKey())
  );
}

export function pushPermissionState(): NotificationPermission | "unsupported" {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}
