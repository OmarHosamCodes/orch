import { db } from "@orch/db";
import {
  agencyOpsClient,
  agencyOpsClientContact,
  agencyOpsDepartment,
  agencyOpsExpense,
  agencyOpsInvoice,
  agencyOpsInvoiceLineItem,
  agencyOpsMemberCapacity,
  agencyOpsMemberHrProfile,
  agencyOpsMemberProfileAlert,
  agencyOpsMemberRate,
  agencyOpsMemberTenureProfile,
  agencyOpsMoneySettings,
  agencyOpsProject,
  agencyOpsProjectTask,
  agencyOpsProjectTaskAssignee,
  agencyOpsTenurePolicy,
  agencyOpsTimeEntry,
  dashboardWorkspace,
  user,
  workspaceTeam,
  workspaceTeamMember,
} from "@orch/db/schema";
import { assignEntityIconOnWrite } from "@orch/api/routers/agency-ops/shared/entity-icon-catalog";
import { createWorkspaceId } from "@orch/workspace";
import {
  createWorkspaceKanbanBlock,
  createWorkspaceKanbanCard,
  createWorkspaceKanbanColumn,
  createWorkspaceNode,
  createWorkspaceNodeTab,
  createWorkspaceNotesBlock,
  createWorkspaceTask,
  createWorkspaceTaskListBlock,
  normalizeWorkspaceNode,
  type WorkspaceNode,
  type WorkspaceNodeTint,
} from "@orch/workspace";
import { and, eq, sql } from "drizzle-orm";

const TEAM_ID = "team-4b534bb0-2d16-4cd9-9683-240e433929f4";
const OWNER_EMAIL = "omarhosamcodes@gmail.com";

const FILM_MEMBERS: Array<{ name: string; email: string; role: "editor" | "viewer" }> = [
  { name: "Maya Chen", email: "maya.chen@studio.internal", role: "editor" },
  { name: "Luca Rossi", email: "luca.rossi@studio.internal", role: "editor" },
  { name: "Amira Hassan", email: "amira.hassan@studio.internal", role: "editor" },
  { name: "Noah Patel", email: "noah.patel@studio.internal", role: "editor" },
  { name: "Sofia Alvarez", email: "sofia.alvarez@studio.internal", role: "editor" },
  { name: "Jonas Berg", email: "jonas.berg@studio.internal", role: "editor" },
  { name: "Priya Nair", email: "priya.nair@studio.internal", role: "editor" },
  { name: "Eli Park", email: "eli.park@studio.internal", role: "editor" },
  { name: "Hana Okada", email: "hana.okada@studio.internal", role: "editor" },
  { name: "Mateo Silva", email: "mateo.silva@studio.internal", role: "editor" },
  { name: "Leila Farouk", email: "leila.farouk@studio.internal", role: "editor" },
  { name: "Owen Blake", email: "owen.blake@studio.internal", role: "viewer" },
  { name: "Iris Vogel", email: "iris.vogel@studio.internal", role: "editor" },
  { name: "Samir Qureshi", email: "samir.qureshi@studio.internal", role: "editor" },
  { name: "Clara Jensen", email: "clara.jensen@studio.internal", role: "editor" },
  { name: "Theo Marin", email: "theo.marin@studio.internal", role: "editor" },
  { name: "Yara Haddad", email: "yara.haddad@studio.internal", role: "editor" },
  { name: "Kenji Mori", email: "kenji.mori@studio.internal", role: "editor" },
  { name: "Aisha Mensah", email: "aisha.mensah@studio.internal", role: "editor" },
  { name: "Felix Navarro", email: "felix.navarro@studio.internal", role: "viewer" },
  { name: "Nina Kowalski", email: "nina.kowalski@studio.internal", role: "editor" },
  { name: "Ravi Shah", email: "ravi.shah@studio.internal", role: "editor" },
  { name: "Lina Ortega", email: "lina.ortega@studio.internal", role: "editor" },
];

