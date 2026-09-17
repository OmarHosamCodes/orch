import { isNotNull, isNull, eq, and, asc, count, inArray } from "drizzle-orm";
import {
  agencyOpsActiveTimer,
  agencyOpsClient,
  agencyOpsProject,
  agencyOpsTimeEntry,
  agencyOpsProjectJourneyStep,
  agencyOpsProjectTask,
  agencyOpsProjectJourney,
} from "@orch/db/schema";
import { db } from "@orch/db";
import { createWorkspaceId } from "@orch/workspace";
import { ORPCError } from "@orpc/server";
import {
  type AgencyProjectTaskRecord,
  type ProjectTaskRow,
  projectTaskColumns,
  attachParentRates,
  loadTaskAssignees,
  loadTaskMemberStatuses,
  loadTaskBlueprintsForViewer,
  buildProjectTaskRecord,
  type DbTransaction,
  setTaskAssignees,
} from "../shared/task-helpers";
import {
  getClientByIdForTeam,
  getProjectByIdForTeam,
  requireTeamMember,
} from "../shared/lookup-helpers";
import {
  type AgencyClientArchiveFilter,
  type AgencyProjectTrashFilter,
} from "../shared/report-helpers";
import {
  getJourneyRowForProject,
  syncJourneyStepStatuses,
  applyJourneySyncNotifications,
} from "../shared/journey-helpers";
import { requireAgencyRole } from "../shared/membership";
import { getAgencyProjectTemplateForTeam } from "../project-templates/service";
import { loadMoneyResolveContext } from "../billing/money-fx-service";
import {
  assignEntityIconOnWrite,
  readStoredEntityIcon,
  type AgencyEntityIconKey,
} from "../shared/entity-icon-catalog";

