import { intro, isCancel, outro, select, spinner, text, confirm } from "@clack/prompts";
import { db } from "@orch/db";
import {
  agencyOpsClient,
  agencyOpsClientContact,
  agencyOpsExpense,
  agencyOpsInvoice,
  agencyOpsInvoiceLineItem,
  agencyOpsMemberCapacity,
  agencyOpsMemberRate,
  agencyOpsMemberTenureProfile,
  agencyOpsPayoutLine,
  agencyOpsPayoutRun,
  agencyOpsPayoutSection,
  agencyOpsProject,
  agencyOpsProjectTask,
  agencyOpsProjectTaskAssignee,
  agencyOpsTenurePolicy,
  agencyOpsTimeEntry,
  user,
  workspaceTeam,
  workspaceTeamMember,
  type WorkspaceTeamRole,
} from "@orch/db/schema";
import { createWorkspaceId } from "@orch/workspace";
import { env } from "@orch/env/server";
import { standardWeekCapacitySeconds } from "@orch/api/routers/agency-ops/resourcing/work-schedule";
import { assignEntityIconOnWrite } from "@orch/api/routers/agency-ops/shared/entity-icon-catalog";
import { and, eq } from "drizzle-orm";
import { ensureCredentialAccount } from "../../lib/ensure-credential-account";
import {
  appendMassiveAgencyData,
  insertInBatches,
  resolveAgencySeedScale,
  type AgencySeedScale,
} from "../../lib/seed-agency-scale";
import type {
  MemberRecord,
  SeedActor,
  SeedContext,
  SeedUserKey,
} from "../../lib/seed-agency-types";

type SeedUserDefinition = {
  key: SeedUserKey;
  name: string;
  email: string;
};

const SEED_USERS: SeedUserDefinition[] = [
  { key: "founder", name: "Avery Founder", email: "founder@orch.test" },
  { key: "ops", name: "Mina Operator", email: "ops@orch.test" },
  { key: "analyst", name: "Noah Analyst", email: "analyst@orch.test" },
  { key: "designer", name: "Luna Designer", email: "designer@orch.test" },
  { key: "dev", name: "Felix Dev", email: "dev@orch.test" },
];

const DEFAULT_SEED_PASSWORD = "orch1234";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shiftDate(date: Date, options: { days?: number; hours?: number; minutes?: number } = {}) {
  const { days = 0, hours = 0, minutes = 0 } = options;
  return new Date(date.getTime() + days * 86400000 + hours * 3600000 + minutes * 60000);
}

function getWeekStart(date: Date, weekStartsOn = 1) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ---------------------------------------------------------------------------
// Auth / User helpers
// ---------------------------------------------------------------------------

async function ensureSeedUsers(password: string): Promise<Map<SeedUserKey, SeedActor>> {
  const s = spinner();
  s.start("Ensuring seed users exist");

  const created = new Map<SeedUserKey, SeedActor>();

  for (const def of SEED_USERS) {
    const [existing] = await db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(eq(user.email, def.email))
      .limit(1);

    if (existing) {
      await db.update(user).set({ lifetimePro: true }).where(eq(user.id, existing.id));
      await ensureCredentialAccount(existing.id);
      created.set(def.key, existing);
      s.message(`User ${def.email} already exists`);
    } else {
      const userId = createWorkspaceId("user");
      const now = new Date();

      await db.insert(user).values({
        id: userId,
        name: def.name,
        email: def.email,
        emailVerified: true,
        lifetimePro: true,
        createdAt: now,
        updatedAt: now,
      });

      await ensureCredentialAccount(userId, { password });

      created.set(def.key, { id: userId, name: def.name, email: def.email });
      s.message(`Created user ${def.email}`);
    }
  }

  s.stop("Seed users ready");
  return created;
}

// ---------------------------------------------------------------------------
// Interactive prompts
// ---------------------------------------------------------------------------

