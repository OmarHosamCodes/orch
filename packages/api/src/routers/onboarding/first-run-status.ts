export type FirstRunStatus = "create" | "join" | "done";

export function resolveFirstRunStatus(input: {
  completedAt: Date | string | null;
  membershipCount: number;
}): FirstRunStatus {
  if (input.completedAt) {
    return "done";
  }

  return input.membershipCount >= 1 ? "join" : "create";
}
