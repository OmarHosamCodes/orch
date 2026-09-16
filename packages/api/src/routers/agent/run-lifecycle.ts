import { db } from "@orch/db";
import { agentRun } from "@orch/db/schema";
import { and, eq, lt } from "drizzle-orm";

export const AGENT_SUBSCRIBE_POLL_MS = 100;
export const AGENT_TOKEN_FLUSH_MS = 50;
export const AGENT_TOKEN_FLUSH_CHARS = 32;
export const STALE_RUN_MS = 120_000;

export function waitForSubscribePoll(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

export function createRunAbortRegistry(): {
  attach(runId: string, controller: AbortController): void;
  abort(runId: string): void;
  has(runId: string): boolean;
} {
  const controllers = new Map<string, AbortController>();

  return {
    attach(runId, controller) {
      controllers.set(runId, controller);
    },
    abort(runId) {
      const controller = controllers.get(runId);
      controllers.delete(runId);
      controller?.abort();
    },
    has(runId) {
      return controllers.has(runId);
    },
  };
}

export const agentRunAbortRegistry = createRunAbortRegistry();

export function createTokenCoalescer(options: {
  flushMs: number;
  flushChars: number;
  onFlush: (delta: string) => Promise<void>;
}): { push(delta: string): void; flush(): Promise<void> } {
  let buffer = "";
  let timer: ReturnType<typeof setTimeout> | null = null;
  let chain = Promise.resolve();

  const clearTimer = () => {
    if (!timer) {
      return;
    }
    clearTimeout(timer);
    timer = null;
  };

  const emit = async () => {
    clearTimer();
    const delta = buffer;
    buffer = "";
    if (!delta) {
      return;
    }
    await options.onFlush(delta);
  };

  const enqueueEmit = () => {
    chain = chain.then(emit, emit);
    return chain;
  };

  return {
    push(delta) {
      buffer += delta;
      if (buffer.length >= options.flushChars) {
        void enqueueEmit();
        return;
      }
      if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          void enqueueEmit();
        }, options.flushMs);
      }
    },
    async flush() {
      await enqueueEmit();
    },
  };
}

export function bindListenerSignal(input: {
  listener?: AbortSignal;
  onUnsubscribe: () => void;
  onCancelRun: () => void;
}): { shouldAbortOpenRouter: boolean } {
  if (!input.listener?.aborted) {
    input.listener?.addEventListener(
      "abort",
      () => {
        input.onUnsubscribe();
      },
      { once: true },
    );
    return { shouldAbortOpenRouter: false };
  }

  input.onUnsubscribe();
  return { shouldAbortOpenRouter: false };
}

export async function recoverStaleRuns(now = new Date()): Promise<{ failedCount: number }> {
  const cutoff = new Date(now.getTime() - STALE_RUN_MS);
  const stale = await db
    .select({ id: agentRun.id })
    .from(agentRun)
    .where(and(eq(agentRun.status, "running"), lt(agentRun.heartbeatAt, cutoff)));

  if (stale.length === 0) {
    return { failedCount: 0 };
  }

  await db
    .update(agentRun)
    .set({
      status: "failed",
      error: "stale_run",
      finishedAt: now,
      heartbeatAt: now,
    })
    .where(and(eq(agentRun.status, "running"), lt(agentRun.heartbeatAt, cutoff)));

  for (const row of stale) {
    agentRunAbortRegistry.abort(row.id);
  }

  return { failedCount: stale.length };
}
