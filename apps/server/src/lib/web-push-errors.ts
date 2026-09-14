/** FCM/web-push failures that mean the endpoint is dead and should be dropped. */
export function shouldDropPushSubscription(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const statusCode = "statusCode" in error ? Number(error.statusCode) : null;
  if (statusCode === 404 || statusCode === 410 || statusCode === 400) return true;
  const body = "body" in error && typeof error.body === "string" ? error.body : "";
  return statusCode === 500 && /do not retry/i.test(body);
}
