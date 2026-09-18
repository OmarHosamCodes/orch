export function shouldBlockTrackerChrome(input: {
  hasTeam: boolean;
  projectsPending: boolean;
  tasksPending: boolean;
  taskCount: number;
}): boolean {
  void input.projectsPending;
  void input.tasksPending;
  void input.taskCount;
  return !input.hasTeam;
}