type AgencyProjectRecord = {
  id: string;
  teamId: string;
  clientId: string;
  clientName: string;
  name: string;
  colorHueId: number | null;
  iconKey: AgencyEntityIconKey | null;
  iconSource: "auto" | "manual";
  billableRateAmount: number | null;
  sourceBillableRateAmount: number | null;
  currency: string;
  clientBillableRateAmount: number | null;
  clientSourceBillableRateAmount: number | null;
  clientCurrency: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type AgencyProjectJourneyStepRecord = {
  id: string;
  journeyId: string;
  sortOrder: number;
  label: string;
  stepKind: "start" | "milestone" | "checkpoint" | "destination";
  status: "planned" | "active" | "done" | "blocked";
  taskId: string | null;
  task?: AgencyProjectTaskRecord | null;
  timeEntryCount: number;
  createdAt: string;
  updatedAt: string;
};

type AgencyProjectJourneyRecord = {
  id: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  steps: AgencyProjectJourneyStepRecord[];
  completedSteps: number;
  totalSteps: number;
};

function mapProjectRow(row: {
  id: string;
  teamId: string;
  clientId: string;
  clientName: string;
  name: string;
  colorHueId: number | null;
  iconKey: string | null;
  iconSource: string;
  billableRateAmount: number | null;
  sourceBillableRateAmount: number | null;
  currency: string;
  clientBillableRateAmount: number | null;
  clientSourceBillableRateAmount: number | null;
  clientCurrency: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): AgencyProjectRecord {
  return {
    id: row.id,
    teamId: row.teamId,
    clientId: row.clientId,
    clientName: row.clientName,
    name: row.name,
    colorHueId: row.colorHueId,
    ...readStoredEntityIcon(row),
    billableRateAmount: row.billableRateAmount,
    sourceBillableRateAmount: row.sourceBillableRateAmount,
    currency: row.currency,
    clientBillableRateAmount: row.clientBillableRateAmount,
    clientSourceBillableRateAmount: row.clientSourceBillableRateAmount,
    clientCurrency: row.clientCurrency,
    deletedAt: row.deletedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function normalizeColorHueId(colorHueId: number | null | undefined): number | null {
  if (colorHueId == null) return null;
  if (!Number.isInteger(colorHueId) || colorHueId < 1 || colorHueId > 12) {
    throw new ORPCError("BAD_REQUEST", { message: "colorHueId must be between 1 and 12." });
  }
  return colorHueId;
}

export async function listAgencyProjects(
  actorUserId: string,
  input: {
    teamId: string;
    clientId?: string;
    archiveFilter?: AgencyClientArchiveFilter;
    trashFilter?: AgencyProjectTrashFilter;
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");

  const archiveFilter = input.archiveFilter ?? "nonarchived";
  const trashFilter = input.trashFilter ?? "active";
  const clientArchiveFilters = [];
  if (archiveFilter === "archived") {
    clientArchiveFilters.push(isNotNull(agencyOpsClient.archivedAt));
  } else if (archiveFilter === "nonarchived") {
    clientArchiveFilters.push(isNull(agencyOpsClient.archivedAt));
  }

  const projectTrashFilters = [];
  if (trashFilter === "trashed") {
    projectTrashFilters.push(isNotNull(agencyOpsProject.deletedAt));
  } else if (trashFilter === "active") {
    projectTrashFilters.push(isNull(agencyOpsProject.deletedAt));
  }

  const rows = await db
    .select({
      id: agencyOpsProject.id,
      teamId: agencyOpsProject.teamId,
      clientId: agencyOpsProject.clientId,
      clientName: agencyOpsClient.name,
      name: agencyOpsProject.name,
      colorHueId: agencyOpsProject.colorHueId,
      iconKey: agencyOpsProject.iconKey,
      iconSource: agencyOpsProject.iconSource,
      billableRateAmount: agencyOpsProject.billableRateAmount,
      sourceBillableRateAmount: agencyOpsProject.sourceBillableRateAmount,
      currency: agencyOpsProject.currency,
      clientBillableRateAmount: agencyOpsClient.billableRateAmount,
      clientSourceBillableRateAmount: agencyOpsClient.sourceBillableRateAmount,
      clientCurrency: agencyOpsClient.currency,
      deletedAt: agencyOpsProject.deletedAt,
      createdAt: agencyOpsProject.createdAt,
      updatedAt: agencyOpsProject.updatedAt,
    })
    .from(agencyOpsProject)
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .where(
      and(
        eq(agencyOpsProject.teamId, input.teamId),
        ...clientArchiveFilters,
        ...projectTrashFilters,
        input.clientId ? eq(agencyOpsProject.clientId, input.clientId) : undefined,
      ),
    )
    .orderBy(asc(agencyOpsProject.name));

  return {
    items: rows.map(mapProjectRow),
  };
}

export async function createAgencyProject(
  actorUserId: string,
  input: {
    teamId: string;
    clientId: string;
    name: string;
    colorHueId?: number | null;
    iconKey?: AgencyEntityIconKey | null;
    templateId?: string;
  },
) {
  const colorHueId = normalizeColorHueId(input.colorHueId);
  const icon = assignEntityIconOnWrite({
    name: input.name.trim(),
    iconKeyProvided: input.iconKey !== undefined,
    requestedIconKey: input.iconKey,
  });

  if (input.templateId) {
    const template = await getAgencyProjectTemplateForTeam(actorUserId, {
      teamId: input.teamId,
      templateId: input.templateId,
    });
    const milestones = template.milestones.map((milestone) => ({
      title: milestone.title,
      assigneeUserIds: milestone.assigneeUserIds ?? [],
    }));
    if (milestones.length === 0) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Selected template has no milestones.",
      });
    }
    const created = await createAgencyProjectWithJourney(actorUserId, {
      teamId: input.teamId,
      clientId: input.clientId,
      name: input.name,
      colorHueId,
      iconKey: input.iconKey,
      milestones,
    });
    return created.project;
  }

  await requireAgencyRole(actorUserId, input.teamId, "owner");
  await getClientByIdForTeam(input.teamId, input.clientId);

  const now = new Date();
  const [created] = await db
    .insert(agencyOpsProject)
    .values({
      id: createWorkspaceId("agency-project"),
      teamId: input.teamId,
      clientId: input.clientId,
      name: input.name.trim(),
      colorHueId,
      iconKey: icon.iconKey,
      iconSource: icon.iconSource,
      createdByUserId: actorUserId,
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: agencyOpsProject.id,
      teamId: agencyOpsProject.teamId,
      clientId: agencyOpsProject.clientId,
      name: agencyOpsProject.name,
      colorHueId: agencyOpsProject.colorHueId,
      iconKey: agencyOpsProject.iconKey,
      iconSource: agencyOpsProject.iconSource,
      deletedAt: agencyOpsProject.deletedAt,
      createdAt: agencyOpsProject.createdAt,
      updatedAt: agencyOpsProject.updatedAt,
    });

  if (!created) {
    throw new ORPCError("INTERNAL_SERVER_ERROR");
  }

  const [client] = await db
    .select({
      name: agencyOpsClient.name,
      billableRateAmount: agencyOpsClient.billableRateAmount,
      sourceBillableRateAmount: agencyOpsClient.sourceBillableRateAmount,
      currency: agencyOpsClient.currency,
    })
    .from(agencyOpsClient)
    .where(eq(agencyOpsClient.id, created.clientId))
    .limit(1);

  return mapProjectRow({
    ...created,
    billableRateAmount: null,
    sourceBillableRateAmount: null,
    currency: "USD",
    clientName: client?.name ?? "Unknown",
    clientBillableRateAmount: client?.billableRateAmount ?? null,
    clientSourceBillableRateAmount: client?.sourceBillableRateAmount ?? null,
    clientCurrency: client?.currency ?? "USD",
  });
}

async function loadJourneyStepTimeEntryCounts(stepIds: string[]) {
  const counts = new Map<string, number>();
  if (stepIds.length === 0) return counts;

  const rows = await db
    .select({
      journeyStepId: agencyOpsTimeEntry.journeyStepId,
      entryCount: count(),
    })
    .from(agencyOpsTimeEntry)
    .where(
      and(inArray(agencyOpsTimeEntry.journeyStepId, stepIds), isNull(agencyOpsTimeEntry.deletedAt)),
    )
    .groupBy(agencyOpsTimeEntry.journeyStepId);

  for (const row of rows) {
    if (row.journeyStepId) {
      counts.set(row.journeyStepId, Number(row.entryCount));
    }
  }

  return counts;
}

async function buildAgencyProjectJourneyRecord(
  teamId: string,
  projectId: string,
  actorUserId?: string,
): Promise<AgencyProjectJourneyRecord> {
  const journey = await getJourneyRowForProject(teamId, projectId);

  const stepRows = await db
    .select({
      id: agencyOpsProjectJourneyStep.id,
      journeyId: agencyOpsProjectJourneyStep.journeyId,
      sortOrder: agencyOpsProjectJourneyStep.sortOrder,
      label: agencyOpsProjectJourneyStep.label,
      stepKind: agencyOpsProjectJourneyStep.stepKind,
      status: agencyOpsProjectJourneyStep.status,
      taskId: agencyOpsProjectJourneyStep.taskId,
      createdAt: agencyOpsProjectJourneyStep.createdAt,
      updatedAt: agencyOpsProjectJourneyStep.updatedAt,
    })
    .from(agencyOpsProjectJourneyStep)
    .where(eq(agencyOpsProjectJourneyStep.journeyId, journey.id))
    .orderBy(asc(agencyOpsProjectJourneyStep.sortOrder));

  const taskIds = stepRows
    .map((step) => step.taskId)
    .filter((taskId): taskId is string => Boolean(taskId));
  const tasksById = new Map<string, ProjectTaskRow>();
  if (taskIds.length > 0) {
    const taskRows = await db
      .select(projectTaskColumns)
      .from(agencyOpsProjectTask)
      .where(
        and(eq(agencyOpsProjectTask.teamId, teamId), inArray(agencyOpsProjectTask.id, taskIds)),
      );
    for (const task of taskRows) {
      tasksById.set(task.id, task);
    }
  }

  const tasksWithRates = await attachParentRates([...tasksById.values()]);
  const tasksWithRatesById = new Map(tasksWithRates.map((task) => [task.id, task]));

  const assigneesByTask = await loadTaskAssignees(taskIds);
  const memberStatusesByTask = actorUserId ? await loadTaskMemberStatuses(taskIds) : undefined;
  const blueprintsByTask =
    actorUserId && taskIds.length > 0
      ? await loadTaskBlueprintsForViewer(taskIds, actorUserId)
      : undefined;
  const entryCounts = await loadJourneyStepTimeEntryCounts(stepRows.map((step) => step.id));

  const steps: AgencyProjectJourneyStepRecord[] = await Promise.all(
    stepRows.map(async (step) => {
      const taskRow = step.taskId ? (tasksWithRatesById.get(step.taskId) ?? null) : null;
      const task = taskRow
        ? await buildProjectTaskRecord(
            taskRow,
            assigneesByTask.get(taskRow.id) ?? [],
            actorUserId,
            memberStatusesByTask?.get(taskRow.id),
            blueprintsByTask?.get(taskRow.id),
          )
        : null;

      return {
        id: step.id,
        journeyId: step.journeyId,
        sortOrder: step.sortOrder,
        label: step.label,
        stepKind: step.stepKind,
        status: step.status,
        taskId: step.taskId,
        ...(task ? { task } : {}),
        timeEntryCount: entryCounts.get(step.id) ?? 0,
        createdAt: step.createdAt.toISOString(),
        updatedAt: step.updatedAt.toISOString(),
      };
    }),
  );

  const completedSteps = steps.filter((step) => step.status === "done").length;

  return {
    id: journey.id,
    projectId: journey.projectId,
    createdAt: journey.createdAt.toISOString(),
    updatedAt: journey.updatedAt.toISOString(),
    steps,
    completedSteps,
    totalSteps: steps.length,
  };
}

async function insertJourneyLinkedTask(
  tx: DbTransaction,
  args: {
    teamId: string;
    projectId: string;
    actorUserId: string;
    title: string;
    taskKind: "journey_anchor" | "journey_milestone";
    assigneeUserIds: string[];
    now: Date;
  },
) {
  const taskId = createWorkspaceId("agency-project-task");
  const [task] = await tx
    .insert(agencyOpsProjectTask)
    .values({
      id: taskId,
      teamId: args.teamId,
      projectId: args.projectId,
      title: args.title,
      ...assignEntityIconOnWrite({ name: args.title }),
      status: "open",
      taskKind: args.taskKind,
      assignedToTeam: false,
      createdByUserId: args.actorUserId,
      createdAt: args.now,
      updatedAt: args.now,
    })
    .returning(projectTaskColumns);

  if (!task) {
    throw new ORPCError("INTERNAL_SERVER_ERROR");
  }

  if (args.assigneeUserIds.length > 0) {
    await setTaskAssignees(tx, task.id, args.assigneeUserIds);
  }

  return task;
}

export async function createAgencyProjectWithJourney(
  actorUserId: string,
  input: {
    teamId: string;
    clientId: string;
    name: string;
    colorHueId?: number | null;
    iconKey?: AgencyEntityIconKey | null;
    milestones: Array<{
      title: string;
      assigneeUserIds: string[];
    }>;
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "owner");
  await getClientByIdForTeam(input.teamId, input.clientId);

  if (input.milestones.length === 0) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Add at least one milestone.",
    });
  }

  const colorHueId = normalizeColorHueId(input.colorHueId);
  const projectName = input.name.trim();
  const icon = assignEntityIconOnWrite({
    name: projectName,
    iconKeyProvided: input.iconKey !== undefined,
    requestedIconKey: input.iconKey,
  });
  const now = new Date();
  const projectId = createWorkspaceId("agency-project");
  const journeyId = createWorkspaceId("agency-project-journey");
  const allAssigneeIds = new Set<string>();

  for (const milestone of input.milestones) {
    const title = milestone.title.trim();
    if (!title) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Milestone title is required.",
      });
    }
    for (const userId of milestone.assigneeUserIds) {
      await requireTeamMember(input.teamId, userId);
      allAssigneeIds.add(userId);
    }
  }

  await db.transaction(async (tx) => {
    await tx.insert(agencyOpsProject).values({
      id: projectId,
      teamId: input.teamId,
      clientId: input.clientId,
      name: projectName,
      colorHueId,
      iconKey: icon.iconKey,
      iconSource: icon.iconSource,
      createdByUserId: actorUserId,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(agencyOpsProjectJourney).values({
      id: journeyId,
      projectId,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(agencyOpsProjectJourneyStep).values({
      id: createWorkspaceId("agency-journey-step"),
      journeyId,
      sortOrder: 0,
      label: "Start",
      stepKind: "start",
      status: "done",
      createdAt: now,
      updatedAt: now,
    });

    let sortOrder = 1;
    for (const milestone of input.milestones) {
      const task = await insertJourneyLinkedTask(tx, {
        teamId: input.teamId,
        projectId,
        actorUserId,
        title: milestone.title.trim(),
        taskKind: "journey_milestone",
        assigneeUserIds: [...new Set(milestone.assigneeUserIds)],
        now,
      });

      await tx.insert(agencyOpsProjectJourneyStep).values({
        id: createWorkspaceId("agency-journey-step"),
        journeyId,
        sortOrder,
        label: milestone.title.trim(),
        stepKind: "milestone",
        status: "planned",
        taskId: task.id,
        createdAt: now,
        updatedAt: now,
      });
      sortOrder += 1;
    }

    await tx.insert(agencyOpsProjectJourneyStep).values({
      id: createWorkspaceId("agency-journey-step"),
      journeyId,
      sortOrder,
      label: "Destination",
      stepKind: "destination",
      status: "planned",
      createdAt: now,
      updatedAt: now,
    });

    await insertJourneyLinkedTask(tx, {
      teamId: input.teamId,
      projectId,
      actorUserId,
      title: projectName,
      taskKind: "journey_anchor",
      assigneeUserIds: [...allAssigneeIds],
      now,
    });
  });

  const syncResult = await syncJourneyStepStatuses(input.teamId, projectId);
  await applyJourneySyncNotifications(input.teamId, projectId, actorUserId, syncResult);

  const [client] = await db
    .select({
      name: agencyOpsClient.name,
      billableRateAmount: agencyOpsClient.billableRateAmount,
      sourceBillableRateAmount: agencyOpsClient.sourceBillableRateAmount,
      currency: agencyOpsClient.currency,
    })
    .from(agencyOpsClient)
    .where(eq(agencyOpsClient.id, input.clientId))
    .limit(1);

  const [createdProject] = await db
    .select({
      id: agencyOpsProject.id,
      teamId: agencyOpsProject.teamId,
      clientId: agencyOpsProject.clientId,
      name: agencyOpsProject.name,
      colorHueId: agencyOpsProject.colorHueId,
      iconKey: agencyOpsProject.iconKey,
      iconSource: agencyOpsProject.iconSource,
      billableRateAmount: agencyOpsProject.billableRateAmount,
      sourceBillableRateAmount: agencyOpsProject.sourceBillableRateAmount,
      currency: agencyOpsProject.currency,
      deletedAt: agencyOpsProject.deletedAt,
      createdAt: agencyOpsProject.createdAt,
      updatedAt: agencyOpsProject.updatedAt,
    })
    .from(agencyOpsProject)
    .where(eq(agencyOpsProject.id, projectId))
    .limit(1);

  if (!createdProject) {
    throw new ORPCError("INTERNAL_SERVER_ERROR");
  }

  return {
    project: mapProjectRow({
      ...createdProject,
      clientName: client?.name ?? "Unknown",
      clientBillableRateAmount: client?.billableRateAmount ?? null,
      clientSourceBillableRateAmount: client?.sourceBillableRateAmount ?? null,
      clientCurrency: client?.currency ?? "USD",
    }),
    journey: await buildAgencyProjectJourneyRecord(input.teamId, projectId, actorUserId),
  };
}

export async function getAgencyProjectJourney(
  actorUserId: string,
  input: {
    teamId: string;
    projectId: string;
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");
  await getProjectByIdForTeam(input.teamId, input.projectId, { includeDeleted: true });
  return buildAgencyProjectJourneyRecord(input.teamId, input.projectId, actorUserId);
}

export async function updateAgencyProjectJourneySteps(
  actorUserId: string,
  input: {
    teamId: string;
    projectId: string;
    steps: Array<{
      id: string;
      sortOrder?: number;
      label?: string;
    }>;
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "owner");
  await getProjectByIdForTeam(input.teamId, input.projectId);
  const journey = await getJourneyRowForProject(input.teamId, input.projectId);

  const existingSteps = await db
    .select({
      id: agencyOpsProjectJourneyStep.id,
      stepKind: agencyOpsProjectJourneyStep.stepKind,
    })
    .from(agencyOpsProjectJourneyStep)
    .where(eq(agencyOpsProjectJourneyStep.journeyId, journey.id));

  const existingIds = new Set(existingSteps.map((step) => step.id));
  for (const step of input.steps) {
    if (!existingIds.has(step.id)) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Journey step was not found.",
      });
    }
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    for (const step of input.steps) {
      const patch: {
        sortOrder?: number;
        label?: string;
        updatedAt: Date;
      } = { updatedAt: now };
      if (step.sortOrder !== undefined) patch.sortOrder = step.sortOrder;
      if (step.label !== undefined) {
        const trimmed = step.label.trim();
        if (!trimmed) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Step label is required.",
          });
        }
        patch.label = trimmed;
      }
      if (patch.sortOrder === undefined && patch.label === undefined) continue;

      await tx
        .update(agencyOpsProjectJourneyStep)
        .set(patch)
        .where(
          and(
            eq(agencyOpsProjectJourneyStep.id, step.id),
            eq(agencyOpsProjectJourneyStep.journeyId, journey.id),
          ),
        );
    }

    await tx
      .update(agencyOpsProjectJourney)
      .set({ updatedAt: now })
      .where(eq(agencyOpsProjectJourney.id, journey.id));
  });

  const syncResult = await syncJourneyStepStatuses(input.teamId, input.projectId);
  await applyJourneySyncNotifications(input.teamId, input.projectId, actorUserId, syncResult);
  return buildAgencyProjectJourneyRecord(input.teamId, input.projectId, actorUserId);
}

