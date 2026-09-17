import {
  agencyOpsClient,
  agencyOpsProjectTaskBlueprint,
  agencyOpsProjectTaskAssignee,
  agencyOpsProjectTask,
  agencyOpsProjectTaskMemberStatus,
  agencyOpsTimeEntry,
  agencyOpsProjectJourney,
  agencyOpsProjectJourneyStep,
  agencyOpsProject,
} from "@orch/db/schema";
import { ORPCError } from "@orpc/server";
import { db } from "@orch/db";
import { createWorkspaceId } from "@orch/workspace";
import { eq, sql, and, inArray, isNull, or, exists, desc } from "drizzle-orm";
import { notifyTaskAssigned } from "../../notifications/fanout";
import { applyMemberTaskCompletion } from "../../../schemas/agency-ops";
import {
  type AgencyProjectTaskBlueprintRecord,
  type DbTransaction,
  setTaskMemberStatusesForUsers,
  type ProjectTaskRow,
  projectTaskColumns,
  projectTaskSelectWithParentRates,
  attachParentRates,
  setTaskAssignees,
  loadTaskAssignees,
  loadTaskMemberStatuses,
  loadTaskBlueprintsForViewer,
  buildProjectTaskRecord,
} from "../shared/task-helpers";
import { getProjectByIdForTeam, requireTeamMember } from "../shared/lookup-helpers";
import { syncJourneyStepStatuses, applyJourneySyncNotifications } from "../shared/journey-helpers";
import { parseIsoDateTime } from "../shared/date-helpers";
import { requireAgencyRole } from "../shared/membership";
import { normalizeTaskTitle, planAssigneeMerge } from "./task-title";
import { buildTaskListSearchPredicate, tokenizeTaskListSearch } from "./task-list-search";
import { publishAgencyTaskUpdated } from "../live/live";
import { canEditAgencyProjectTask } from "./task-edit-authz";
import { loadMoneyResolveContext } from "../billing/money-fx-service";
import {
  assignEntityIconOnWrite,
  readStoredEntityIcon,
  type AgencyEntityIconKey,
} from "../shared/entity-icon-catalog";
import { assertWithinLimit } from "../../../billing-team";

async function createTaskBlueprintForViewer(
  teamId: string,
  taskId: string,
  viewerUserId: string,
  description: string,
): Promise<AgencyProjectTaskBlueprintRecord | null> {
  const trimmed = description.trim();
  if (!trimmed) return null;

  const now = new Date();
  const [row] = await db
    .insert(agencyOpsProjectTaskBlueprint)
    .values({
      id: createWorkspaceId("agency-task-blueprint"),
      teamId,
      taskId,
      userId: viewerUserId,
      description: trimmed,
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: agencyOpsProjectTaskBlueprint.id,
      description: agencyOpsProjectTaskBlueprint.description,
    });

  return row ?? null;
}

async function addTaskAssignees(tx: DbTransaction, taskId: string, userIds: string[]) {
  const uniqueUserIds = [...new Set(userIds)];
  if (uniqueUserIds.length === 0) return;

  const existingRows = await tx
    .select({ userId: agencyOpsProjectTaskAssignee.userId })
    .from(agencyOpsProjectTaskAssignee)
    .where(eq(agencyOpsProjectTaskAssignee.taskId, taskId));
  const existingUserIds = new Set(existingRows.map((row) => row.userId));
  const addedUserIds = uniqueUserIds.filter((userId) => !existingUserIds.has(userId));
  if (addedUserIds.length === 0) return;

  await tx.insert(agencyOpsProjectTaskAssignee).values(
    addedUserIds.map((userId) => ({
      taskId,
      userId,
    })),
  );
  await setTaskMemberStatusesForUsers(tx, taskId, addedUserIds, "open");
}

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth += 1) {
    if ("code" in current && current.code === "23505") return true;
    current = "cause" in current ? current.cause : undefined;
  }
  return false;
}

/** SQL expression matching normalizeTaskTitle() / unique index. */
function taskTitleKeySql() {
  return sql`lower(trim(regexp_replace(${agencyOpsProjectTask.title}, '\\s+', ' ', 'g')))`;
}

