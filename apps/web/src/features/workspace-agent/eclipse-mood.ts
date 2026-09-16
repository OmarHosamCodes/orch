export type EclipseMood = "idle" | "working" | "done" | "needs-you" | "error";

export type EclipseMoodInput = {
  isStreaming: boolean;
  error: string | null;
  unreadCount: number;
  pendingProposalCount: number;
  lastRunSucceededAt: number | null;
  now: number;
};

export const ECLIPSE_DONE_WINDOW_MS = 8_000;

export function resolveEclipseMood(input: EclipseMoodInput): EclipseMood {
  if (input.error) return "error";
  if (input.isStreaming) return "working";
  if (input.unreadCount > 0 || input.pendingProposalCount > 0) return "needs-you";
  if (
    input.lastRunSucceededAt !== null &&
    input.now - input.lastRunSucceededAt < ECLIPSE_DONE_WINDOW_MS
  ) {
    return "done";
  }
  return "idle";
}

export function eclipseMoodLabel(mood: EclipseMood): string {
  switch (mood) {
    case "idle":
      return "Orch";
    case "working":
      return "Working";
    case "done":
      return "Done";
    case "needs-you":
      return "Needs you";
    case "error":
      return "Something went wrong";
    default: {
      const _exhaustive: never = mood;
      return _exhaustive;
    }
  }
}