async function pickTeam(): Promise<{
  teamId: string;
  teamName: string;
  members: MemberRecord[];
} | null> {
  const existingTeams = await db
    .select({ id: workspaceTeam.id, name: workspaceTeam.name })
    .from(workspaceTeam)
    .orderBy(workspaceTeam.name);

  const teamOptions: Array<{ value: string; label: string; hint?: string }> = [
    { value: "__create__", label: "Create a new team", hint: "Start fresh" },
  ];

  for (const t of existingTeams) {
    teamOptions.push({ value: t.id, label: t.name });
  }

  if (existingTeams.length > 0) {
    teamOptions.push({ value: "__skip__", label: "Skip — no team", hint: "Exit without seeding" });
  }

  const choice = await select({
    message: "Select a team to seed agency data into:",
    options: teamOptions,
  });

  if (isCancel(choice)) return null;

  if (choice === "__skip__") return null;

  if (choice === "__create__") {
    return createNewTeam();
  }

  const teamId = choice as string;
  const team = existingTeams.find((t) => t.id === teamId);
  const members = await loadTeamMembers(teamId);
  return { teamId, teamName: team?.name ?? "Unknown", members };
}

async function createNewTeam(): Promise<{
  teamId: string;
  teamName: string;
  members: MemberRecord[];
}> {
  const allUsers = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .orderBy(user.name);

  const ownerChoice = await select({
    message: "Who should be the team owner?",
    options: allUsers.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` })),
  });

  if (isCancel(ownerChoice)) throw new Error("Cancelled");

  const owner = allUsers.find((u) => u.id === ownerChoice);
  const teamName = await text({
    message: "Team name:",
    defaultValue: "My Agency",
    validate: (v) =>
      typeof v === "string" && v.trim().length === 0 ? "Name is required" : undefined,
  });

  if (isCancel(teamName)) throw new Error("Cancelled");

  const s = spinner();
  s.start("Creating team");

  const teamId = createWorkspaceId("team");
  const now = new Date();

  await db.insert(workspaceTeam).values({
    id: teamId,
    name: teamName as string,
    createdByUserId: owner!.id,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(workspaceTeamMember).values({
    id: createWorkspaceId("team-member"),
    teamId,
    userId: owner!.id,
    role: "owner",
    createdAt: now,
    updatedAt: now,
  });

  s.stop(`Team "${teamName}" created`);

  return {
    teamId,
    teamName: teamName as string,
    members: [{ userId: owner!.id, userName: owner!.name, userEmail: owner!.email, role: "owner" }],
  };
}

async function loadTeamMembers(teamId: string): Promise<MemberRecord[]> {
  const rows = await db
    .select({
      userId: workspaceTeamMember.userId,
      role: workspaceTeamMember.role,
      userName: user.name,
      userEmail: user.email,
    })
    .from(workspaceTeamMember)
    .innerJoin(user, eq(user.id, workspaceTeamMember.userId))
    .where(eq(workspaceTeamMember.teamId, teamId));

  return rows.map((r) => ({
    userId: r.userId,
    userName: r.userName,
    userEmail: r.userEmail,
    role: r.role as MemberRecord["role"],
  }));
}

async function manageMembers(
  teamId: string,
  currentMembers: MemberRecord[],
): Promise<MemberRecord[]> {
  let members = [...currentMembers];

  const manage = async () => {
    const allUserRows = await db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .orderBy(user.name);

    const memberUserIds = new Set(members.map((m) => m.userId));
    const availableUsers = allUserRows.filter((u) => !memberUserIds.has(u.id));

    const action = await select({
      message: `Team members (${members.length}):`,
      options: [
        { value: "add", label: "Add a member" },
        ...(members.length > 1 ? [{ value: "remove", label: "Remove a member" }] : []),
        { value: "done", label: "Done — continue to seeding" },
      ],
    });

    if (isCancel(action)) throw new Error("Cancelled");

    if (action === "add") {
      const chosen = await select({
        message: "Select a user to add:",
        options: [
          ...availableUsers.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` })),
          { value: "__create__", label: "Create a new seed user" },
        ],
      });

      if (isCancel(chosen)) return;

      let userId: string;
      let userName: string;
      let userEmail: string;

      if (chosen === "__create__") {
        const name = await text({ message: "New member name:", defaultValue: "New Member" });
        if (isCancel(name)) return;
        const email = await text({
          message: "New member email:",
          defaultValue: "new@orch.test",
          validate: (v) => (typeof v === "string" && v.includes("@") ? undefined : "Invalid email"),
        });
        if (isCancel(email)) return;
        const pw = await text({
          message: "Password:",
          defaultValue: DEFAULT_SEED_PASSWORD,
        });
        if (isCancel(pw)) return;

        const createSpinner = spinner();
        createSpinner.start("Creating new user");
        const now = new Date();
        const newUserId = createWorkspaceId("user");
        await db.insert(user).values({
          id: newUserId,
          name: name as string,
          email: email as string,
          emailVerified: true,
          lifetimePro: true,
          createdAt: now,
          updatedAt: now,
        });
        await ensureCredentialAccount(newUserId, { password: pw as string });
        userId = newUserId;
        userName = name as string;
        userEmail = email as string;
        createSpinner.stop(`Created ${userName}`);
      } else {
        const u = allUserRows.find((r) => r.id === chosen);
        if (!u) return;
        userId = u.id;
        userName = u.name;
        userEmail = u.email;
      }

      const role = await select({
        message: "Role:",
        options: [
          { value: "editor", label: "Editor" },
          { value: "viewer", label: "Viewer" },
          { value: "owner", label: "Owner" },
        ],
      });

      if (isCancel(role)) return;

      const now = new Date();
      await db
        .insert(workspaceTeamMember)
        .values({
          id: createWorkspaceId("team-member"),
          teamId,
          userId,
          role: role as WorkspaceTeamRole,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [workspaceTeamMember.teamId, workspaceTeamMember.userId],
          set: { role: role as WorkspaceTeamRole, updatedAt: now },
        });

      members.push({ userId, userName, userEmail, role: role as WorkspaceTeamRole });
      return;
    }

    if (action === "remove") {
      const removeChoice = await select({
        message: "Select a member to remove:",
        options: members.map((m) => ({
          value: m.userId,
          label: `${m.userName} (${m.userEmail}) — ${m.role}`,
        })),
      });

      if (isCancel(removeChoice)) return;

      await db
        .delete(workspaceTeamMember)
        .where(
          and(
            eq(workspaceTeamMember.teamId, teamId),
            eq(workspaceTeamMember.userId, removeChoice as string),
          ),
        );

      members = members.filter((m) => m.userId !== removeChoice);
      return;
    }
  };

  await manage();
  return members;
}

