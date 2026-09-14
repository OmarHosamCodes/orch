export type CalendarDayStatus = "present" | "leave" | "holiday" | "weekend" | "empty";

export type CalendarDayMarker = "logged" | "off" | "holiday" | "weekend" | "none";

export type CalendarDayMenuAction =
  | { kind: "view_activity" }
  | { kind: "select_range" }
  | { kind: "add_off_day" }
  | { kind: "remove_off_day"; leaveId: string };

export function calendarDayMarker(status: CalendarDayStatus): CalendarDayMarker {
  switch (status) {
    case "present":
      return "logged";
    case "leave":
      return "off";
    case "holiday":
      return "holiday";
    case "weekend":
      return "weekend";
    case "empty":
      return "none";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function calendarDayStatusLabel(status: CalendarDayStatus): string {
  switch (status) {
    case "present":
      return "logged time";
    case "leave":
      return "off day";
    case "holiday":
      return "team holiday";
    case "weekend":
      return "weekend";
    case "empty":
      return "no hours logged";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/** Role-aware calendar menu — not a blanket canManageLeave check. */
export function resolveCalendarDayActions(input: {
  inMonth: boolean;
  status: CalendarDayStatus;
  leaveId: string | null;
  hasActivity: boolean;
  isSelf: boolean;
  isManager: boolean;
}): CalendarDayMenuAction[] {
  if (!input.inMonth) return [];

  const actions: CalendarDayMenuAction[] = [];
  if (input.hasActivity) {
    actions.push({ kind: "view_activity" });
  }

  const canEditOffDays = input.isSelf || input.isManager;
  if (canEditOffDays) {
    actions.push({ kind: "select_range" }, { kind: "add_off_day" });
    if (
      (input.status === "leave" || (input.status === "holiday" && input.isManager)) &&
      input.leaveId
    ) {
      actions.push({ kind: "remove_off_day", leaveId: input.leaveId });
    }
  }

  return actions;
}