export async function addAgencyProjectJourneyStep(
  actorUserId: string,
  input: {
    teamId: string;
    projectId: string;
    label: string;
    assigneeUserIds?: string[];
    sortOrder?: number;
    stepKind?: "milestone" | "checkpoint";
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "owner");
  await getProjectByIdForTeam(input.teamId, input.projectId);
  const journey = await getJourneyRowForProject(input.teamId, input.projectId);

  const label = input.label.trim();
  if (!label) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Step label is required.",
    });
  }

  const stepKind = input.stepKind ?? "milestone";
  const assigneeUserIds = [...new Set(input.assigneeUserIds ?? [])];
  for (const userId of assigneeUserIds) {
    await requireTeamMember(input.teamId, userId);
  }

  const existingSteps = await db
    .select({
      id: agencyOpsProjectJourneyStep.id,
      sortOrder: agencyOpsProjectJourneyStep.sortOrder,
      stepKind: agencyOpsProjectJourneyStep.stepKind,
    })
    .from(agencyOpsProjectJourneyStep)
    .where(eq(agencyOpsProjectJourneyStep.journeyId, journey.id))
    .orderBy(asc(agencyOpsProjectJourneyStep.sortOrder));

  const destinationIndex = existingSteps.findIndex((step) => step.stepKind === "destination");
  const insertAt =
    input.sortOrder ??
    (destinationIndex >= 0 ? existingSteps[destinationIndex]!.sortOrder : existingSteps.length);

  const now = new Date();
  await db.transaction(async (tx) => {
    for (const step of existingSteps) {
      if (step.sortOrder >= insertAt && step.stepKind !== "destination") {
        await tx
          .update(agencyOpsProjectJourneyStep)
          .set({ sortOrder: step.sortOrder + 1, updatedAt: now })
          .where(eq(agencyOpsProjectJourneyStep.id, step.id));
      }
      if (step.stepKind === "destination" && step.sortOrder >= insertAt) {
        await tx
          .update(agencyOpsProjectJourneyStep)
          .set({ sortOrder: step.sortOrder + 1, updatedAt: now })
          .where(eq(agencyOpsProjectJourneyStep.id, step.id));
      }
    }

    const task = await insertJourneyLinkedTask(tx, {
      teamId: input.teamId,
      projectId: input.projectId,
      actorUserId,
      title: label,
      taskKind: "journey_milestone",
      assigneeUserIds,
      now,
    });

    await tx.insert(agencyOpsProjectJourneyStep).values({
      id: createWorkspaceId("agency-journey-step"),
      journeyId: journey.id,
      sortOrder: insertAt,
      label,
      stepKind,
      status: "planned",
      taskId: task.id,
      createdAt: now,
      updatedAt: now,
    });

    await tx
      .update(agencyOpsProjectJourney)
      .set({ updatedAt: now })
      .where(eq(agencyOpsProjectJourney.id, journey.id));
  });

  const syncResult = await syncJourneyStepStatuses(input.teamId, input.projectId);
  await applyJourneySyncNotifications(input.teamId, input.projectId, actorUserId, syncResult);
  return buildAgencyProjectJourneyRecord(input.teamId, input.projectId, actorUserId);
}