async function findProjectTaskByTitleKey(
  teamId: string,
  projectId: string,
  titleKey: string,
): Promise<ProjectTaskRow | null> {
  const [task] = await db
    .select(projectTaskColumns)
    .from(agencyOpsProjectTask)
    .where(
      and(
        eq(agencyOpsProjectTask.teamId, teamId),
        eq(agencyOpsProjectTask.projectId, projectId),
        sql`${taskTitleKeySql()} = ${titleKey}`,
      ),
    )
    .limit(1);

  return task ?? null;
}

async function mergeAssigneesIntoExistingTask(
  task: ProjectTaskRow,
  input: {
    assignedToTeam: boolean;
    assigneeUserIds: string[];
  },
): Promise<ProjectTaskRow> {
  const existingAssigneeRows = await db
    .select({ userId: agencyOpsProjectTaskAssignee.userId })
    .from(agencyOpsProjectTaskAssignee)
    .where(eq(agencyOpsProjectTaskAssignee.taskId, task.id));

  const plan = planAssigneeMerge({
    existingAssignedToTeam: task.assignedToTeam,
    existingAssigneeIds: existingAssigneeRows.map((row) => row.userId),
    wantAssignedToTeam: input.assignedToTeam,
    wantAssigneeIds: input.assigneeUserIds,
  });

  if (plan.kind === "noop") return task;

  const now = new Date();
  const [updated] = await db.transaction(async (tx) => {
    if (plan.kind === "team") {
      await setTaskAssignees(tx, task.id, []);
      const [row] = await tx
        .update(agencyOpsProjectTask)
        .set({ assignedToTeam: true, updatedAt: now })
        .where(eq(agencyOpsProjectTask.id, task.id))
        .returning(projectTaskColumns);
      return [row];
    }

    await addTaskAssignees(tx, task.id, plan.userIds);
    const [row] = await tx
      .update(agencyOpsProjectTask)
      .set({ updatedAt: now })
      .where(eq(agencyOpsProjectTask.id, task.id))
      .returning(projectTaskColumns);
    return [row];
  });

  return updated ?? task;
}

async function reopenMemberTaskForActor(taskId: string, actorUserId: string) {
  const now = new Date();
  await db
    .update(agencyOpsProjectTaskMemberStatus)
    .set({ status: "open", updatedAt: now })
    .where(
      and(
        eq(agencyOpsProjectTaskMemberStatus.taskId, taskId),
        eq(agencyOpsProjectTaskMemberStatus.userId, actorUserId),
        eq(agencyOpsProjectTaskMemberStatus.status, "done"),
      ),
    );
}

async function buildTaskRecordForActor(task: ProjectTaskRow, actorUserId: string) {
  await reopenMemberTaskForActor(task.id, actorUserId);
  const [withRates] = await attachParentRates([task]);
  if (!withRates) {
    throw new ORPCError("INTERNAL_SERVER_ERROR");
  }
  const assigneesByTask = await loadTaskAssignees([task.id]);
  const memberStatuses = await loadTaskMemberStatuses([task.id]);
  const blueprintsByTask = await loadTaskBlueprintsForViewer([task.id], actorUserId);
  return buildProjectTaskRecord(
    withRates,
    assigneesByTask.get(task.id) ?? [],
    actorUserId,
    memberStatuses.get(task.id),
    blueprintsByTask.get(task.id),
  );
}

async function loadTaskTrackedSeconds(taskIds: string[], userId: string) {
  const totals = new Map<string, number>();
  if (taskIds.length === 0 || !userId) return totals;

  const rows = await db
    .select({
      taskId: agencyOpsTimeEntry.taskId,
      totalSeconds: sql<number>`coalesce(sum(${agencyOpsTimeEntry.durationSeconds}), 0)`,
    })
    .from(agencyOpsTimeEntry)
    .where(
      and(
        inArray(agencyOpsTimeEntry.taskId, taskIds),
        eq(agencyOpsTimeEntry.userId, userId),
        isNull(agencyOpsTimeEntry.deletedAt),
      ),
    )
    .groupBy(agencyOpsTimeEntry.taskId);

  for (const row of rows) {
    if (row.taskId) {
      totals.set(row.taskId, Number(row.totalSeconds));
    }
  }

  return totals;
}