const CLIENTS: Array<{ name: string; contact: string; email: string; rate: number }> = [
  { name: "Harbor Digital", contact: "Elena Ward", email: "elena@harbordigital.com", rate: 15000 },
  { name: "Meridian Studio", contact: "James Cole", email: "james@meridian.studio", rate: 16500 },
  { name: "Slate & Partners", contact: "Nora Slate", email: "nora@slatepartners.com", rate: 18000 },
  { name: "North Sea Media", contact: "Erik Holm", email: "erik@northsea.media", rate: 14000 },
  { name: "Copperline", contact: "Ada Brooks", email: "ada@copperline.co", rate: 15500 },
  { name: "Fieldnote", contact: "Tomás Ruiz", email: "tomas@fieldnote.io", rate: 14500 },
  { name: "Lumen Civic", contact: "Priya Sen", email: "priya@lumencivic.org", rate: 12000 },
  { name: "Arc & Grain", contact: "Will Hart", email: "will@arcandgrain.com", rate: 16000 },
  { name: "Kite & Co", contact: "Sara Kim", email: "sara@kiteandco.com", rate: 13500 },
  { name: "Velvet Room", contact: "Mia Laurent", email: "mia@velvetroom.tv", rate: 17000 },
];

const PROJECTS_BY_CLIENT: Record<string, string[]> = {
  "Harbor Digital": ["Site rebuild", "Product narrative", "Motion system"],
  "Meridian Studio": ["Brand system", "Campaign film", "Launch site"],
  "Slate & Partners": ["Pitch room", "Annual report", "Partner portal"],
  "North Sea Media": ["Paid social", "Always-on content", "Audience map"],
  "Copperline": ["Commerce refresh", "Packaging suite"],
  Fieldnote: ["Research desk", "Field app"],
  "Lumen Civic": ["Civic brief", "Workshop kit"],
  "Arc & Grain": ["Retail identity", "Lookbook"],
  "Kite & Co": ["Retention program", "Lifecycle mail"],
  "Velvet Room": ["Series titles", "Trailer suite"],
};

const TASK_TITLES = [
  "Homepage comps",
  "Motion pass",
  "Client review",
  "Build navigation",
  "Copy lock",
  "Art direction",
  "Prototype flow",
  "QA pass",
  "Stakeholder sync",
  "Color system",
  "Type pairing",
  "Asset export",
  "Storyboard",
  "Edit assembly",
  "Sound mix notes",
  "Launch checklist",
  "Analytics setup",
  "Workshop agenda",
];

const DESCRIPTIONS = [
  "Desk time on comps",
  "Client notes into the board",
  "Build pass before review",
  "Cut and caption pass",
  "Workshop prep",
  "Handoff package",
  "Research synthesis",
  "Motion timing",
];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)]!;
}

function weekdaysBack(now: Date, count: number): Date[] {
  const days: Date[] = [];
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  while (days.length < count) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) {
      days.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return days;
}

function getWeekStart(date: Date, weekStartsOn = 1) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function wipeTeamAgency(teamId: string) {
  const tables = await db.execute(sql`
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'team_id'
      AND c.table_name LIKE 'agency_ops%'
      AND t.table_type = 'BASE TABLE'
  `);

  const names = (tables.rows as Array<{ table_name: string }>).map((row) => row.table_name);
  await db.execute(sql.raw(`
    DELETE FROM agency_ops_invoice_line_item
    WHERE invoice_id IN (SELECT id FROM agency_ops_invoice WHERE team_id = '${teamId}')
  `));
  await db.execute(sql.raw(`
    DELETE FROM agency_ops_project_task_assignee
    WHERE task_id IN (SELECT id FROM agency_ops_project_task WHERE team_id = '${teamId}')
  `));
  const preferred = [
    "agency_ops_invoice",
    "agency_ops_time_entry",
    "agency_ops_active_timer",
    "agency_ops_project_task",
    "agency_ops_project",
    "agency_ops_expense",
    "agency_ops_client_contact",
    "agency_ops_client",
    "agency_ops_member_profile_alert",
    "agency_ops_money_pending_adjustment",
    "agency_ops_payout_run",
    "agency_ops_salary_pool",
    "agency_ops_report",
    "agency_ops_member_rate",
    "agency_ops_member_capacity",
    "agency_ops_member_hr_profile",
    "agency_ops_member_tenure_profile",
    "agency_ops_member_leave",
    "agency_ops_department",
  ];
  const ordered = [...preferred.filter((name) => names.includes(name)), ...names.filter((name) => !preferred.includes(name))];

  for (const table of ordered) {
    await db.execute(sql.raw(`DELETE FROM "${table}" WHERE team_id = '${teamId}'`));
  }
}