export async function previewRemoveAgencyProjectJourneyStep(
  actorUserId: string,
  input: {
    teamId: string;
    projectId: string;
    stepId: string;
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");
  await getProjectByIdForTeam(input.teamId, input.projectId);
  const journey = await getJourneyRowForProject(input.teamId, input.projectId);

  const [step] = await db
    .select({
      id: agencyOpsProjectJourneyStep.id,
      label: agencyOpsProjectJourneyStep.label,
      stepKind: agencyOpsProjectJourneyStep.stepKind,
    })
    .from(agencyOpsProjectJourneyStep)
    .where(
      and(
        eq(agencyOpsProjectJourneyStep.id, input.stepId),
        eq(agencyOpsProjectJourneyStep.journeyId, journey.id),
      ),
    )
    .limit(1);

  if (!step) {
    throw new ORPCError("NOT_FOUND", {
      message: "Journey step was not found.",
    });
  }

  if (step.stepKind === "start" || step.stepKind === "destination") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Start and destination steps cannot be removed.",
    });
  }

  const [countRow] = await db
    .select({ entryCount: count() })
    .from(agencyOpsTimeEntry)
    .where(
      and(eq(agencyOpsTimeEntry.journeyStepId, step.id), isNull(agencyOpsTimeEntry.deletedAt)),
    );

  return {
    stepId: step.id,
    label: step.label,
    timeEntryCount: Number(countRow?.entryCount ?? 0),
  };
}