async function maybeSyncJourneyForTask(teamId: string, taskId: string) {
  const [step] = await db
    .select({ projectId: agencyOpsProjectJourney.projectId })
    .from(agencyOpsProjectJourneyStep)
    .innerJoin(
      agencyOpsProjectJourney,
      eq(agencyOpsProjectJourney.id, agencyOpsProjectJourneyStep.journeyId),
    )
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsProjectJourney.projectId))
    .where(and(eq(agencyOpsProjectJourneyStep.taskId, taskId), eq(agencyOpsProject.teamId, teamId)))
    .limit(1);

  if (!step) return;

  const syncResult = await syncJourneyStepStatuses(teamId, step.projectId);
  await applyJourneySyncNotifications(teamId, step.projectId, null, syncResult);
}

export async function listAgencyProjectTasks(
  actorUserId: string,
  input: {
    teamId: string;
    projectId?: string;
    status?: "open" | "in_progress" | "done" | "archived";
    statuses?: ("open" | "in_progress" | "done" | "archived")[];
    assigneeUserId?: string;
    delegatedByUserId?: string;
    journeyDiscoveryForUserId?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    detail?: "full" | "chooser";
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");

  if (input.projectId) {
    await getProjectByIdForTeam(input.teamId, input.projectId);
  }

  const searchTokens = tokenizeTaskListSearch(input.search ?? "");
  const filters = [eq(agencyOpsProjectTask.teamId, input.teamId)];

  // Soft-deleted projects are excluded from all agency listings.
  filters.push(isNull(agencyOpsProject.deletedAt));
  // Team-wide lists match the default projects query (active clients only).
  // Project-scoped lists keep archived-client tasks when the project id is explicit.
  if (!input.projectId) {
    filters.push(isNull(agencyOpsClient.archivedAt));
  }

  if (input.projectId) {
    filters.push(eq(agencyOpsProjectTask.projectId, input.projectId));
  }

  const requestedStatuses = input.statuses ?? (input.status ? [input.status] : []);
  const filterByMemberStatus = Boolean(input.assigneeUserId && requestedStatuses.length > 0);
  const memberStatusList = requestedStatuses.filter(
    (status): status is "open" | "in_progress" | "done" =>
      status === "open" || status === "in_progress" || status === "done",
  );
  const activeMemberStatuses = memberStatusList.filter(
    (status): status is "open" | "in_progress" => status === "open" || status === "in_progress",
  );
  const wantsDoneByCompletion =
    filterByMemberStatus && memberStatusList.includes("done") && activeMemberStatuses.length === 0;

  const viewerCompletionCountSql = sql`coalesce(
    (
      select ${agencyOpsProjectTaskMemberStatus.completionCount}
      from ${agencyOpsProjectTaskMemberStatus}
      where ${agencyOpsProjectTaskMemberStatus.taskId} = ${agencyOpsProjectTask.id}
        and ${agencyOpsProjectTaskMemberStatus.userId} = ${input.assigneeUserId!}
      limit 1
    ),
    0
  )`;

  if (filterByMemberStatus) {
    if (!requestedStatuses.includes("archived")) {
      filters.push(sql`${agencyOpsProjectTask.status} <> 'archived'`);
    }
    if (wantsDoneByCompletion) {
      filters.push(sql`${viewerCompletionCountSql} > 0`);
    } else if (activeMemberStatuses.length > 0) {
      filters.push(
        sql`coalesce(
          (
            select ${agencyOpsProjectTaskMemberStatus.status}
            from ${agencyOpsProjectTaskMemberStatus}
            where ${agencyOpsProjectTaskMemberStatus.taskId} = ${agencyOpsProjectTask.id}
              and ${agencyOpsProjectTaskMemberStatus.userId} = ${input.assigneeUserId!}
            limit 1
          ),
          'open'
        ) in (${sql.join(
          activeMemberStatuses.map((status) => sql`${status}`),
          sql`, `,
        )})`,
      );
    } else if (requestedStatuses.includes("archived")) {
      filters.push(eq(agencyOpsProjectTask.status, "archived"));
    }
  } else if (requestedStatuses.length > 0) {
    filters.push(inArray(agencyOpsProjectTask.status, requestedStatuses));
  } else {
    filters.push(sql`${agencyOpsProjectTask.status} <> 'archived'`);
  }

  if (input.assigneeUserId) {
    const assigneeSubquery = db
      .select({ one: sql`1` })
      .from(agencyOpsProjectTaskAssignee)
      .where(
        and(
          eq(agencyOpsProjectTaskAssignee.taskId, agencyOpsProjectTask.id),
          eq(agencyOpsProjectTaskAssignee.userId, input.assigneeUserId),
        ),
      );
    filters.push(or(eq(agencyOpsProjectTask.assignedToTeam, true), exists(assigneeSubquery))!);
  }

  if (input.delegatedByUserId) {
    filters.push(eq(agencyOpsProjectTask.createdByUserId, input.delegatedByUserId));
    const otherAssigneeSubquery = db
      .select({ one: sql`1` })
      .from(agencyOpsProjectTaskAssignee)
      .where(
        and(
          eq(agencyOpsProjectTaskAssignee.taskId, agencyOpsProjectTask.id),
          sql`${agencyOpsProjectTaskAssignee.userId} <> ${input.delegatedByUserId}`,
        ),
      );
    filters.push(or(eq(agencyOpsProjectTask.assignedToTeam, true), exists(otherAssigneeSubquery))!);
  }

  if (input.journeyDiscoveryForUserId) {
    filters.push(inArray(agencyOpsProjectTask.taskKind, ["journey_anchor", "journey_milestone"]));
    // ponytail: correlated subquery on projectId; fine at team journey scale.
    filters.push(
      sql`not exists (
        select 1
        from ${agencyOpsProjectTask} milestone_task
        inner join ${agencyOpsProjectTaskAssignee} milestone_assignee
          on milestone_assignee.task_id = milestone_task.id
        where milestone_task.team_id = ${input.teamId}
          and milestone_task.project_id = ${agencyOpsProjectTask.projectId}
          and milestone_task.task_kind = 'journey_milestone'
          and milestone_assignee.user_id = ${input.journeyDiscoveryForUserId}
      )`,
    );
  }

  const searchPredicate = buildTaskListSearchPredicate(searchTokens);
  if (searchPredicate) {
    filters.push(searchPredicate);
  }

  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 50));
  const offset = (page - 1) * pageSize;
  const whereClause = and(...filters);
  const chooserDetail = input.detail === "chooser";

  const countSelect = {
    count: wantsDoneByCompletion
      ? sql<number>`coalesce(sum(${viewerCompletionCountSql}), 0)`
      : sql<number>`count(*)`,
  };

  // Always join project/client so trash + archived-client filters apply (search also needs them).
  const countQuery = db
    .select(countSelect)
    .from(agencyOpsProjectTask)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsProjectTask.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .where(whereClause);

  const rowsQuery = db
    .select(projectTaskSelectWithParentRates)
    .from(agencyOpsProjectTask)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsProjectTask.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .where(whereClause)
    // Unique id after createdAt keeps offset pages deterministic. Concurrent
    // inserts still shift offsets; list refreshes stay authoritative.
    .orderBy(desc(agencyOpsProjectTask.createdAt), desc(agencyOpsProjectTask.id))
    .limit(pageSize)
    .offset(offset);

  const [countRow, rows] = await Promise.all([countQuery, rowsQuery]);

  const parsedTotal = Number(countRow[0]?.count ?? 0);
  const total = Number.isFinite(parsedTotal) && parsedTotal >= 0 ? parsedTotal : 0;

  const assigneesByTask = await loadTaskAssignees(rows.map((row) => row.id));
  const memberStatusesByTask = input.assigneeUserId
    ? await loadTaskMemberStatuses(rows.map((row) => row.id))
    : undefined;
  const blueprintsByTask = input.assigneeUserId
    ? await loadTaskBlueprintsForViewer(
        rows.map((row) => row.id),
        input.assigneeUserId,
      )
    : undefined;
  const trackedSecondsByTask = chooserDetail
    ? new Map<string, number>()
    : await loadTaskTrackedSeconds(
        rows.map((row) => row.id),
        actorUserId,
      );

  return {
    items: await Promise.all(
      rows.map((row) =>
        buildProjectTaskRecord(
          row,
          assigneesByTask.get(row.id) ?? [],
          input.assigneeUserId,
          memberStatusesByTask?.get(row.id),
          blueprintsByTask?.get(row.id),
        ).then((task) =>
          chooserDetail
            ? task
            : {
                ...task,
                totalTrackedSeconds: trackedSecondsByTask.get(row.id) ?? 0,
              },
        ),
      ),
    ),
    page,
    pageSize,
    total,
  };
}