// ---------------------------------------------------------------------------
// Agency data seeders
// ---------------------------------------------------------------------------

type ClientDef = {
  id: string;
  name: string;
  contact: { name: string; email: string; phone: string };
  archived?: boolean;
};

type ProjectDef = {
  id: string;
  clientId: string;
  name: string;
};

type TaskDef = {
  id: string;
  projectId: string;
  title: string;
  status: "open" | "in_progress" | "done" | "archived";
  assignedToTeam?: boolean;
  assigneeUserIds: string[];
  dueDate: Date | null;
};

function buildSeedData(ctx: SeedContext, scale: AgencySeedScale = "default") {
  const { now, members } = ctx;

  const getMemberIds = () => members.map((m) => m.userId);
  const pickMember = (exclude?: string): string => {
    const ids = getMemberIds().filter((id) => id !== exclude);
    return ids[Math.floor(Math.random() * ids.length)] ?? getMemberIds()[0] ?? "";
  };
  const daysAgo = (n: number) => shiftDate(now, { days: -n });
  const daysFromNow = (n: number) => shiftDate(now, { days: n });

  // Clients
  const clients: ClientDef[] = [
    {
      id: createWorkspaceId("agency-client"),
      name: "Acme Corp",
      contact: { name: "Sarah Johnson", email: "sarah@acme.com", phone: "+1-555-0101" },
    },
    {
      id: createWorkspaceId("agency-client"),
      name: "Globex Inc",
      contact: { name: "Bob Smith", email: "bob@globex.com", phone: "+1-555-0102" },
    },
    {
      id: createWorkspaceId("agency-client"),
      name: "Initech",
      contact: { name: "Bill Lumbergh", email: "bill@initech.com", phone: "" },
      archived: true,
    },
  ];

  // Projects
  const projects: ProjectDef[] = [
    {
      id: createWorkspaceId("agency-project"),
      clientId: clients[0]!.id,
      name: "Q2 Brand Campaign",
    },
    { id: createWorkspaceId("agency-project"), clientId: clients[0]!.id, name: "Website Redesign" },
    { id: createWorkspaceId("agency-project"), clientId: clients[1]!.id, name: "Mobile App v3" },
    {
      id: createWorkspaceId("agency-project"),
      clientId: clients[1]!.id,
      name: "Cloud Infrastructure Audit",
    },
    {
      id: createWorkspaceId("agency-project"),
      clientId: clients[2]!.id,
      name: "Legacy System Migration",
    },
  ];

  // Tasks
  const tasks: TaskDef[] = [
    {
      id: createWorkspaceId("agency-task"),
      projectId: projects[1]!.id,
      title: "Campaign kickoff checklist",
      status: "in_progress",
      assigneeUserIds: [pickMember()],
      dueDate: daysFromNow(2),
    },
    {
      id: createWorkspaceId("agency-task"),
      projectId: projects[0]!.id,
      title: "Finalize creative brief",
      status: "done",
      assigneeUserIds: [pickMember()],
      dueDate: daysAgo(5),
    },
    {
      id: createWorkspaceId("agency-task"),
      projectId: projects[0]!.id,
      title: "Produce social media assets",
      status: "in_progress",
      assigneeUserIds: [pickMember()],
      dueDate: daysFromNow(3),
    },
    {
      id: createWorkspaceId("agency-task"),
      projectId: projects[0]!.id,
      title: "Set up campaign tracking",
      status: "open",
      assigneeUserIds: [],
      dueDate: daysFromNow(7),
    },
    {
      id: createWorkspaceId("agency-task"),
      projectId: projects[1]!.id,
      title: "Design new homepage mockups",
      status: "done",
      assigneeUserIds: [pickMember()],
      dueDate: daysAgo(3),
    },
    {
      id: createWorkspaceId("agency-task"),
      projectId: projects[1]!.id,
      title: "Implement responsive breakpoints",
      status: "in_progress",
      assigneeUserIds: [pickMember()],
      dueDate: daysFromNow(5),
    },
    {
      id: createWorkspaceId("agency-task"),
      projectId: projects[1]!.id,
      title: "Accessibility audit",
      status: "open",
      assigneeUserIds: [],
      dueDate: daysFromNow(10),
    },
    {
      id: createWorkspaceId("agency-task"),
      projectId: projects[2]!.id,
      title: "Implement user onboarding flow",
      status: "in_progress",
      assigneeUserIds: [pickMember()],
      dueDate: daysFromNow(4),
    },
    {
      id: createWorkspaceId("agency-task"),
      projectId: projects[2]!.id,
      title: "Push notification setup",
      status: "open",
      assigneeUserIds: [pickMember()],
      dueDate: daysFromNow(8),
    },
    {
      id: createWorkspaceId("agency-task"),
      projectId: projects[2]!.id,
      title: "Beta testing coordination",
      status: "open",
      assigneeUserIds: [],
      dueDate: daysFromNow(14),
    },
    {
      id: createWorkspaceId("agency-task"),
      projectId: projects[3]!.id,
      title: "Security compliance review",
      status: "done",
      assigneeUserIds: [pickMember()],
      dueDate: daysAgo(2),
    },
    {
      id: createWorkspaceId("agency-task"),
      projectId: projects[3]!.id,
      title: "Cost optimization report",
      status: "in_progress",
      assigneeUserIds: [pickMember()],
      dueDate: daysFromNow(6),
    },
    {
      id: createWorkspaceId("agency-task"),
      projectId: projects[4]!.id,
      title: "Data migration ETL pipeline",
      status: "archived",
      assigneeUserIds: [],
      dueDate: null,
    },
  ];

  // Time entries spanning the past 2 weeks
  const timeEntries: Array<{
    id: string;
    projectId: string;
    taskId: string | null;
    userId: string;
    source: "timer" | "manual";
    description: string;
    startedAt: Date;
    endedAt: Date;
    durationSeconds: number;
  }> = [];

  for (let day = 1; day <= 14; day++) {
    const date = daysAgo(day);
    const hour = 9 + Math.floor(Math.random() * 8);

    for (const member of members) {
      if (Math.random() > 0.4) continue; // ~60% chance of having entries each day

      const numEntries = 1 + Math.floor(Math.random() * 2);
      for (let e = 0; e < numEntries; e++) {
        const project = projects[Math.floor(Math.random() * projects.length)]!;
        const relTasks = tasks.filter((t) => t.projectId === project.id);
        const task =
          relTasks.length > 0 ? relTasks[Math.floor(Math.random() * relTasks.length)]! : null;
        const startH = hour + e * 2 + Math.floor(Math.random() * 2);
        const durationM = 15 + Math.floor(Math.random() * 225);
        const start = new Date(date);
        start.setHours(startH, Math.floor(Math.random() * 60), 0, 0);
        const end = new Date(start.getTime() + durationM * 60000);

        timeEntries.push({
          id: createWorkspaceId("agency-time-entry"),
          projectId: project.id,
          taskId: task?.id ?? null,
          userId: member.userId,
          source: Math.random() > 0.3 ? "timer" : "manual",
          description: task ? `Work on ${task.title}` : `General ${project.name} work`,
          startedAt: start,
          endedAt: end,
          durationSeconds: durationM * 60,
        });
      }
    }
  }

  const base = { clients, projects, tasks, timeEntries };
  return scale === "massive" ? appendMassiveAgencyData(ctx, base) : base;
}