async function ensureFilmUsers(now: Date) {
  const members: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    role: "owner" | "editor" | "viewer";
  }> = [];

  const [owner] = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.email, OWNER_EMAIL))
    .limit(1);
  if (!owner) throw new Error(`Owner ${OWNER_EMAIL} not found`);

  members.push({
    userId: owner.id,
    userName: owner.name,
    userEmail: owner.email,
    role: "owner",
  });

  for (const film of FILM_MEMBERS) {
    const [existing] = await db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(eq(user.email, film.email))
      .limit(1);

    let userId = existing?.id;
    if (!userId) {
      userId = createWorkspaceId("user");
      await db.insert(user).values({
        id: userId,
        name: film.name,
        email: film.email,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      });
    } else if (existing && existing.name !== film.name) {
      await db.update(user).set({ name: film.name, updatedAt: now }).where(eq(user.id, userId));
    }

    const [membership] = await db
      .select({ id: workspaceTeamMember.id })
      .from(workspaceTeamMember)
      .where(and(eq(workspaceTeamMember.teamId, TEAM_ID), eq(workspaceTeamMember.userId, userId)))
      .limit(1);
    if (!membership) {
      await db.insert(workspaceTeamMember).values({
        id: createWorkspaceId("team-member"),
        teamId: TEAM_ID,
        userId,
        role: film.role,
        createdAt: now,
        updatedAt: now,
      });
    }

    members.push({
      userId,
      userName: film.name,
      userEmail: film.email,
      role: film.role,
    });
  }

  return members;
}

function buildCanvas(ownerUserId: string, now: Date): WorkspaceNode[] {
  const createdAt = now.toISOString();
  const tints: WorkspaceNodeTint[] = ["emerald", "indigo", "sky", "amber", "rose", "neutral"];
  const specs: Array<{
    title: string;
    body: string;
    orchestrator?: boolean;
    links?: number[];
  }> = [
    {
      title: "Harbor Digital — site rebuild",
      body: "Ship the public site without losing the product story. Navigation, case studies, and motion system lock this week.",
      orchestrator: true,
      links: [1, 2, 3, 4],
    },
    {
      title: "Product narrative",
      body: "One sentence per surface. Homepage hero, pricing, and the sales deck must say the same thing.",
    },
    {
      title: "Motion system",
      body: "Easing, type-on, and still-to-film handoff. Keep the board quiet; the product moves.",
    },
    {
      title: "Meridian brand system",
      body: "Type, color, and print rules for the studio refresh. Campaign film hangs off this.",
      orchestrator: true,
      links: [5, 6, 7],
    },
    { title: "Campaign film", body: "30s cut, titles, and sound notes. Review Thursday." },
    { title: "Weekly ops", body: "Capacity, retainers, and what slips. Keep the log honest." },
    { title: "Research desk", body: "Interviews this week: three clients, one prospect. Synthesis Friday." },
    { title: "Support queue", body: "Macros, FAQ, and the two tickets that keep coming back." },
    { title: "Studio finance", body: "Bills this period, outstanding Harbor and Meridian, expense cadence." },
    { title: "Content pipeline", body: "Always-on for North Sea. Three posts in review, two in motion." },
    { title: "Pitch room", body: "Slate & Partners annual. Room layout, leave-behind, and the film loop." },
    { title: "Hiring board", body: "Motion designer and producer. Three conversations this week." },
    { title: "Client workshop", body: "Lumen Civic kit: agenda, boards, and the recap template." },
    { title: "QA lane", body: "Breakpoints, a11y, and the last copy lock before Harbor ships." },
    { title: "Design critique", body: "Thursday 11:00. Bring the Meridian wordmark and Harbor nav." },
    { title: "Delivery calendar", body: "What leaves the studio in the next ten days. No surprises." },
    { title: "Knowledge index", body: "Where briefs, fonts, and film masters live. One link per client." },
    { title: "Retainer pulse", body: "Kite & Co and Fieldnote hours vs the month. Flag overages early." },
    { title: "Lookbook", body: "Arc & Grain print. Sequence, paper, and the stills from the shop." },
    { title: "Trailer suite", body: "Velvet Room titles and the 15s cutdowns. Sound is still open." },
  ];

  const cols = 5;
  const width = 340;
  const height = 230;
  const gapX = 56;
  const gapY = 48;

  return specs.map((spec, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const notes = createWorkspaceNotesBlock({
      title: "Now",
      body: spec.body,
      createdAt,
      updatedAt: createdAt,
    });
    const tasks = createWorkspaceTaskListBlock({
      title: "Open",
      createdAt,
      updatedAt: createdAt,
      tasks: [
        createWorkspaceTask({ text: "Review with the room", completed: index % 3 === 0 }),
        createWorkspaceTask({ text: "Ship the next cut", completed: false }),
      ],
    });
    const nowColumn = createWorkspaceKanbanColumn({ title: "Now" });
    const nextColumn = createWorkspaceKanbanColumn({ title: "Next" });
    const doneColumn = createWorkspaceKanbanColumn({ title: "Done" });
    const board = createWorkspaceKanbanBlock({
      title: "Flow",
      createdAt,
      updatedAt: createdAt,
      columns: [nowColumn, nextColumn, doneColumn],
      cards: [createWorkspaceKanbanCard({ title: spec.title, columnId: nowColumn.id })],
    });
    const tab = createWorkspaceNodeTab({
      title: "Overview",
      createdAt,
      updatedAt: createdAt,
      blocks: [notes, tasks, board],
    });
    const links = spec.links ?? [];
    return normalizeWorkspaceNode(
      createWorkspaceNode({
        id: `film-node-${index + 1}`,
        title: spec.title,
        x: 48 + col * (width + gapX),
        y: 40 + row * (height + gapY),
        width,
        height,
        createdAt,
        updatedAt: createdAt,
        nodeType: spec.orchestrator ? "orchestrator" : "standard",
        ownerUserId,
        visibility: "team",
        teamId: TEAM_ID,
        tabs: [tab],
        connections: links.map((target) => ({ targetNodeId: `film-node-${target + 1}` })),
        dashboard: {
          tint: tints[index % tints.length]!,
          featuredBlocks: [{ tabId: tab.id, blockId: notes.id }],
        },
      }),
    );
  });
}