async function getTaskByIdForTeam(teamId: string, taskId: string) {
  const [task] = await db
    .select(projectTaskColumns)
    .from(agencyOpsProjectTask)
    .where(and(eq(agencyOpsProjectTask.id, taskId), eq(agencyOpsProjectTask.teamId, teamId)))
    .limit(1);

  if (!task) {
    throw new ORPCError("NOT_FOUND", {
      message: "Task was not found.",
    });
  }

  return task;
}

async function emitTaskAssignedNotification(
  actorUserId: string,
  teamId: string,
  task: {
    id: string;
    title: string;
    projectId: string;
    assignedToTeam: boolean;
    assignees: Array<{ userId: string }>;
  },
  recipientUserIds?: string[],
) {
  const [project] = await db
    .select({ name: agencyOpsProject.name })
    .from(agencyOpsProject)
    .where(eq(agencyOpsProject.id, task.projectId))
    .limit(1);

  await notifyTaskAssigned({
    teamId,
    actorUserId,
    taskId: task.id,
    taskTitle: task.title,
    projectId: task.projectId,
    projectName: project?.name ?? "Project",
    assigneeUserIds: recipientUserIds ?? task.assignees.map((assignee) => assignee.userId),
    assignedToTeam: task.assignedToTeam,
  });
}