export async function removeAgencyProjectJourneyStep(
  actorUserId: string,
  input: {
    teamId: string;
    projectId: string;
    stepId: string;
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "owner");
  await getProjectByIdForTeam(input.teamId, input.projectId);
  const journey = await getJourneyRowForProject(input.teamId, input.projectId);

  const [step] = await db
    .select({
      id: agencyOpsProjectJourneyStep.id,
      taskId: agencyOpsProjectJourneyStep.taskId,
      stepKind: agencyOpsProjectJourneyStep.stepKind,
    })
    .from(agencyOpsProjectJourneyStep)
    .where(
      and(
        eq(agencyOpsProjectJourneyStep.id, input.stepId),
        eq(agencyOpsProjectJourneyStep.journeyId, journey.id),
      ),
    )
    .limit(1);

  if (!step) {
    throw new ORPCError("NOT_FOUND", {
      message: "Journey step was not found.",
    });
  }

  if (step.stepKind === "start" || step.stepKind === "destination") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Start and destination steps cannot be removed.",
    });
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(agencyOpsTimeEntry)
      .set({ journeyStepId: null, updatedAt: now })
      .where(eq(agencyOpsTimeEntry.journeyStepId, step.id));

    if (step.taskId) {
      await tx
        .update(agencyOpsProjectTask)
        .set({ taskKind: "standard", updatedAt: now })
        .where(eq(agencyOpsProjectTask.id, step.taskId));
    }

    await tx.delete(agencyOpsProjectJourneyStep).where(eq(agencyOpsProjectJourneyStep.id, step.id));

    await tx
      .update(agencyOpsProjectJourney)
      .set({ updatedAt: now })
      .where(eq(agencyOpsProjectJourney.id, journey.id));
  });

  const syncResult = await syncJourneyStepStatuses(input.teamId, input.projectId);
  await applyJourneySyncNotifications(input.teamId, input.projectId, actorUserId, syncResult);
  return buildAgencyProjectJourneyRecord(input.teamId, input.projectId, actorUserId);
}

