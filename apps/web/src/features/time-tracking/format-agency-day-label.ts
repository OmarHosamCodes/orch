const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year!, month! - 1, day);
}

/** Smart day label: Today, Yesterday, or "Tue, Jun 16". */
export function formatAgencyDayLabel(dateKey: string, referenceDate = new Date()): string {
  const target = parseDateKey(dateKey);
  const todayKey = toLocalDateKey(referenceDate);
  if (dateKey === todayKey) return "Today";

  const yesterday = new Date(referenceDate);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateKey === toLocalDateKey(yesterday)) return "Yesterday";

  return weekdayFormatter.format(target);
}

export function localDateKeyFromIso(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  return toLocalDateKey(parsed);
}

const weekRangeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

/** Team-week-start local week key (YYYY-MM-DD) for the given day key. */
export function getLocalWeekStartKey(dateKey: string, weekStartsOn = 1): string {
  const date = parseDateKey(dateKey);
  const dayOfWeek = date.getDay();
  const diff = (dayOfWeek - weekStartsOn + 7) % 7;
  const weekStart = new Date(date);
  weekStart.setDate(weekStart.getDate() - diff);
  return toLocalDateKey(weekStart);
}

/** Smart week label: This week, Last week, or "Jun 16 - Jun 22". */
export function formatAgencyWeekLabel(
  weekStartKey: string,
  referenceDate = new Date(),
  weekStartsOn = 1,
): string {
  const thisWeekStart = getLocalWeekStartKey(toLocalDateKey(referenceDate), weekStartsOn);
  if (weekStartKey === thisWeekStart) return "This week";

  const lastWeekRef = new Date(referenceDate);
  lastWeekRef.setDate(lastWeekRef.getDate() - 7);
  const lastWeekStart = getLocalWeekStartKey(toLocalDateKey(lastWeekRef), weekStartsOn);
  if (weekStartKey === lastWeekStart) return "Last week";

  const weekStart = parseDateKey(weekStartKey);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  return `${weekRangeFormatter.format(weekStart)} - ${weekRangeFormatter.format(weekEnd)}`;
}
