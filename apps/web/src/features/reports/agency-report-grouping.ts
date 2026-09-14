import type { AgencyTimeEntry } from "@orch/api/schemas/agency-ops";
import { isWasteLabel, resolveEntryWaste } from "@orch/api/routers/agency-ops/shared/waste-helpers";
import {
  joinedTimeEntryLinkUrls,
  mergeTimeEntryLinkRecords,
} from "@/features/shared/agency-time-entry-links";

import { type AgencyReportShowWaste } from "@/features/reports/agency-report-show-waste";

export type AgencyReportEntry = AgencyTimeEntry;

type AgencyReportWasteSources = {
  projects: boolean;
  tasks: boolean;
  entries: boolean;
};

type ProjectGroup = {
  projectId: string;
  projectName: string;
  rows: AgencyReportEntry[];
  totalSeconds: number;
};

type ClientGroup = {
  clientId: string;
  clientName: string;
  projects: ProjectGroup[];
  totalSeconds: number;
};

export type AggregatedReportRow = {
  key: string;
  projectId: string;
  projectName: string;
  taskId: string | null;
  taskTitle: string | null;
  taskIsWaste: boolean | null;
  description: string;
  links: Array<{ id: string; url: string }>;
  userId: string;
  userName: string;
  durationSeconds: number;
  entryCount: number;
  entries: AgencyReportEntry[];
};

type AggregatedProjectGroup = {
  projectId: string;
  projectName: string;
  rows: AggregatedReportRow[];
  totalSeconds: number;
};

export type DisplayClientGroup = {
  clientId: string;
  clientName: string;
  projects: AggregatedProjectGroup[];
  totalSeconds: number;
};

function sortRowsByStartedAt(rows: AgencyReportEntry[]): AgencyReportEntry[] {
  return [...rows].sort(
    (left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime(),
  );
}

function groupEntriesByClient(entries: AgencyReportEntry[]): ClientGroup[] {
  const byClient = new Map<
    string,
    {
      clientId: string;
      clientName: string;
      byProject: Map<string, ProjectGroup>;
      totalSeconds: number;
    }
  >();

  for (const entry of entries) {
    let client = byClient.get(entry.clientId);
    if (!client) {
      client = {
        clientId: entry.clientId,
        clientName: entry.clientName,
        byProject: new Map(),
        totalSeconds: 0,
      };
      byClient.set(entry.clientId, client);
    }

    client.totalSeconds += entry.durationSeconds;

    let project = client.byProject.get(entry.projectId);
    if (!project) {
      project = {
        projectId: entry.projectId,
        projectName: entry.projectName,
        rows: [],
        totalSeconds: 0,
      };
      client.byProject.set(entry.projectId, project);
    }
    project.totalSeconds += entry.durationSeconds;
    project.rows.push(entry);
  }

  return [...byClient.values()]
    .sort((left, right) => left.clientName.localeCompare(right.clientName))
    .map((client) => ({
      clientId: client.clientId,
      clientName: client.clientName,
      totalSeconds: client.totalSeconds,
      projects: [...client.byProject.values()]
        .sort((left, right) => left.projectName.localeCompare(right.projectName))
        .map((project) => ({
          ...project,
          rows: sortRowsByStartedAt(project.rows),
        })),
    }));
}

export type ReportRowAggregationOptions = {
  /** When true, collapse same task titles within a project (Create Report). */
  mergeSameTaskNames?: boolean;
};

function normalizeReportTaskTitle(taskTitle: string | null | undefined): string {
  return (taskTitle ?? "").trim();
}

export function reportRowAggregationKey(
  entry: AgencyReportEntry,
  options: ReportRowAggregationOptions = {},
): string {
  if (options.mergeSameTaskNames) {
    return [entry.projectId, normalizeReportTaskTitle(entry.taskTitle)].join("\0");
  }
  return [entry.projectId, entry.taskId ?? "", entry.userId, entry.description.trim()].join("\0");
}

/** Join unique assignees in entry order with a middle-dot separator. */
function joinedReportRowAssignees(
  entries: readonly Pick<AgencyReportEntry, "userId" | "userName">[],
): { userId: string; userName: string } {
  const first = entries[0]!;
  const names: string[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.userId)) continue;
    seen.add(entry.userId);
    names.push(entry.userName);
  }
  if (names.length <= 1) {
    return { userId: first.userId, userName: first.userName };
  }
  return {
    userId: first.userId,
    userName: names.join(" · "),
  };
}

/** Join non-empty trimmed descriptions in entry order, unique, with a middle-dot separator. */
function joinedReportRowDescriptions(
  entries: readonly Pick<AgencyReportEntry, "description">[],
): string {
  const parts: string[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const trimmed = (entry.description ?? "").trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    parts.push(trimmed);
  }
  return parts.join(" · ");
}

/** Join unique link URLs in entry order with a middle-dot separator. */
export function joinedReportRowLinks(entries: readonly Pick<AgencyReportEntry, "links">[]): string {
  return joinedTimeEntryLinkUrls(entries);
}

