import { join } from "node:path";
import { normalizeTaskTitle } from "@orch/api/schemas/agency-ops";
import { assignEntityIconOnWrite } from "@orch/api/routers/agency-ops/shared/entity-icon-catalog";
import { db } from "@orch/db";
import {
  agencyOpsClient,
  agencyOpsProject,
  agencyOpsProjectTask,
  agencyOpsTimeEntry,
} from "@orch/db/schema";
import { eq, inArray } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScrapeManifest = {
  workspaceId: string;
  scrapedAt: string;
  memberCount: number;
  members: Array<{
    userId: string;
    name: string;
    email: string;
    startDate: string | null;
    entryCount: number;
    skipped: boolean;
  }>;
};

export type ClockifyMember = ScrapeManifest["members"][number];

type ParsedClockifyEntry = {
  clockifyEntryId: string;
  clockifyUserId: string;
  description: string;
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
  taskId: string | null;
  taskName: string | null;
  startedAt: Date;
  endedAt: Date;
  durationSeconds: number;
};

export type ImportCatalog = {
  clients: Map<string, { id: string; name: string }>;
  projects: Map<string, { id: string; name: string; clientId: string }>;
  tasks: Map<string, { id: string; title: string; projectId: string }>;
  timeEntries: ParsedClockifyEntry[];
  skipped: Array<{ reason: string; clockifyUserId?: string; clockifyEntryId?: string }>;
  skippedByBefore: number;
  duplicateEntryIds: number;
  taskConflicts: Array<{
    incomingId: string;
    existingId: string;
    title: string;
    projectId: string;
  }>;
};

export type BuildCatalogOptions = {
  /** Exclude entries with startedAt on or after this instant (UTC midnight). */
  before?: Date;
};

export type WorkspaceCatalogFile = {
  workspaceId: string;
  scrapedAt: string;
  clients: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string; clientId: string | null; clientName: string | null }>;
  tasks: Array<{ id: string; name: string; projectId: string }>;
};

export type ImportStats = {
  clientsInserted: number;
  projectsInserted: number;
  tasksInserted: number;
  timeEntriesInserted: number;
  skipped: number;
  skippedByBefore: number;
  duplicateEntryIds: number;
  taskConflictsRemapped: number;
  clientsAlreadyExist: number;
  projectsAlreadyExist: number;
  tasksAlreadyExist: number;
  timeEntriesAlreadyExist: number;
};