export async function createAgencyProjectTask(
  actorUserId: string,
  input: {
    teamId: string;
    projectId: string;
    title: string;
    iconKey?: AgencyEntityIconKey | null;
    status?: "open" | "in_progress" | "done" | "archived";
    assignedToTeam?: boolean;
    assigneeUserIds?: string[];
    dueDate?: string | null;
    estimateMinutes?: number | null;
    description?: string;
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "owner");
  await getProjectByIdForTeam(input.teamId, input.projectId);

  const title = input.title.trim();
  if (!title) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Task title is required.",
    });
  }

  const titleKey = normalizeTaskTitle(title);
  const assignedToTeam = input.assignedToTeam ?? false;
  const assigneeUserIds = assignedToTeam ? [] : [...new Set(input.assigneeUserIds ?? [])];
  const estimateMinutes = input.estimateMinutes ?? null;

  if (!assignedToTeam) {
    for (const userId of assigneeUserIds) {
      await requireTeamMember(input.teamId, userId);
    }
  }

  const existing = await findProjectTaskByTitleKey(input.teamId, input.projectId, titleKey);
  if (existing) {
    // Title reuse merges assignees only; keep the existing estimate (create does not overwrite).
    const merged = await mergeAssigneesIntoExistingTask(existing, {
      assignedToTeam,
      assigneeUserIds,
    });
    await createTaskBlueprintForViewer(
      input.teamId,
      merged.id,
      actorUserId,
      input.description ?? "",
    );
    return buildTaskRecordForActor(merged, actorUserId);
  }

  const now = new Date();
  const taskId = createWorkspaceId("agency-project-task");
  const dueDate = input.dueDate ? parseIsoDateTime(input.dueDate, "dueDate") : null;

  try {
    const [created] = await db.transaction(async (tx) => {
      await assertWithinLimit(input.teamId, "tasksPerProject", {
        projectId: input.projectId,
        tx,
      });
      const [task] = await tx
        .insert(agencyOpsProjectTask)
        .values({
          id: taskId,
          teamId: input.teamId,
          projectId: input.projectId,
          title,
          ...assignEntityIconOnWrite({
            name: title,
            iconKeyProvided: input.iconKey !== undefined,
            requestedIconKey: input.iconKey,
          }),
          status: input.status ?? "open",
          assignedToTeam,
          estimateMinutes,
          dueDate,
          createdByUserId: actorUserId,
          createdAt: now,
          updatedAt: now,
        })
        .returning(projectTaskColumns);

      if (task) {
        if (assigneeUserIds.length > 0) {
          await setTaskAssignees(tx, task.id, assigneeUserIds);
        }
      }

      return [task];
    });

    if (!created) {
      throw new ORPCError("INTERNAL_SERVER_ERROR");
    }

    await createTaskBlueprintForViewer(
      input.teamId,
      created.id,
      actorUserId,
      input.description ?? "",
    );

    const record = await buildTaskRecordForActor(created, actorUserId);
    if (record.assignees.length > 0 || record.assignedToTeam) {
      await emitTaskAssignedNotification(actorUserId, input.teamId, record);
    }
    return record;
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;

    const raced = await findProjectTaskByTitleKey(input.teamId, input.projectId, titleKey);
    if (!raced) throw error;

    const merged = await mergeAssigneesIntoExistingTask(raced, {
      assignedToTeam,
      assigneeUserIds,
    });
    await createTaskBlueprintForViewer(
      input.teamId,
      merged.id,
      actorUserId,
      input.description ?? "",
    );
    return buildTaskRecordForActor(merged, actorUserId);
  }
}