export function aggregateSimilarReportRows(
  rows: AgencyReportEntry[],
  options: ReportRowAggregationOptions = {},
): AggregatedReportRow[] {
  const mergeSameTaskNames = options.mergeSameTaskNames === true;
  const byKey = new Map<string, AggregatedReportRow>();

  for (const entry of rows) {
    const key = reportRowAggregationKey(entry, options);
    let aggregated = byKey.get(key);
    if (!aggregated) {
      aggregated = {
        key,
        projectId: entry.projectId,
        projectName: entry.projectName,
        taskId: entry.taskId,
        taskTitle: mergeSameTaskNames
          ? normalizeReportTaskTitle(entry.taskTitle) || null
          : entry.taskTitle,
        taskIsWaste: entry.taskIsWaste,
        description: entry.description,
        links: [...(entry.links ?? [])],
        userId: entry.userId,
        userName: entry.userName,
        durationSeconds: 0,
        entryCount: 0,
        entries: [],
      };
      byKey.set(key, aggregated);
    }
    aggregated.durationSeconds += entry.durationSeconds;
    aggregated.entryCount += 1;
    aggregated.entries.push(entry);
    if (mergeSameTaskNames) {
      if (entry.taskIsWaste === true) {
        aggregated.taskIsWaste = true;
      }
    }
  }

  for (const aggregated of byKey.values()) {
    if (mergeSameTaskNames) {
      const assignee = joinedReportRowAssignees(aggregated.entries);
      aggregated.userId = assignee.userId;
      aggregated.userName = assignee.userName;
      aggregated.description = joinedReportRowDescriptions(aggregated.entries);
    }
    if (aggregated.entries.length > 1) {
      aggregated.links = mergeTimeEntryLinkRecords(aggregated.entries);
    }
  }

  return [...byKey.values()].sort((left, right) => {
    const byTask = reportSimilarTaskKey(left).localeCompare(reportSimilarTaskKey(right));
    if (byTask !== 0) return byTask;
    if (mergeSameTaskNames) {
      return left.userName.localeCompare(right.userName);
    }
    const byDescription = left.description.localeCompare(right.description);
    if (byDescription !== 0) return byDescription;
    return left.userName.localeCompare(right.userName);
  });
}

/** Same-name tasks within a project — used to keep similar rows consecutive. */
function reportSimilarTaskKey(row: Pick<AggregatedReportRow, "taskTitle">): string {
  return normalizeReportTaskTitle(row.taskTitle).toLocaleLowerCase();
}

/** Alternating 0/1 band per similar-task cluster (resets at the start of `rows`). */
export function reportSimilarTaskStripeIndexes(
  rows: readonly Pick<AggregatedReportRow, "taskTitle">[],
): Array<0 | 1> {
  let stripe: 0 | 1 = 0;
  let previous: string | undefined;
  return rows.map((row) => {
    const key = reportSimilarTaskKey(row);
    if (previous !== undefined && key !== previous) {
      stripe = stripe === 0 ? 1 : 0;
    }
    previous = key;
    return stripe;
  });
}

/** Two-tone row fill so similar-task clusters scan as blocks. */
export function reportSimilarTaskStripeClass(stripe: 0 | 1): string {
  return stripe === 1 ? "bg-muted/40 hover:bg-muted/55" : "bg-default hover:bg-muted/30";
}

export function groupEntriesForDisplay(
  entries: AgencyReportEntry[],
  options: ReportRowAggregationOptions = {},
): DisplayClientGroup[] {
  return groupEntriesByClient(entries).map((client) => ({
    clientId: client.clientId,
    clientName: client.clientName,
    totalSeconds: client.totalSeconds,
    projects: client.projects.map((project) => {
      const rows = aggregateSimilarReportRows(project.rows, options);
      return {
        projectId: project.projectId,
        projectName: project.projectName,
        rows,
        totalSeconds: rows.reduce((sum, row) => sum + row.durationSeconds, 0),
      };
    }),
  }));
}

function reportEntryWasteSources(
  entry: Pick<AgencyReportEntry, "projectName" | "taskTitle" | "taskIsWaste" | "isWaste">,
): AgencyReportWasteSources {
  return {
    projects: isWasteLabel(entry.projectName),
    tasks: entry.taskIsWaste === true || isWasteLabel(entry.taskTitle),
    entries: entry.isWaste === true,
  };
}

function isAnyWasteSource(sources: AgencyReportWasteSources): boolean {
  return sources.projects || sources.tasks || sources.entries;
}

export function isReportEntryWaste(
  entry:
    | Pick<AgencyReportEntry, "projectName" | "taskTitle" | "taskIsWaste" | "isWaste">
    | Pick<AggregatedReportRow, "projectName" | "taskTitle" | "taskIsWaste" | "entries">,
): boolean {
  if ("entries" in entry) {
    if (entry.entries.length === 0) {
      return resolveEntryWaste({
        projectName: entry.projectName,
        taskTitle: entry.taskTitle,
        taskIsWaste: entry.taskIsWaste,
        isWaste: false,
      });
    }
    return entry.entries.every((item) => resolveEntryWaste(item));
  }
  return resolveEntryWaste(entry);
}

function isReportEntryWasteVisible(
  entry: Pick<AgencyReportEntry, "projectName" | "taskTitle" | "taskIsWaste" | "isWaste">,
  showWaste: AgencyReportShowWaste,
): boolean {
  const sources = reportEntryWasteSources(entry);
  if (!isAnyWasteSource(sources)) return true;
  return (
    (showWaste.projects && sources.projects) ||
    (showWaste.tasks && sources.tasks) ||
    (showWaste.entries && sources.entries)
  );
}

export function filterEntriesByShowWaste(
  entries: readonly AgencyReportEntry[],
  showWaste: AgencyReportShowWaste,
): AgencyReportEntry[] {
  return entries.filter((entry) => isReportEntryWasteVisible(entry, showWaste));
}

export function applyReportEntriesWaste(
  entries: readonly AgencyReportEntry[],
  entryIds: ReadonlySet<string>,
  isWaste: boolean,
): AgencyReportEntry[] {
  if (entryIds.size === 0) return [...entries];
  return entries.map((entry) => (entryIds.has(entry.id) ? { ...entry, isWaste } : entry));
}

/** Muted ink for waste text cells — not project, waste control, or row actions. */
export const reportEntryWasteTextClass = "text-muted";