async function seedAgencyData(ctx: SeedContext, scale: AgencySeedScale = "default") {
  const s = spinner();
  s.start("Building seed data");

  const data = buildSeedData(ctx, scale);
  const ownerId =
    ctx.members.find((m) => m.role === "owner")?.userId ?? ctx.members[0]?.userId ?? "";
  const now = ctx.now;
  const teamId = ctx.teamId;

  s.message("Seeding clients...");
  for (const c of data.clients) {
    await db.insert(agencyOpsClient).values({
      id: c.id,
      teamId,
      name: c.name,
      createdByUserId: ownerId,
      createdAt: now,
      updatedAt: now,
      archivedAt: c.archived ? shiftDate(now, { days: -30 }) : null,
    });

    if (c.contact) {
      await db.insert(agencyOpsClientContact).values({
        id: createWorkspaceId("agency-contact"),
        teamId,
        clientId: c.id,
        name: c.contact.name,
        email: c.contact.email,
        phone: c.contact.phone,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  s.message("Seeding projects...");
  for (const p of data.projects) {
    await db.insert(agencyOpsProject).values({
      id: p.id,
      teamId,
      clientId: p.clientId,
      name: p.name,
      ...assignEntityIconOnWrite({ name: p.name }),
      createdByUserId: ownerId,
      createdAt: now,
      updatedAt: now,
    });
  }

  s.message("Seeding tasks...");
  for (const t of data.tasks) {
    await db.insert(agencyOpsProjectTask).values({
      id: t.id,
      teamId,
      projectId: t.projectId,
      title: t.title,
      ...assignEntityIconOnWrite({ name: t.title }),
      status: t.status,
      assignedToTeam: t.assignedToTeam ?? false,
      dueDate: t.dueDate,
      createdByUserId: ownerId,
      createdAt: now,
      updatedAt: now,
    });

    if (!t.assignedToTeam && t.assigneeUserIds.length > 0) {
      await db.insert(agencyOpsProjectTaskAssignee).values(
        t.assigneeUserIds.map((userId) => ({
          taskId: t.id,
          userId,
        })),
      );
    }
  }

  s.message("Seeding time entries...");
  await insertInBatches(data.timeEntries, async (chunk) => {
    await db.insert(agencyOpsTimeEntry).values(
      chunk.map((te) => ({
        id: te.id,
        teamId,
        projectId: te.projectId,
        taskId: te.taskId,
        userId: te.userId,
        source: te.source,
        description: te.description,
        startedAt: te.startedAt,
        endedAt: te.endedAt,
        durationSeconds: te.durationSeconds,
        createdAt: te.startedAt,
        updatedAt: te.startedAt,
      })),
    );
  });

  s.message("Seeding member rates...");
  for (const member of ctx.members) {
    const costRate = member.role === "owner" ? 5000 : member.role === "editor" ? 3000 : 1500;
    const billableRate = member.role === "owner" ? 15000 : member.role === "editor" ? 10000 : 5000;
    await db
      .insert(agencyOpsMemberRate)
      .values({
        id: createWorkspaceId("agency-rate"),
        teamId,
        userId: member.userId,
        costRateAmount: costRate,
        billableRateAmount: billableRate,
        currency: "USD",
        effectiveFrom: now,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [agencyOpsMemberRate.teamId, agencyOpsMemberRate.userId],
        set: { costRateAmount: costRate, billableRateAmount: billableRate, updatedAt: now },
      });
  }

  s.message("Seeding member capacity...");
  const seedWeekStartsOn = 1;
  const seedDailyHours = 8;
  const seedWeekendDays = 2;
  const weekStart = getWeekStart(now, seedWeekStartsOn);
  const capacitySeconds = standardWeekCapacitySeconds(seedDailyHours, seedWeekendDays);
  for (const member of ctx.members) {
    await db
      .insert(agencyOpsMemberCapacity)
      .values({
        id: createWorkspaceId("agency-capacity"),
        teamId,
        userId: member.userId,
        weekStart,
        capacitySeconds,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          agencyOpsMemberCapacity.teamId,
          agencyOpsMemberCapacity.userId,
          agencyOpsMemberCapacity.weekStart,
        ],
        set: { capacitySeconds, updatedAt: now },
      });
  }

  s.message("Seeding invoices...");
  const activeClients = data.clients.filter((c) => !c.archived);
  const invoicePeriodStart = shiftDate(now, { days: -30 });
  const invoicePeriodEnd = now;

  for (let ci = 0; ci < activeClients.length; ci++) {
    const client = activeClients[ci]!;
    const clientProjects = data.projects.filter((p) => p.clientId === client.id);
    const clientTimeEntries = data.timeEntries.filter((te) =>
      clientProjects.some((cp) => cp.id === te.projectId),
    );
    const totalSeconds = clientTimeEntries.reduce((sum, te) => sum + te.durationSeconds, 0);

    const invoiceStatuses: Array<"draft" | "sent" | "paid"> = ["sent", "paid", "draft"];
    const status = invoiceStatuses[ci] ?? "draft";

    const invoiceId = createWorkspaceId("agency-invoice");
    const invoiceNumber = `INV-${String(ci + 1).padStart(4, "0")}`;

    const avgRate = ctx.members[0] ? 10000 : 10000;
    const amount = Math.round((totalSeconds / 3600) * avgRate);

    await db.insert(agencyOpsInvoice).values({
      id: invoiceId,
      teamId,
      clientId: client.id,
      number: invoiceNumber,
      status,
      amount,
      receivedAmount: status === "paid" ? amount : 0,
      currency: "USD",
      periodStart: invoicePeriodStart,
      periodEnd: invoicePeriodEnd,
      issuedAt: status !== "draft" ? invoicePeriodEnd : null,
      paidAt: status === "paid" ? shiftDate(invoicePeriodEnd, { days: 5 }) : null,
      createdByUserId: ownerId,
      createdAt: invoicePeriodEnd,
      updatedAt: invoicePeriodEnd,
    });

    // Line items — group time entries by project
    for (const proj of clientProjects) {
      const projEntries = clientTimeEntries.filter((te) => te.projectId === proj.id);
      if (projEntries.length === 0) continue;
      const projSeconds = projEntries.reduce((sum, te) => sum + te.durationSeconds, 0);
      const projAmount = Math.round((projSeconds / 3600) * avgRate);

      await db.insert(agencyOpsInvoiceLineItem).values({
        id: createWorkspaceId("agency-line-item"),
        invoiceId,
        description: `${proj.name} — time entries`,
        projectId: proj.id,
        durationSeconds: projSeconds,
        rateAmount: avgRate,
        amount: projAmount,
        fromTimeEntries: true,
        createdAt: invoicePeriodEnd,
      });
    }
  }

  s.message("Seeding Money expenses + sample adjustment payout...");
  await db.insert(agencyOpsExpense).values([
    {
      id: createWorkspaceId("agency-expense"),
      teamId,
      name: "Notion",
      kind: "subscription",
      period: "monthly",
      note: "Team workspace",
      amount: 2_000,
      currency: "USD",
      status: "due",
      paidAmount: 0,
      nextDueAt: shiftDate(now, { days: 12 }),
      occurredAt: null,
      createdByUserId: ownerId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createWorkspaceId("agency-expense"),
      teamId,
      name: "Office supplies",
      kind: "one_time",
      period: null,
      note: "Printer paper + toner",
      amount: 8_500,
      currency: "USD",
      status: "paid",
      paidAmount: 8_500,
      nextDueAt: null,
      occurredAt: shiftDate(now, { days: -3 }),
      createdByUserId: ownerId,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  const payoutPeriodStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
  );
  const payoutPeriodEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );
  const payoutRunId = createWorkspaceId("agency-payout-run");
  const salariesSectionId = createWorkspaceId("agency-payout-sec");
  const charitySectionId = createWorkspaceId("agency-payout-sec");
  await db.insert(agencyOpsPayoutRun).values({
    id: payoutRunId,
    teamId,
    periodStart: payoutPeriodStart,
    periodEnd: payoutPeriodEnd,
    status: "draft",
    currency: "USD",
    createdByUserId: ownerId,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(agencyOpsPayoutSection).values([
    {
      id: salariesSectionId,
      runId: payoutRunId,
      key: "salaries",
      title: "Salaries",
      sortOrder: 0,
      createdAt: now,
    },
    {
      id: charitySectionId,
      runId: payoutRunId,
      key: "charity",
      title: "Charity",
      sortOrder: 5,
      createdAt: now,
    },
  ]);
  await db.insert(agencyOpsPayoutLine).values({
    id: createWorkspaceId("agency-payout-line"),
    sectionId: charitySectionId,
    payeeUserId: null,
    label: "Local food bank",
    cohortKey: null,
    amount: 15_000,
    paidAmount: 0,
    status: "draft",
    durationSeconds: 0,
    rateAmount: 0,
    createdAt: now,
    updatedAt: now,
  });

  s.message("Seeding tenure policy...");
  await db
    .insert(agencyOpsTenurePolicy)
    .values({
      id: createWorkspaceId("agency-tenure-policy"),
      teamId,
      fiscalYearStartMonth: 1,
      fiscalYearStartDay: 1,
      quarterlyMinHours: 525,
      monthlyMinHours: 200,
      penaltyMonths: 6,
      internDurationMonths: 4,
      internDurationWeeks: 0,
      requiredDailyHours: 8,
      weekStartsOn: 1,
      weekendDurationDays: 2,
      offDayReduceHours: 8,
      policyEffectiveFrom: shiftDate(now, { days: -365 }),
      enabled: true,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [agencyOpsTenurePolicy.teamId],
      set: {
        enabled: true,
        requiredDailyHours: 8,
        weekStartsOn: 1,
        weekendDurationDays: 2,
        updatedAt: now,
      },
    });

  s.message("Seeding member tenure profiles...");
  for (const member of ctx.members) {
    await db
      .insert(agencyOpsMemberTenureProfile)
      .values({
        id: createWorkspaceId("agency-tenure-profile"),
        teamId,
        userId: member.userId,
        internCountsTowardTenure: false,
        internExemptFromQuarterMin: true,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [agencyOpsMemberTenureProfile.teamId, agencyOpsMemberTenureProfile.userId],
        set: { updatedAt: now },
      });
  }

  s.stop("Agency data seeded successfully");

  return {
    clientsCount: data.clients.length,
    projectsCount: data.projects.length,
    tasksCount: data.tasks.length,
    showcaseTaskTitle: "Thread showcase — all message formats",
    timeEntriesCount: data.timeEntries.length,
    invoicesCount: activeClients.length,
    membersCount: ctx.members.length,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function resolveSeedTeam(teamId: string | null): Promise<{
  teamId: string;
  teamName: string;
  members: MemberRecord[];
}> {
  if (teamId) {
    const [team] = await db
      .select({ id: workspaceTeam.id, name: workspaceTeam.name })
      .from(workspaceTeam)
      .where(eq(workspaceTeam.id, teamId))
      .limit(1);

    if (!team) {
      throw new Error(`Team not found: ${teamId}`);
    }

    const members = await loadTeamMembers(team.id);
    return { teamId: team.id, teamName: team.name, members };
  }

  const [founder] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, "founder@orch.test"))
    .limit(1);

  if (founder) {
    const [ownedTeam] = await db
      .select({ id: workspaceTeam.id, name: workspaceTeam.name })
      .from(workspaceTeam)
      .innerJoin(workspaceTeamMember, eq(workspaceTeamMember.teamId, workspaceTeam.id))
      .where(eq(workspaceTeamMember.userId, founder.id))
      .limit(1);

    if (ownedTeam) {
      const members = await loadTeamMembers(ownedTeam.id);
      return { teamId: ownedTeam.id, teamName: ownedTeam.name, members };
    }
  }

  const [fallbackTeam] = await db
    .select({ id: workspaceTeam.id, name: workspaceTeam.name })
    .from(workspaceTeam)
    .limit(1);

  if (!fallbackTeam) {
    throw new Error("No team available for agency seed. Run db:seed first or pass --team-id.");
  }

  const members = await loadTeamMembers(fallbackTeam.id);
  return { teamId: fallbackTeam.id, teamName: fallbackTeam.name, members };
}

type AgencyCliOptions = {
  yes: boolean;
  teamId: string | null;
  scale: AgencySeedScale;
  help: boolean;
};

function parseAgencyCli(argv: string[]): AgencyCliOptions {
  let yes = false;
  let teamId: string | null = null;
  let help = false;
  let scale = resolveAgencySeedScale(env.BRAINIAC_SEED_SCALE);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument) continue;

    if (argument === "--help" || argument === "-h") {
      help = true;
      continue;
    }

    if (argument === "--yes" || argument === "-y") {
      yes = true;
      continue;
    }

    if (argument === "--team-id") {
      const value = argv[index + 1]?.trim();
      if (!value) throw new Error("Missing value for --team-id.");
      teamId = value;
      index += 1;
      continue;
    }

    if (argument.startsWith("--team-id=")) {
      const value = argument.slice("--team-id=".length).trim();
      if (!value) throw new Error("Missing value for --team-id.");
      teamId = value;
      continue;
    }

    if (argument === "--scale") {
      const value = argv[index + 1]?.trim();
      if (!value) throw new Error("Missing value for --scale.");
      scale = resolveAgencySeedScale(value);
      index += 1;
      continue;
    }

    if (argument.startsWith("--scale=")) {
      scale = resolveAgencySeedScale(argument.slice("--scale=".length));
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return { yes, teamId, scale, help };
}

async function main() {
  const cli = parseAgencyCli(process.argv.slice(2));

  if (cli.help) {
    console.log("Usage: bun run db:seed:agency [--yes] [--team-id <id>] [--scale default|massive]");
    return;
  }

  intro("Orch Agency Seed");

  const password = env.BRAINIAC_SEED_PASSWORD?.trim() || DEFAULT_SEED_PASSWORD;

  // 1. Ensure seed users exist
  const actors = await ensureSeedUsers(password);

  const team = cli.yes ? await resolveSeedTeam(cli.teamId) : await pickTeam();
  if (!team) {
    outro("No team selected. Exiting.");
    process.exit(0);
    return;
  }

  let members = team.members;

  if (!cli.yes) {
    const manageMore = await confirm({
      message: `Manage members for "${team.teamName}"? Currently ${members.length} member(s).`,
      initialValue: true,
    });

    if (!isCancel(manageMore) && manageMore) {
      members = await manageMembers(team.teamId, members);
    }

    const proceed = await confirm({
      message: `Seed comprehensive agency data into "${team.teamName}" with ${members.length} member(s)?`,
      initialValue: true,
    });

    if (isCancel(proceed) || !proceed) {
      outro("Seed cancelled.");
      process.exit(0);
      return;
    }
  }

  // 5. Seed all agency data
  const ctx: SeedContext = {
    now: new Date(),
    teamId: team.teamId,
    teamName: team.teamName,
    members,
    actors,
  };

  const stats = await seedAgencyData(ctx, cli.scale);

  // 6. Summary
  console.log("");
  console.log("── Seed Summary ──────────────────────────────");
  console.log(`  Team:        ${ctx.teamName} (${ctx.teamId})`);
  console.log(`  Members:     ${stats.membersCount}`);
  for (const m of members) {
    console.log(`    • ${m.userName} (${m.userEmail}) — ${m.role}`);
  }
  console.log(`  Clients:     ${stats.clientsCount}`);
  console.log(`  Projects:    ${stats.projectsCount}`);
  console.log(`  Tasks:       ${stats.tasksCount}`);
  console.log(`  Showcase:    ${stats.showcaseTaskTitle}`);
  console.log(`  Time entries: ${stats.timeEntriesCount}`);
  console.log(`  Invoices:    ${stats.invoicesCount}`);
  console.log("──────────────────────────────────────────────");
  console.log("");
  console.log("Demo credentials (password: " + password + "):");
  for (const def of SEED_USERS) {
    console.log(`  ${def.email} — ${def.name}`);
  }
  console.log("");

  outro("Agency seed complete!");
}

void main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("");
    console.error("Seed agency failed.");
    console.error(error);
    process.exit(1);
  });