export type ImportContext = {
  teamId: string;
  createdByUserId: string;
  userIdByClockifyUserId: Map<string, string>;
  dryRun: boolean;
  /** Skip client/project/task inserts (catalog already imported). */
  entriesOnly?: boolean;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NO_CLIENT_ID = "__no_client__";
const NO_CLIENT_NAME = "(No client)";
const NO_PROJECT_ID = "__no_project__";
const NO_PROJECT_NAME = "(No project)";
const BATCH_SIZE = 500;

export function parseBeforeDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid --before value: ${value}. Use YYYY-MM-DD.`);
  }
  return new Date(`${value}T00:00:00.000Z`);
}

function taskTitleKey(projectId: string, title: string): string {
  return `${projectId}|${normalizeTaskTitle(title)}`;
}

// ---------------------------------------------------------------------------
// ID helpers
// ---------------------------------------------------------------------------

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function clockifyClientId(clockifyId: string): string {
  return `clockify-client-${clockifyId}`;
}

function clockifyProjectId(clockifyId: string): string {
  return `clockify-project-${clockifyId}`;
}

function clockifyTaskId(clockifyId: string): string {
  return `clockify-task-${clockifyId}`;
}

function clockifyEntryId(clockifyId: string): string {
  return `clockify-entry-${clockifyId}`;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readNestedName(record: Record<string, unknown> | null): string | null {
  if (!record) return null;
  return readString(record.name) ?? readString(record.Name);
}

function readNestedId(record: Record<string, unknown> | null): string | null {
  if (!record) return null;
  return readString(record.id) ?? readString(record._id);
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

export function defaultOutputDir(): string {
  return join(import.meta.dir, "..", "..", "..", "..", "..", "Clockify-Scrapper", "output");
}

export async function loadManifest(outputDir: string): Promise<ScrapeManifest> {
  const manifestPath = join(outputDir, "manifest.json");
  const file = Bun.file(manifestPath);
  if (!(await file.exists())) {
    throw new Error(`manifest.json not found at ${manifestPath}`);
  }
  return (await file.json()) as ScrapeManifest;
}

export async function loadWorkspaceCatalog(
  outputDir: string,
): Promise<WorkspaceCatalogFile | null> {
  const catalogPath = join(outputDir, "catalog.json");
  const file = Bun.file(catalogPath);
  if (!(await file.exists())) {
    return null;
  }
  return (await file.json()) as WorkspaceCatalogFile;
}

function mergeWorkspaceCatalog(
  clients: ImportCatalog["clients"],
  projects: ImportCatalog["projects"],
  tasks: ImportCatalog["tasks"],
  catalog: WorkspaceCatalogFile,
): void {
  for (const client of catalog.clients) {
    if (!clients.has(client.id)) {
      clients.set(client.id, {
        id: clockifyClientId(client.id),
        name: client.name,
      });
    }
  }

  if (!clients.has(NO_CLIENT_ID)) {
    clients.set(NO_CLIENT_ID, {
      id: clockifyClientId(NO_CLIENT_ID),
      name: NO_CLIENT_NAME,
    });
  }

  if (!projects.has(NO_PROJECT_ID)) {
    projects.set(NO_PROJECT_ID, {
      id: clockifyProjectId(NO_PROJECT_ID),
      name: NO_PROJECT_NAME,
      clientId: clockifyClientId(NO_CLIENT_ID),
    });
  }

  for (const project of catalog.projects) {
    const rawClientId = project.clientId?.trim();
    const clientKey = rawClientId && rawClientId.length > 0 ? rawClientId : NO_CLIENT_ID;
    if (rawClientId && !clients.has(rawClientId)) {
      clients.set(rawClientId, {
        id: clockifyClientId(rawClientId),
        name: project.clientName?.trim() || rawClientId,
      });
    }

    if (!projects.has(project.id)) {
      projects.set(project.id, {
        id: clockifyProjectId(project.id),
        name: project.name,
        clientId: clockifyClientId(clientKey),
      });
    }
  }

  for (const task of catalog.tasks) {
    if (!tasks.has(task.id)) {
      tasks.set(task.id, {
        id: clockifyTaskId(task.id),
        title: task.name,
        projectId: clockifyProjectId(task.projectId),
      });
    }
  }
}

async function readJsonlLines(
  outputDir: string,
  clockifyUserId: string,
  filename: string,
): Promise<unknown[]> {
  const path = join(outputDir, clockifyUserId, filename);
  const file = Bun.file(path);
  if (!(await file.exists())) {
    return [];
  }
  const text = await file.text();
  if (!text.trim()) {
    return [];
  }
  const records: unknown[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      records.push(JSON.parse(trimmed));
    } catch {
      // skip malformed lines
    }
  }
  return records;
}

function parseTimeInterval(
  raw: unknown,
): { startedAt: Date; endedAt: Date; durationSeconds: number } | null {
  if (!raw || typeof raw !== "object") return null;
  const interval = raw as Record<string, unknown>;
  const start = readString(interval.start);
  const end = readString(interval.end);
  if (!start || !end) return null;

  const startedAt = new Date(start);
  const endedAt = new Date(end);
  if (Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime())) {
    return null;
  }

  let durationSeconds =
    typeof interval.duration === "number" && Number.isFinite(interval.duration)
      ? Math.round(interval.duration)
      : Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));

  if (durationSeconds <= 0) {
    durationSeconds = Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));
  }

  return { startedAt, endedAt, durationSeconds };
}

function parseClockifyEntry(raw: unknown, clockifyUserId: string): ParsedClockifyEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as Record<string, unknown>;

  const clockifyEntryId = readString(entry.id) ?? readString(entry._id);
  if (!clockifyEntryId) return null;

  const time = parseTimeInterval(entry.timeInterval);
  if (!time) return null;

  const projectObj =
    entry.project && typeof entry.project === "object"
      ? (entry.project as Record<string, unknown>)
      : null;
  const clientObj =
    entry.client && typeof entry.client === "object"
      ? (entry.client as Record<string, unknown>)
      : projectObj?.client && typeof projectObj.client === "object"
        ? (projectObj.client as Record<string, unknown>)
        : null;
  const taskObj =
    entry.task && typeof entry.task === "object" ? (entry.task as Record<string, unknown>) : null;

  const clientName =
    readString(entry.clientName) ??
    readNestedName(clientObj) ??
    readString(projectObj?.clientName) ??
    NO_CLIENT_NAME;

  const clientId =
    readString(entry.clientId) ??
    readNestedId(clientObj) ??
    readString(projectObj?.clientId) ??
    (clientName === NO_CLIENT_NAME ? NO_CLIENT_ID : `name-${slugify(clientName)}`);

  const projectName =
    readString(entry.projectName) ?? readNestedName(projectObj) ?? NO_PROJECT_NAME;

  const projectId =
    readString(entry.projectId) ??
    readNestedId(projectObj) ??
    (projectName === NO_PROJECT_NAME
      ? NO_PROJECT_ID
      : `name-${slugify(`${clientId}-${projectName}`)}`);

  const taskName = readString(entry.taskName) ?? readNestedName(taskObj);
  // Key by project + normalized title so same-named Clockify tasks collapse to one row.
  const taskId = taskName
    ? `name-${slugify(`${projectId}-${normalizeTaskTitle(taskName)}`)}`
    : null;

  return {
    clockifyEntryId,
    clockifyUserId,
    description: readString(entry.description) ?? "",
    clientId,
    clientName,
    projectId,
    projectName,
    taskId,
    taskName,
    ...time,
  };
}

export async function buildCatalog(
  outputDir: string,
  selectedMembers: ClockifyMember[],
  userIdByClockifyUserId: Map<string, string>,
  options: BuildCatalogOptions = {},
): Promise<ImportCatalog> {
  const clients = new Map<string, { id: string; name: string }>();
  const projects = new Map<string, { id: string; name: string; clientId: string }>();
  const tasks = new Map<string, { id: string; title: string; projectId: string }>();
  const timeEntries: ParsedClockifyEntry[] = [];
  const skipped: ImportCatalog["skipped"] = [];
  const seenEntryIds = new Set<string>();
  let skippedByBefore = 0;
  let duplicateEntryIds = 0;
  const beforeCutoff = options.before;
  const workspaceCatalog = await loadWorkspaceCatalog(outputDir);

  if (workspaceCatalog) {
    mergeWorkspaceCatalog(clients, projects, tasks, workspaceCatalog);
  }

  for (const member of selectedMembers) {
    const orchUserId = userIdByClockifyUserId.get(member.userId);
    if (!orchUserId) {
      skipped.push({
        reason: "Member not mapped to an Orch user",
        clockifyUserId: member.userId,
      });
      continue;
    }

    const rawEntries = await readJsonlLines(outputDir, member.userId, "time-entries.jsonl");
    for (const raw of rawEntries) {
      const parsed = parseClockifyEntry(raw, member.userId);
      if (!parsed) {
        skipped.push({
          reason: "Invalid or incomplete time entry",
          clockifyUserId: member.userId,
        });
        continue;
      }

      if (seenEntryIds.has(parsed.clockifyEntryId)) {
        duplicateEntryIds += 1;
        continue;
      }
      seenEntryIds.add(parsed.clockifyEntryId);

      if (beforeCutoff && parsed.startedAt >= beforeCutoff) {
        skippedByBefore += 1;
        continue;
      }

      if (parsed.durationSeconds <= 0) {
        skipped.push({
          reason: "Zero or negative duration",
          clockifyUserId: member.userId,
          clockifyEntryId: parsed.clockifyEntryId,
        });
        continue;
      }

      if (!workspaceCatalog) {
        const clientKey = parsed.clientId;
        if (!clients.has(clientKey)) {
          clients.set(clientKey, {
            id: clockifyClientId(parsed.clientId),
            name: parsed.clientName,
          });
        }

        const projectKey = parsed.projectId;
        if (!projects.has(projectKey)) {
          projects.set(projectKey, {
            id: clockifyProjectId(parsed.projectId),
            name: parsed.projectName,
            clientId: clockifyClientId(parsed.clientId),
          });
        }

        if (parsed.taskId && parsed.taskName) {
          const taskKey = parsed.taskId;
          if (!tasks.has(taskKey)) {
            tasks.set(taskKey, {
              id: clockifyTaskId(parsed.taskId),
              title: parsed.taskName,
              projectId: clockifyProjectId(parsed.projectId),
            });
          }
        }
      }

      timeEntries.push(parsed);
    }
  }

  return {
    clients,
    projects,
    tasks,
    timeEntries,
    skipped,
    skippedByBefore,
    duplicateEntryIds,
    taskConflicts: [],
  };
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

async function loadExistingClientIds(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) {
    return new Set();
  }
  const existing = new Set<string>();
  for (const batch of chunk(ids, BATCH_SIZE)) {
    const rows = await db
      .select({ id: agencyOpsClient.id })
      .from(agencyOpsClient)
      .where(inArray(agencyOpsClient.id, batch));
    for (const row of rows) {
      existing.add(row.id);
    }
  }
  return existing;
}

async function loadExistingProjectIds(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) {
    return new Set();
  }
  const existing = new Set<string>();
  for (const batch of chunk(ids, BATCH_SIZE)) {
    const rows = await db
      .select({ id: agencyOpsProject.id })
      .from(agencyOpsProject)
      .where(inArray(agencyOpsProject.id, batch));
    for (const row of rows) {
      existing.add(row.id);
    }
  }
  return existing;
}

async function loadExistingTaskIds(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) {
    return new Set();
  }
  const existing = new Set<string>();
  for (const batch of chunk(ids, BATCH_SIZE)) {
    const rows = await db
      .select({ id: agencyOpsProjectTask.id })
      .from(agencyOpsProjectTask)
      .where(inArray(agencyOpsProjectTask.id, batch));
    for (const row of rows) {
      existing.add(row.id);
    }
  }
  return existing;
}

async function loadExistingEntryIds(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) {
    return new Set();
  }
  const existing = new Set<string>();
  for (const batch of chunk(ids, BATCH_SIZE)) {
    const rows = await db
      .select({ id: agencyOpsTimeEntry.id })
      .from(agencyOpsTimeEntry)
      .where(inArray(agencyOpsTimeEntry.id, batch));
    for (const row of rows) {
      existing.add(row.id);
    }
  }
  return existing;
}

async function loadExistingTaskTitleIndex(teamId: string): Promise<Map<string, string>> {
  const rows = await db
    .select({
      id: agencyOpsProjectTask.id,
      projectId: agencyOpsProjectTask.projectId,
      title: agencyOpsProjectTask.title,
    })
    .from(agencyOpsProjectTask)
    .where(eq(agencyOpsProjectTask.teamId, teamId));

  const index = new Map<string, string>();
  for (const row of rows) {
    index.set(taskTitleKey(row.projectId, row.title), row.id);
  }
  return index;
}

export function resolveTaskConflicts(
  catalog: ImportCatalog,
  existingTitleIndex: Map<string, string>,
): Map<string, string> {
  const remapped = new Map<string, string>();
  const conflicts: ImportCatalog["taskConflicts"] = [];

  for (const task of catalog.tasks.values()) {
    const existingId = existingTitleIndex.get(taskTitleKey(task.projectId, task.title));
    if (existingId && existingId !== task.id) {
      remapped.set(task.id, existingId);
      conflicts.push({
        incomingId: task.id,
        existingId,
        title: task.title,
        projectId: task.projectId,
      });
    }
  }

  catalog.taskConflicts = conflicts;
  return remapped;
}

function resolveEntryTaskId(
  entry: ParsedClockifyEntry,
  taskIdRemap: Map<string, string>,
): string | null {
  if (!entry.taskId) {
    return null;
  }
  const incomingId = clockifyTaskId(entry.taskId);
  return taskIdRemap.get(incomingId) ?? incomingId;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function runImport(ctx: ImportContext, catalog: ImportCatalog): Promise<ImportStats> {
  const stats: ImportStats = {
    clientsInserted: 0,
    projectsInserted: 0,
    tasksInserted: 0,
    timeEntriesInserted: 0,
    skipped: catalog.skipped.length,
    skippedByBefore: catalog.skippedByBefore,
    duplicateEntryIds: catalog.duplicateEntryIds,
    taskConflictsRemapped: 0,
    clientsAlreadyExist: 0,
    projectsAlreadyExist: 0,
    tasksAlreadyExist: 0,
    timeEntriesAlreadyExist: 0,
  };

  const clientIds = [...catalog.clients.values()].map((client) => client.id);
  const projectIds = [...catalog.projects.values()].map((project) => project.id);
  const taskIds = [...catalog.tasks.values()].map((task) => task.id);
  const entryIds = catalog.timeEntries.map((entry) => clockifyEntryId(entry.clockifyEntryId));

  const existingClientIds = await loadExistingClientIds(clientIds);
  const existingProjectIds = await loadExistingProjectIds(projectIds);
  const existingTaskIds = await loadExistingTaskIds(taskIds);
  const existingEntryIds = await loadExistingEntryIds(entryIds);

  stats.clientsAlreadyExist = existingClientIds.size;
  stats.projectsAlreadyExist = existingProjectIds.size;
  stats.tasksAlreadyExist = existingTaskIds.size;
  stats.timeEntriesAlreadyExist = existingEntryIds.size;

  const taskTitleIndex = await loadExistingTaskTitleIndex(ctx.teamId);
  const taskIdRemap = resolveTaskConflicts(catalog, taskTitleIndex);
  stats.taskConflictsRemapped = taskIdRemap.size;

  if (ctx.dryRun) {
    const tasksToInsert = [...catalog.tasks.values()].filter((task) => !taskIdRemap.has(task.id));
    stats.clientsInserted = clientIds.length - existingClientIds.size;
    stats.projectsInserted = projectIds.length - existingProjectIds.size;
    stats.tasksInserted = tasksToInsert.filter((task) => !existingTaskIds.has(task.id)).length;
    stats.timeEntriesInserted = entryIds.length - existingEntryIds.size;
    return stats;
  }

  const now = new Date();

  async function ensureSentinelCatalogRows(): Promise<void> {
    await db
      .insert(agencyOpsClient)
      .values({
        id: clockifyClientId(NO_CLIENT_ID),
        teamId: ctx.teamId,
        name: NO_CLIENT_NAME,
        createdByUserId: ctx.createdByUserId,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();
    await db
      .insert(agencyOpsProject)
      .values({
        id: clockifyProjectId(NO_PROJECT_ID),
        teamId: ctx.teamId,
        clientId: clockifyClientId(NO_CLIENT_ID),
        name: NO_PROJECT_NAME,
        ...assignEntityIconOnWrite({ name: NO_PROJECT_NAME }),
        createdByUserId: ctx.createdByUserId,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();
  }

  if (ctx.entriesOnly) {
    await ensureSentinelCatalogRows();
  } else {
    for (const client of catalog.clients.values()) {
      const inserted = await db
        .insert(agencyOpsClient)
        .values({
          id: client.id,
          teamId: ctx.teamId,
          name: client.name,
          createdByUserId: ctx.createdByUserId,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing()
        .returning({ id: agencyOpsClient.id });
      stats.clientsInserted += inserted.length;
    }

    for (const project of catalog.projects.values()) {
      const inserted = await db
        .insert(agencyOpsProject)
        .values({
          id: project.id,
          teamId: ctx.teamId,
          clientId: project.clientId,
          name: project.name,
          ...assignEntityIconOnWrite({ name: project.name }),
          createdByUserId: ctx.createdByUserId,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing()
        .returning({ id: agencyOpsProject.id });
      stats.projectsInserted += inserted.length;
    }

    for (const task of catalog.tasks.values()) {
      if (taskIdRemap.has(task.id)) {
        continue;
      }

      const insertedTasks = await db
        .insert(agencyOpsProjectTask)
        .values({
          id: task.id,
          teamId: ctx.teamId,
          projectId: task.projectId,
          title: task.title,
          ...assignEntityIconOnWrite({ name: task.title }),
          status: "done",
          createdByUserId: ctx.createdByUserId,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing()
        .returning({ id: agencyOpsProjectTask.id });
      stats.tasksInserted += insertedTasks.length;
    }
  }

  const entryRows = catalog.timeEntries
    .map((entry) => {
      const userId = ctx.userIdByClockifyUserId.get(entry.clockifyUserId);
      if (!userId) {
        stats.skipped += 1;
        return null;
      }

      return {
        id: clockifyEntryId(entry.clockifyEntryId),
        teamId: ctx.teamId,
        projectId: clockifyProjectId(entry.projectId),
        taskId: resolveEntryTaskId(entry, taskIdRemap),
        userId,
        source: "manual" as const,
        description: entry.description,
        startedAt: entry.startedAt,
        endedAt: entry.endedAt,
        durationSeconds: entry.durationSeconds,
        createdAt: entry.startedAt,
        updatedAt: entry.startedAt,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  for (const batch of chunk(entryRows, BATCH_SIZE)) {
    const inserted = await db
      .insert(agencyOpsTimeEntry)
      .values(batch)
      .onConflictDoNothing()
      .returning({ id: agencyOpsTimeEntry.id });
    stats.timeEntriesInserted += inserted.length;
  }

  return stats;
}
