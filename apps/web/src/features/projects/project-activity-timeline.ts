/** Day-grouped, merged activity clusters for the project Split Inspector. */

export type ProjectActivitySort = "newest" | "oldest" | "longest";

export type ProjectActivityEntry = {
  id: string;
  userId: string;
  userName: string;
  description: string;
  startedAt: string;
  durationSeconds: number;
};

export type ProjectActivityCluster = {
  id: string;
  userId: string;
  userName: string;
  description: string;
  startedAt: string;
  durationSeconds: number;
  count: number;
};

export type ProjectActivityDay = {
  dayKey: string;
  label: string;
  totalSeconds: number;
  items: ProjectActivityCluster[];
};

function localDayKey(iso: string): string {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function projectActivityDayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function projectActivityTimeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function mergeKey(entry: ProjectActivityEntry): string {
  return `${entry.userId}||${entry.description.trim().toLocaleLowerCase()}`;
}

function clusterEntries(entries: ProjectActivityEntry[]): ProjectActivityCluster[] {
  const clusters = new Map<string, ProjectActivityCluster>();
  for (const entry of entries) {
    const key = mergeKey(entry);
    const existing = clusters.get(key);
    if (!existing) {
      clusters.set(key, {
        id: entry.id,
        userId: entry.userId,
        userName: entry.userName,
        description: entry.description,
        startedAt: entry.startedAt,
        durationSeconds: entry.durationSeconds,
        count: 1,
      });
      continue;
    }
    existing.durationSeconds += entry.durationSeconds;
    existing.count += 1;
    if (new Date(entry.startedAt).getTime() > new Date(existing.startedAt).getTime()) {
      existing.startedAt = entry.startedAt;
      existing.id = entry.id;
    }
  }
  return [...clusters.values()];
}

export function buildProjectActivityTimeline(
  entries: ProjectActivityEntry[],
  sort: ProjectActivitySort,
): ProjectActivityDay[] {
  const byDay = new Map<string, ProjectActivityEntry[]>();
  for (const entry of entries) {
    const key = localDayKey(entry.startedAt);
    const list = byDay.get(key) ?? [];
    list.push(entry);
    byDay.set(key, list);
  }

  const days: ProjectActivityDay[] = [...byDay.entries()].map(([dayKey, dayEntries]) => {
    const items = clusterEntries(dayEntries);
    items.sort((left, right) => {
      if (sort === "longest") {
        return right.durationSeconds - left.durationSeconds;
      }
      const delta =
        new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime();
      return sort === "oldest" ? -delta : delta;
    });
    return {
      dayKey,
      label: projectActivityDayLabel(dayEntries[0]?.startedAt ?? `${dayKey}T00:00:00`),
      totalSeconds: items.reduce((sum, item) => sum + item.durationSeconds, 0),
      items,
    };
  });

  days.sort((left, right) => {
    if (sort === "longest") return right.totalSeconds - left.totalSeconds;
    const delta = right.dayKey.localeCompare(left.dayKey);
    return sort === "oldest" ? -delta : delta;
  });

  return days;
}