async function main() {
  const now = new Date();
  const rand = mulberry32(20260918);

  const [team] = await db.select().from(workspaceTeam).where(eq(workspaceTeam.id, TEAM_ID)).limit(1);
  if (!team) throw new Error(`Team ${TEAM_ID} not found`);

  console.log(`Wiping agency data for ${team.name}...`);
  await wipeTeamAgency(TEAM_ID);

  console.log("Ensuring 24 members...");
  const members = await ensureFilmUsers(now);
  const ownerId = members[0]!.userId;

  const departments = [
    { id: createWorkspaceId("agency-department"), name: "Design" },
    { id: createWorkspaceId("agency-department"), name: "Motion" },
    { id: createWorkspaceId("agency-department"), name: "Engineering" },
    { id: createWorkspaceId("agency-department"), name: "Studio" },
  ];
  await db.insert(agencyOpsDepartment).values(
    departments.map((department) => ({
      id: department.id,
      teamId: TEAM_ID,
      name: department.name,
      createdByUserId: ownerId,
      createdAt: now,
      updatedAt: now,
    })),
  );

  await db
    .insert(agencyOpsMoneySettings)
    .values({
      teamId: TEAM_ID,
      currency: "USD",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: agencyOpsMoneySettings.teamId,
      set: { currency: "USD", updatedAt: now },
    });

  await db
    .insert(agencyOpsTenurePolicy)
    .values({
      id: createWorkspaceId("agency-tenure-policy"),
      teamId: TEAM_ID,
      quarterlyMinHours: 525,
      monthlyMinHours: 140,
      requiredDailyHours: 8,
      weekStartsOn: 1,
      weekendDurationDays: 2,
      offDayReduceHours: 8,
      policyEffectiveFrom: new Date(now.getTime() - 365 * 86400000),
      enabled: true,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: agencyOpsTenurePolicy.teamId,
      set: {
        quarterlyMinHours: 525,
        monthlyMinHours: 140,
        requiredDailyHours: 8,
        enabled: true,
        updatedAt: now,
      },
    });

  const clientRows = CLIENTS.map((client) => ({
    id: createWorkspaceId("agency-client"),
    ...client,
  }));

  await db.insert(agencyOpsClient).values(
    clientRows.map((client) => ({
      id: client.id,
      teamId: TEAM_ID,
      name: client.name,
      category: "external" as const,
      billableRateAmount: client.rate,
      currency: "USD",
      sourceBillableRateAmount: client.rate,
      createdByUserId: ownerId,
      createdAt: now,
      updatedAt: now,
    })),
  );

  await db.insert(agencyOpsClientContact).values(
    clientRows.map((client) => ({
      id: createWorkspaceId("agency-contact"),
      teamId: TEAM_ID,
      clientId: client.id,
      name: client.contact,
      email: client.email,
      phone: "",
      createdAt: now,
      updatedAt: now,
    })),
  );

  const projectRows: Array<{ id: string; clientId: string; name: string; rate: number }> = [];
  for (const client of clientRows) {
    for (const name of PROJECTS_BY_CLIENT[client.name] ?? []) {
      projectRows.push({
        id: createWorkspaceId("agency-project"),
        clientId: client.id,
        name,
        rate: client.rate,
      });
    }
  }

  await db.insert(agencyOpsProject).values(
    projectRows.map((project) => ({
      id: project.id,
      teamId: TEAM_ID,
      clientId: project.clientId,
      name: project.name,
      ...assignEntityIconOnWrite({ name: project.name }),
      createdByUserId: ownerId,
      createdAt: now,
      updatedAt: now,
    })),
  );

  const taskRows: Array<{ id: string; projectId: string; title: string }> = [];
  for (const project of projectRows) {
    const count = 3 + Math.floor(rand() * 3);
    const used = new Set<string>();
    for (let i = 0; i < count; i++) {
      let title = pick(rand, TASK_TITLES);
      if (used.has(title.toLowerCase())) {
        title = `${title} ${i + 1}`;
      }
      used.add(title.toLowerCase());
      taskRows.push({
        id: createWorkspaceId("agency-task"),
        projectId: project.id,
        title,
      });
    }
  }

  await db.insert(agencyOpsProjectTask).values(
    taskRows.map((task, index) => ({
      id: task.id,
      teamId: TEAM_ID,
      projectId: task.projectId,
      title: task.title,
      ...assignEntityIconOnWrite({ name: task.title }),
      status: (["open", "in_progress", "done"] as const)[index % 3]!,
      createdByUserId: ownerId,
      createdAt: now,
      updatedAt: now,
    })),
  );

  await db.insert(agencyOpsProjectTaskAssignee).values(
    taskRows.map((task, index) => ({
      taskId: task.id,
      userId: members[index % members.length]!.userId,
    })),
  );

  const days = weekdaysBack(now, 30);
  const entries: Array<{
    id: string;
    projectId: string;
    taskId: string;
    userId: string;
    description: string;
    startedAt: Date;
    endedAt: Date;
    durationSeconds: number;
  }> = [];

  for (const day of days) {
    for (const member of members) {
      if (rand() < 0.12) continue;
      const entryCount = 3 + Math.floor(rand() * 3);
      let remainingMinutes = 5 * 60 + Math.floor(rand() * 180);
      let hour = 9;
      let minute = Math.floor(rand() * 20);
      for (let i = 0; i < entryCount; i++) {
        if (remainingMinutes < 25) break;
        const project = pick(rand, projectRows);
        const projectTasks = taskRows.filter((task) => task.projectId === project.id);
        const task = pick(rand, projectTasks.length > 0 ? projectTasks : taskRows);
        const durationMinutes = Math.min(remainingMinutes, 50 + Math.floor(rand() * 70));
        const extraSeconds = Math.floor(rand() * 50);
        remainingMinutes -= durationMinutes;
        const startedAt = new Date(day);
        startedAt.setHours(hour, minute, Math.floor(rand() * 50), 0);
        const endedAt = new Date(startedAt.getTime() + durationMinutes * 60_000 + extraSeconds * 1000);
        hour = endedAt.getHours();
        minute = endedAt.getMinutes() + 10;
        if (hour >= 18) break;
        entries.push({
          id: createWorkspaceId("agency-time-entry"),
          projectId: project.id,
          taskId: task.id,
          userId: member.userId,
          description: pick(rand, DESCRIPTIONS),
          startedAt,
          endedAt,
          durationSeconds: durationMinutes * 60 + extraSeconds,
        });
      }
    }
  }

  const batchSize = 400;
  for (let offset = 0; offset < entries.length; offset += batchSize) {
    const chunk = entries.slice(offset, offset + batchSize);
    await db.insert(agencyOpsTimeEntry).values(
      chunk.map((entry) => ({
        ...entry,
        teamId: TEAM_ID,
        source: "timer" as const,
        isBillable: true,
        createdAt: entry.startedAt,
        updatedAt: entry.startedAt,
      })),
    );
  }

  const weekStart = getWeekStart(now, 1);
  for (const member of members) {
    const seniority = member.role === "owner" ? 2 : member.role === "editor" ? 1 : 0;
    const cost = 4000 + seniority * 2000;
    const billable = 12000 + seniority * 3000;
    await db.insert(agencyOpsMemberRate).values({
      id: createWorkspaceId("agency-rate"),
      teamId: TEAM_ID,
      userId: member.userId,
      costRateAmount: cost,
      billableRateAmount: billable,
      currency: "USD",
      effectiveFrom: now,
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(agencyOpsMemberCapacity).values({
      id: createWorkspaceId("agency-capacity"),
      teamId: TEAM_ID,
      userId: member.userId,
      weekStart,
      capacitySeconds: 8 * 5 * 3600,
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(agencyOpsMemberHrProfile).values({
      id: createWorkspaceId("agency-hr"),
      teamId: TEAM_ID,
      userId: member.userId,
      departmentId: pick(rand, departments).id,
      status: "active",
      employmentType: "full_time",
      workModel: "hybrid",
      phone: "+1-415-555-0100",
      address: "Studio floor",
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(agencyOpsMemberTenureProfile).values({
      id: createWorkspaceId("agency-tenure-profile"),
      teamId: TEAM_ID,
      userId: member.userId,
      internStart: null,
      internEnd: null,
      internCountsTowardTenure: false,
      internExemptFromQuarterMin: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  const periodStart = days[days.length - 1]!;
  for (let index = 0; index < clientRows.length; index++) {
    const client = clientRows[index]!;
    const clientProjects = projectRows.filter((project) => project.clientId === client.id);
    const clientEntries = entries.filter((entry) =>
      clientProjects.some((project) => project.id === entry.projectId),
    );
    const totalSeconds = clientEntries.reduce((sum, entry) => sum + entry.durationSeconds, 0);
    const amount = Math.round((totalSeconds / 3600) * client.rate);
    const paid = index % 3 === 0;
    const invoiceId = createWorkspaceId("agency-invoice");
    await db.insert(agencyOpsInvoice).values({
      id: invoiceId,
      teamId: TEAM_ID,
      clientId: client.id,
      number: `INV-${String(index + 1).padStart(4, "0")}`,
      status: paid ? "paid" : "sent",
      amount,
      receivedAmount: paid ? amount : Math.round(amount * 0.35),
      currency: "USD",
      periodStart,
      periodEnd: now,
      issuedAt: now,
      paidAt: paid ? now : null,
      createdByUserId: ownerId,
      createdAt: now,
      updatedAt: now,
    });
    for (const project of clientProjects) {
      const projectEntries = clientEntries.filter((entry) => entry.projectId === project.id);
      if (projectEntries.length === 0) continue;
      const seconds = projectEntries.reduce((sum, entry) => sum + entry.durationSeconds, 0);
      await db.insert(agencyOpsInvoiceLineItem).values({
        id: createWorkspaceId("agency-line-item"),
        invoiceId,
        description: `${project.name} — tracked time`,
        projectId: project.id,
        durationSeconds: seconds,
        rateAmount: client.rate,
        amount: Math.round((seconds / 3600) * client.rate),
        fromTimeEntries: true,
        createdAt: now,
      });
    }
  }

  await db.insert(agencyOpsExpense).values([
    {
      id: createWorkspaceId("agency-expense"),
      teamId: TEAM_ID,
      name: "Figma",
      kind: "subscription",
      period: "monthly",
      note: "Studio seats",
      amount: 7500,
      currency: "USD",
      status: "due",
      paidAmount: 0,
      nextDueAt: now,
      createdByUserId: ownerId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createWorkspaceId("agency-expense"),
      teamId: TEAM_ID,
      name: "Studio rent",
      kind: "subscription",
      period: "monthly",
      note: "",
      amount: 420000,
      currency: "USD",
      status: "paid",
      paidAmount: 420000,
      nextDueAt: new Date(now.getTime() + 20 * 86400000),
      createdByUserId: ownerId,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  await db.delete(agencyOpsMemberProfileAlert).where(eq(agencyOpsMemberProfileAlert.teamId, TEAM_ID));

  const nodes = buildCanvas(ownerId, now);
  await db
    .insert(dashboardWorkspace)
    .values({ userId: ownerId, nodes, updatedAt: now })
    .onConflictDoUpdate({
      target: dashboardWorkspace.userId,
      set: { nodes, updatedAt: now },
    });

  const hours = entries.reduce((sum, entry) => sum + entry.durationSeconds, 0) / 3600;
  console.log("Film seed complete.");
  console.log(`  Members: ${members.length}`);
  console.log(`  Clients: ${clientRows.length}`);
  console.log(`  Projects: ${projectRows.length}`);
  console.log(`  Tasks: ${taskRows.length}`);
  console.log(`  Days: ${days.length}`);
  console.log(`  Time entries: ${entries.length} (~${hours.toFixed(0)}h)`);
  console.log(`  Canvas nodes: ${nodes.length}`);
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