export async function updateAgencyProject(
  actorUserId: string,
  input: {
    teamId: string;
    projectId: string;
    clientId?: string;
    name?: string;
    colorHueId?: number | null;
    iconKey?: AgencyEntityIconKey | null;
    billableRateAmount?: number | null;
    currency?: string;
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "owner");
  await getProjectByIdForTeam(input.teamId, input.projectId);

  if (input.clientId) {
    await getClientByIdForTeam(input.teamId, input.clientId);
  }

  const [current] = await db
    .select({
      name: agencyOpsProject.name,
      iconKey: agencyOpsProject.iconKey,
      iconSource: agencyOpsProject.iconSource,
      currency: agencyOpsProject.currency,
      billableRateAmount: agencyOpsProject.billableRateAmount,
      sourceBillableRateAmount: agencyOpsProject.sourceBillableRateAmount,
    })
    .from(agencyOpsProject)
    .where(
      and(
        eq(agencyOpsProject.teamId, input.teamId),
        eq(agencyOpsProject.id, input.projectId),
        isNull(agencyOpsProject.deletedAt),
      ),
    )
    .limit(1);

  if (!current) {
    throw new ORPCError("NOT_FOUND");
  }

  const now = new Date();
  const patch: {
    clientId?: string;
    name?: string;
    colorHueId?: number | null;
    iconKey?: string | null;
    iconSource?: "auto" | "manual";
    billableRateAmount?: number | null;
    currency?: string;
    sourceBillableRateAmount?: number | null;
    fxRate?: string;
    fxAsOf?: Date | null;
    updatedAt: Date;
  } = { updatedAt: now };
  if (input.clientId !== undefined) patch.clientId = input.clientId;
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.colorHueId !== undefined) patch.colorHueId = normalizeColorHueId(input.colorHueId);
  if (input.iconKey !== undefined || input.name !== undefined) {
    const icon = assignEntityIconOnWrite({
      name: patch.name ?? current.name,
      iconKeyProvided: input.iconKey !== undefined,
      requestedIconKey: input.iconKey,
      existing: readStoredEntityIcon(current),
    });
    patch.iconKey = icon.iconKey;
    patch.iconSource = icon.iconSource;
  }

  if (input.billableRateAmount !== undefined || input.currency !== undefined) {
    if (input.billableRateAmount === null) {
      patch.billableRateAmount = null;
      patch.sourceBillableRateAmount = null;
      patch.fxRate = "1";
      patch.fxAsOf = null;
    } else {
      const moneyCtx = await loadMoneyResolveContext(actorUserId, { teamId: input.teamId });
      const sourceCurrency = (
        input.currency ??
        current.currency ??
        moneyCtx.agencyCurrency
      ).toUpperCase();
      const sourceAmount =
        input.billableRateAmount ?? current.sourceBillableRateAmount ?? current.billableRateAmount;
      if (sourceAmount == null) {
        throw new ORPCError("BAD_REQUEST", { message: "Project rate amount is required." });
      }
      const money = moneyCtx.resolve(sourceAmount, sourceCurrency);
      await moneyCtx.lock();
      patch.billableRateAmount = money.amount;
      patch.currency = money.sourceCurrency;
      patch.sourceBillableRateAmount = money.sourceAmount;
      patch.fxRate = money.fxRate;
      patch.fxAsOf = new Date(money.fxAsOf);
    }
  }

  const [updated] = await db
    .update(agencyOpsProject)
    .set(patch)
    .where(
      and(
        eq(agencyOpsProject.teamId, input.teamId),
        eq(agencyOpsProject.id, input.projectId),
        isNull(agencyOpsProject.deletedAt),
      ),
    )
    .returning({
      id: agencyOpsProject.id,
      teamId: agencyOpsProject.teamId,
      clientId: agencyOpsProject.clientId,
      name: agencyOpsProject.name,
      colorHueId: agencyOpsProject.colorHueId,
      iconKey: agencyOpsProject.iconKey,
      iconSource: agencyOpsProject.iconSource,
      billableRateAmount: agencyOpsProject.billableRateAmount,
      sourceBillableRateAmount: agencyOpsProject.sourceBillableRateAmount,
      currency: agencyOpsProject.currency,
      deletedAt: agencyOpsProject.deletedAt,
      createdAt: agencyOpsProject.createdAt,
      updatedAt: agencyOpsProject.updatedAt,
    });

  if (!updated) {
    throw new ORPCError("NOT_FOUND");
  }

  const [client] = await db
    .select({
      name: agencyOpsClient.name,
      billableRateAmount: agencyOpsClient.billableRateAmount,
      sourceBillableRateAmount: agencyOpsClient.sourceBillableRateAmount,
      currency: agencyOpsClient.currency,
    })
    .from(agencyOpsClient)
    .where(eq(agencyOpsClient.id, updated.clientId))
    .limit(1);

  return mapProjectRow({
    ...updated,
    clientName: client?.name ?? "Unknown",
    clientBillableRateAmount: client?.billableRateAmount ?? null,
    clientSourceBillableRateAmount: client?.sourceBillableRateAmount ?? null,
    clientCurrency: client?.currency ?? "USD",
  });
}