export async function completeAgencyProjectTaskForMember(
  actorUserId: string,
  input: {
    teamId: string;
    taskId: string;
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");

  const current = await getTaskByIdForTeam(input.teamId, input.taskId);
  if (current.status === "archived") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Archived tasks cannot be updated.",
    });
  }

  const canWork =
    current.assignedToTeam ||
    (
      await db
        .select({ userId: agencyOpsProjectTaskAssignee.userId })
        .from(agencyOpsProjectTaskAssignee)
        .where(
          and(
            eq(agencyOpsProjectTaskAssignee.taskId, input.taskId),
            eq(agencyOpsProjectTaskAssignee.userId, actorUserId),
          ),
        )
        .limit(1)
    ).length > 0;

  if (!canWork) {
    throw new ORPCError("FORBIDDEN", {
      message: "You are not assigned to this task.",
    });
  }

  const now = new Date();
  const firstCompletion = applyMemberTaskCompletion({ completionCount: 0 });
  await db
    .insert(agencyOpsProjectTaskMemberStatus)
    .values({
      taskId: input.taskId,
      userId: actorUserId,
      status: firstCompletion.status,
      completionCount: firstCompletion.completionCount,
      completedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [agencyOpsProjectTaskMemberStatus.taskId, agencyOpsProjectTaskMemberStatus.userId],
      set: {
        status: "done",
        completionCount: sql`${agencyOpsProjectTaskMemberStatus.completionCount} + 1`,
        completedAt: now,
        updatedAt: now,
      },
    });

  const assigneesByTask = await loadTaskAssignees([current.id]);
  const memberStatuses = await loadTaskMemberStatuses([current.id]);
  const blueprintsByTask = await loadTaskBlueprintsForViewer([current.id], actorUserId);
  const [withRates] = await attachParentRates([current]);
  if (!withRates) {
    throw new ORPCError("INTERNAL_SERVER_ERROR");
  }

  await maybeSyncJourneyForTask(input.teamId, input.taskId);

  return buildProjectTaskRecord(
    withRates,
    assigneesByTask.get(current.id) ?? [],
    actorUserId,
    memberStatuses.get(current.id),
    blueprintsByTask.get(current.id),
  );
}

