export function scheduleIdle(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(
      () => {
        callback();
      },
      { timeout: 250 },
    );
    return () => window.cancelIdleCallback(id);
  }

  const timeoutId = window.setTimeout(callback, 1);
  return () => window.clearTimeout(timeoutId);
}