export async function deleteAgencyProject(
  actorUserId: string,
  input: {
    teamId: string;
    projectId: string;
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "owner");
  const project = await getProjectByIdForTeam(input.teamId, input.projectId, {
    includeDeleted: true,
  });

  if (project.deletedAt) {
    return { projectId: input.projectId, deleted: true as const };
  }

  const [activeTimer] = await db
    .select({ id: agencyOpsActiveTimer.id })
    .from(agencyOpsActiveTimer)
    .where(
      and(
        eq(agencyOpsActiveTimer.teamId, input.teamId),
        eq(agencyOpsActiveTimer.projectId, input.projectId),
      ),
    )
    .limit(1);

  if (activeTimer) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Stop the active timer on this project before moving it to trash.",
    });
  }

  const now = new Date();
  await db
    .update(agencyOpsProject)
    .set({ deletedAt: now, updatedAt: now })
    .where(
      and(eq(agencyOpsProject.teamId, input.teamId), eq(agencyOpsProject.id, input.projectId)),
    );

  return { projectId: input.projectId, deleted: true as const };
}

export async function restoreAgencyProject(
  actorUserId: string,
  input: {
    teamId: string;
    projectId: string;
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "owner");
  await getProjectByIdForTeam(input.teamId, input.projectId, { includeDeleted: true });

  const now = new Date();
  await db
    .update(agencyOpsProject)
    .set({ deletedAt: null, updatedAt: now })
    .where(
      and(eq(agencyOpsProject.teamId, input.teamId), eq(agencyOpsProject.id, input.projectId)),
    );

  return { projectId: input.projectId, deleted: false as const };
}