export async function updateAgencyProjectTaskBlueprint(
  actorUserId: string,
  input: {
    teamId: string;
    blueprintId: string;
    description: string;
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");

  const [existing] = await db
    .select({
      id: agencyOpsProjectTaskBlueprint.id,
      taskId: agencyOpsProjectTaskBlueprint.taskId,
    })
    .from(agencyOpsProjectTaskBlueprint)
    .where(
      and(
        eq(agencyOpsProjectTaskBlueprint.id, input.blueprintId),
        eq(agencyOpsProjectTaskBlueprint.teamId, input.teamId),
        eq(agencyOpsProjectTaskBlueprint.userId, actorUserId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new ORPCError("NOT_FOUND", {
      message: "Task blueprint was not found.",
    });
  }

  const now = new Date();
  const [updated] = await db
    .update(agencyOpsProjectTaskBlueprint)
    .set({
      description: input.description,
      updatedAt: now,
    })
    .where(eq(agencyOpsProjectTaskBlueprint.id, input.blueprintId))
    .returning({
      id: agencyOpsProjectTaskBlueprint.id,
      description: agencyOpsProjectTaskBlueprint.description,
    });

  if (!updated) {
    throw new ORPCError("NOT_FOUND", {
      message: "Task blueprint was not found.",
    });
  }

  return updated;
}

export async function updateAgencyProjectTask(
  actorUserId: string,
  input: {
    teamId: string;
    taskId: string;
    title?: string;
    iconKey?: AgencyEntityIconKey | null;
    status?: "open" | "in_progress" | "done" | "archived";
    assignedToTeam?: boolean;
    assigneeUserIds?: string[];
    dueDate?: string | null;
    estimateMinutes?: number | null;
    isWaste?: boolean;
    billableRateAmount?: number | null;
    currency?: string;
  },
) {
  const actorRole = await requireAgencyRole(actorUserId, input.teamId, "viewer");

  const current = await getTaskByIdForTeam(input.teamId, input.taskId);
  const assignees = (await loadTaskAssignees([input.taskId])).get(input.taskId) ?? [];
  if (
    !canEditAgencyProjectTask({
      assignedToTeam: current.assignedToTeam,
      assigneeUserIds: assignees.map((item) => item.userId),
      actorUserId,
      actorRole,
    })
  ) {
    throw new ORPCError("FORBIDDEN", {
      message: "Only assignees or editors can update this task.",
    });
  }

  if (input.billableRateAmount !== undefined || input.currency !== undefined) {
    if (actorRole !== "owner") {
      throw new ORPCError("FORBIDDEN", {
        message: "Only owners can set or clear the task billable rate.",
      });
    }
  }

  const previousAssigneeIds = new Set(assignees.map((assignee) => assignee.userId));

  const title = input.title?.trim();
  if (title === "") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Task title cannot be empty.",
    });
  }

  if (title && normalizeTaskTitle(title) !== normalizeTaskTitle(current.title)) {
    const collision = await findProjectTaskByTitleKey(
      input.teamId,
      current.projectId,
      normalizeTaskTitle(title),
    );
    if (collision && collision.id !== current.id) {
      throw new ORPCError("BAD_REQUEST", {
        message: "A task with this name already exists on this project.",
      });
    }
  }

  const dueDate =
    input.dueDate !== undefined
      ? input.dueDate
        ? parseIsoDateTime(input.dueDate, "dueDate")
        : null
      : current.dueDate;

  const estimateMinutes =
    input.estimateMinutes !== undefined ? input.estimateMinutes : current.estimateMinutes;

  let nextAssignedToTeam = current.assignedToTeam;
  let nextAssigneeUserIds: string[] | null = null;

  if (input.assignedToTeam === true) {
    nextAssignedToTeam = true;
    nextAssigneeUserIds = [];
  } else if (input.assignedToTeam === false || input.assigneeUserIds !== undefined) {
    nextAssignedToTeam = false;
    nextAssigneeUserIds = [...new Set(input.assigneeUserIds ?? [])];
    for (const userId of nextAssigneeUserIds) {
      await requireTeamMember(input.teamId, userId);
    }
  }

  const ratePatch: {
    billableRateAmount?: number | null;
    currency?: string;
    sourceBillableRateAmount?: number | null;
    fxRate?: string;
    fxAsOf?: Date | null;
  } = {};

  if (input.billableRateAmount !== undefined || input.currency !== undefined) {
    if (input.billableRateAmount === null) {
      const moneyCtx = await loadMoneyResolveContext(actorUserId, { teamId: input.teamId });
      ratePatch.billableRateAmount = null;
      ratePatch.sourceBillableRateAmount = null;
      ratePatch.fxRate = "1";
      ratePatch.fxAsOf = null;
      ratePatch.currency = moneyCtx.agencyCurrency;
    } else {
      const [currentFx] = await db
        .select({
          currency: agencyOpsProjectTask.currency,
          billableRateAmount: agencyOpsProjectTask.billableRateAmount,
          sourceBillableRateAmount: agencyOpsProjectTask.sourceBillableRateAmount,
        })
        .from(agencyOpsProjectTask)
        .where(
          and(
            eq(agencyOpsProjectTask.teamId, input.teamId),
            eq(agencyOpsProjectTask.id, input.taskId),
          ),
        )
        .limit(1);
      if (!currentFx) {
        throw new ORPCError("NOT_FOUND");
      }
      const moneyCtx = await loadMoneyResolveContext(actorUserId, { teamId: input.teamId });
      const sourceCurrency = (
        input.currency ??
        currentFx.currency ??
        moneyCtx.agencyCurrency
      ).toUpperCase();
      const sourceAmount =
        input.billableRateAmount ??
        currentFx.sourceBillableRateAmount ??
        currentFx.billableRateAmount;
      if (sourceAmount == null) {
        throw new ORPCError("BAD_REQUEST", { message: "Task rate amount is required." });
      }
      const money = moneyCtx.resolve(sourceAmount, sourceCurrency);
      await moneyCtx.lock();
      ratePatch.billableRateAmount = money.amount;
      ratePatch.currency = money.sourceCurrency;
      ratePatch.sourceBillableRateAmount = money.sourceAmount;
      ratePatch.fxRate = money.fxRate;
      ratePatch.fxAsOf = new Date(money.fxAsOf);
    }
  }

  const now = new Date();
  const iconPatch =
    input.iconKey !== undefined || title
      ? assignEntityIconOnWrite({
          name: title ?? current.title,
          iconKeyProvided: input.iconKey !== undefined,
          requestedIconKey: input.iconKey,
          existing: readStoredEntityIcon(current),
        })
      : null;
  const [updated] = await db.transaction(async (tx) => {
    const [task] = await tx
      .update(agencyOpsProjectTask)
      .set({
        ...(title ? { title } : {}),
        ...(iconPatch ? { iconKey: iconPatch.iconKey, iconSource: iconPatch.iconSource } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.isWaste !== undefined ? { isWaste: input.isWaste } : {}),
        ...(input.assignedToTeam !== undefined || input.assigneeUserIds !== undefined
          ? { assignedToTeam: nextAssignedToTeam }
          : {}),
        dueDate,
        estimateMinutes,
        ...ratePatch,
        updatedAt: now,
      })
      .where(
        and(
          eq(agencyOpsProjectTask.teamId, input.teamId),
          eq(agencyOpsProjectTask.id, input.taskId),
        ),
      )
      .returning(projectTaskColumns);

    if (task && nextAssigneeUserIds !== null) {
      await setTaskAssignees(tx, task.id, nextAssigneeUserIds);
    }

    return [task];
  });

  if (!updated) {
    throw new ORPCError("NOT_FOUND");
  }

  if (input.status !== undefined) {
    await maybeSyncJourneyForTask(input.teamId, input.taskId);
  }

  const [withRates] = await attachParentRates([updated]);
  if (!withRates) {
    throw new ORPCError("INTERNAL_SERVER_ERROR");
  }

  const assigneesByTask = await loadTaskAssignees([updated.id]);
  const task = await buildProjectTaskRecord(withRates, assigneesByTask.get(updated.id) ?? []);

  if (
    input.status !== undefined ||
    input.assigneeUserIds !== undefined ||
    input.assignedToTeam !== undefined ||
    input.title !== undefined ||
    input.iconKey !== undefined ||
    input.estimateMinutes !== undefined ||
    input.billableRateAmount !== undefined ||
    input.currency !== undefined
  ) {
    await publishAgencyTaskUpdated(input.teamId, task);
  }

  if (nextAssigneeUserIds !== null || input.assignedToTeam === true) {
    const newlyAssigned = task.assignedToTeam
      ? []
      : task.assignees
          .map((assignee) => assignee.userId)
          .filter((id) => !previousAssigneeIds.has(id));
    if (task.assignedToTeam || newlyAssigned.length > 0) {
      await emitTaskAssignedNotification(
        actorUserId,
        input.teamId,
        task,
        newlyAssigned.length > 0 ? newlyAssigned : undefined,
      );
    }
  }

  return task;
}

export async function deleteAgencyProjectTask(
  actorUserId: string,
  input: {
    teamId: string;
    taskId: string;
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const [deleted] = await db
    .delete(agencyOpsProjectTask)
    .where(
      and(eq(agencyOpsProjectTask.teamId, input.teamId), eq(agencyOpsProjectTask.id, input.taskId)),
    )
    .returning({ id: agencyOpsProjectTask.id });

  if (!deleted) {
    throw new ORPCError("NOT_FOUND", {
      message: "Task was not found.",
    });
  }

  return {
    taskId: deleted.id,
    deleted: true,
  };
}
