import type { RangePreset } from "@/features/shared/command-bar/range-preset-chooser";

import type {
  AgencyMemberProfileViewModel,
  EmploymentType,
  LeaveType,
  WorkModel,
} from "@/features/member-profile/agency-member-profile-types";

export function leaveTypeLabel(type: LeaveType): string {
  switch (type) {
    case "pto":
      return "PTO";
    case "sick":
      return "Sick";
    case "team_holiday":
      return "Team holiday";
    case "other":
      return "Other";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function leaveRangeLabel(startDate: string, endDate: string): string {
  const start = new Date(`${startDate}T12:00:00.000Z`);
  const end = new Date(`${endDate}T12:00:00.000Z`);
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  };
  if (startDate === endDate) return start.toLocaleDateString(undefined, opts);
  return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`;
}

export function todayKey(utcOffsetMinutes: number) {
  const localMs = Date.now() - utcOffsetMinutes * 60_000;
  const d = new Date(localMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDayParts(
  dateKey: string,
  today: string,
): { title: string; subtitle: string } {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  const weekday = date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  if (dateKey === today) return { title: "Today", subtitle: weekday };
  const yesterday = new Date(`${today}T00:00:00.000Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yKey = yesterday.toISOString().slice(0, 10);
  if (dateKey === yKey) return { title: "Yesterday", subtitle: weekday };
  return {
    title: weekday,
    subtitle: date.toLocaleDateString(undefined, { year: "numeric", timeZone: "UTC" }),
  };
}

export function activityKindLabel(eventType: "time_logged" | "waste_marked" | "leave") {
  switch (eventType) {
    case "time_logged":
      return "Activity";
    case "waste_marked":
      return "Waste";
    case "leave":
      return "Off day";
    default: {
      const _exhaustive: never = eventType;
      return _exhaustive;
    }
  }
}

export function shortHours(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function weekContainingCaption(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  return `Week of ${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })}`;
}

export function roleLabel(role: string) {
  switch (role) {
    case "owner":
      return "Owner";
    case "editor":
      return "Editor";
    case "viewer":
      return "Viewer";
    default:
      return role;
  }
}

export function employmentTypeLabel(value: EmploymentType | null) {
  switch (value) {
    case "full_time":
      return "Full-time";
    case "part_time":
      return "Part-time";
    case "contractor":
      return "Contractor";
    case "intern":
      return "Intern";
    case null:
      return null;
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

export function workModelLabel(value: WorkModel | null) {
  switch (value) {
    case "onsite":
      return "Onsite";
    case "hybrid":
      return "Hybrid";
    case "remote":
      return "Remote";
    case null:
      return null;
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

export function normalizeGenderDraft(value: string | null | undefined): string {
  const key = value?.trim().toLowerCase() ?? "";
  if (key === "male" || key === "female") return key;
  return "";
}

export function genderDisplayLabel(value: string | null): string | null {
  switch (normalizeGenderDraft(value)) {
    case "male":
      return "Male";
    case "female":
      return "Female";
    default:
      return value?.trim() || null;
  }
}

export function emptyHrDraft(): AgencyMemberProfileViewModel["hrDraft"] {
  return {
    status: "active",
    departmentId: "",
    employmentType: "",
    workModel: "",
    gender: "",
    dateOfBirth: "",
    phone: "",
    address: "",
  };
}

export function rangePresetDisplayLabel(
  preset: RangePreset,
  tenurePeriodLabel: string | null,
  customFrom: string,
  customTo: string,
): string {
  switch (preset) {
    case "tenure":
      return tenurePeriodLabel?.trim() || "Tenure";
    case "today":
      return "Today";
    case "week":
      return "This week";
    case "month":
      return "This month";
    case "last30":
      return "Last 30 days";
    case "custom":
      return customFrom && customTo ? `${customFrom} → ${customTo}` : "Custom";
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
}
