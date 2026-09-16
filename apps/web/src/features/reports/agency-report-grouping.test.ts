import { describe, expect, test } from "bun:test";

import {
  aggregateSimilarReportRows,
  applyReportEntriesWaste,
  filterEntriesByShowWaste,
  groupEntriesForDisplay,
  isReportEntryWaste,
  reportSimilarTaskStripeIndexes,
  type AgencyReportEntry,
} from "@/features/reports/agency-report-grouping";

function makeEntry(
  overrides: Partial<AgencyReportEntry> & Pick<AgencyReportEntry, "id">,
): AgencyReportEntry {
  return {
    teamId: "team-1",
    userId: "user-1",
    userName: "Alex",
    projectId: "project-1",
    projectName: "Portal",
    clientId: "client-1",
    clientName: "Acme",
    taskId: null,
    taskTitle: null,
    taskIconKey: null,
    taskIsWaste: null,
    colorHueId: null,
    projectIconKey: null,
    tags: [],
    links: [],
    source: "manual",
    description: "Design review",
    isBillable: true,
    isWaste: false,
    startedAt: "2026-01-01T10:00:00.000Z",
    endedAt: "2026-01-01T11:00:00.000Z",
    durationSeconds: 3_600,
    createdAt: "2026-01-01T10:00:00.000Z",
    updatedAt: "2026-01-01T11:00:00.000Z",
    ...overrides,
  };
}

describe("aggregateSimilarReportRows", () => {
  test("merges rows with same project, task, assignee, and description", () => {
    const rows = aggregateSimilarReportRows([
      makeEntry({ id: "e1", description: "new peeling", durationSeconds: 1_800 }),
      makeEntry({ id: "e2", description: "new peeling", durationSeconds: 900 }),
      makeEntry({ id: "e3", description: "other work", durationSeconds: 600 }),
    ]);

    expect(rows).toHaveLength(2);
    const peeling = rows.find((row) => row.description === "new peeling");
    expect(peeling?.durationSeconds).toBe(2_700);
    expect(peeling?.entryCount).toBe(2);
    expect(peeling?.entries.map((entry) => entry.id).sort()).toEqual(["e1", "e2"]);
  });

  test("keeps rows separate when task or assignee differs", () => {
    const rows = aggregateSimilarReportRows([
      makeEntry({ id: "e1", taskId: "task-a", taskTitle: "Peeling", description: "prep" }),
      makeEntry({ id: "e2", taskId: "task-b", taskTitle: "QA", description: "prep" }),
      makeEntry({ id: "e3", userId: "user-2", userName: "Sam", description: "prep" }),
    ]);

    expect(rows).toHaveLength(3);
  });

  test("lists similar task titles consecutively within a project", () => {
    const rows = aggregateSimilarReportRows([
      makeEntry({
        id: "e1",
        taskId: "task-a",
        taskTitle: "Peeling",
        description: "zzz wrap",
      }),
      makeEntry({
        id: "e2",
        taskId: "task-b",
        taskTitle: "QA",
        description: "mid review",
      }),
      makeEntry({
        id: "e3",
        taskId: "task-a",
        taskTitle: "Peeling",
        description: "aaa prep",
      }),
    ]);

    expect(rows.map((row) => `${row.taskTitle}:${row.description}`)).toEqual([
      "Peeling:aaa prep",
      "Peeling:zzz wrap",
      "QA:mid review",
    ]);
  });

  test("stripes consecutive similar-task clusters with two bands", () => {
    expect(
      reportSimilarTaskStripeIndexes([
        { taskTitle: "Peeling" },
        { taskTitle: "peeling" },
        { taskTitle: "QA" },
        { taskTitle: "QA" },
        { taskTitle: "Ship" },
      ]),
    ).toEqual([0, 0, 1, 1, 0]);
  });

  test("mergeSameTaskNames collapses same title across task ids, descriptions, and assignees", () => {
    const rows = aggregateSimilarReportRows(
      [
        makeEntry({
          id: "e1",
          taskId: "task-a",
          taskTitle: "Peeling",
          description: "prep",
          durationSeconds: 1_800,
        }),
        makeEntry({
          id: "e2",
          taskId: "task-b",
          taskTitle: "Peeling",
          description: "other",
          userId: "user-2",
          userName: "Sam",
          durationSeconds: 900,
        }),
        makeEntry({
          id: "e3",
          taskId: "task-c",
          taskTitle: "QA",
          description: "prep",
          durationSeconds: 600,
        }),
      ],
      { mergeSameTaskNames: true },
    );

    expect(rows).toHaveLength(2);
    const peeling = rows.find((row) => row.taskTitle === "Peeling");
    expect(peeling?.durationSeconds).toBe(2_700);
    expect(peeling?.entryCount).toBe(2);
    expect(peeling?.description).toBe("prep · other");
    expect(peeling?.userName).toBe("Alex · Sam");
    expect(peeling?.entries.map((entry) => entry.id).sort()).toEqual(["e1", "e2"]);
  });

  test("mergeSameTaskNames joins distinct assignees and dedupes same person", () => {
    const rows = aggregateSimilarReportRows(
      [
        makeEntry({
          id: "e1",
          taskId: "task-a",
          taskTitle: "Peeling",
          description: "prep",
          durationSeconds: 1_800,
        }),
        makeEntry({
          id: "e2",
          taskId: "task-b",
          taskTitle: "Peeling",
          description: "other",
          userId: "user-2",
          userName: "Sam",
          durationSeconds: 900,
        }),
        makeEntry({
          id: "e3",
          taskId: "task-c",
          taskTitle: "Peeling",
          description: "again",
          userId: "user-2",
          userName: "Sam",
          durationSeconds: 300,
        }),
        makeEntry({
          id: "e4",
          taskId: "task-d",
          taskTitle: "Peeling",
          description: "third",
          userId: "user-3",
          userName: "Jordan",
          durationSeconds: 200,
        }),
      ],
      { mergeSameTaskNames: true },
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.userName).toBe("Alex · Sam · Jordan");
  });

  test("mergeSameTaskNames joins distinct descriptions and dedupes identical ones", () => {
    const rows = aggregateSimilarReportRows(
      [
        makeEntry({
          id: "e1",
          taskId: "task-a",
          taskTitle: "Peeling",
          description: "prep",
          durationSeconds: 1_800,
        }),
        makeEntry({
          id: "e2",
          taskId: "task-b",
          taskTitle: "Peeling",
          description: "  prep  ",
          userId: "user-2",
          userName: "Sam",
          durationSeconds: 900,
        }),
        makeEntry({
          id: "e3",
          taskId: "task-c",
          taskTitle: "Peeling",
          description: "review",
          durationSeconds: 300,
        }),
      ],
      { mergeSameTaskNames: true },
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.description).toBe("prep · review");
    expect(rows[0]?.entryCount).toBe(3);
  });

  test("mergeSameTaskNames keeps description for a single entry", () => {
    const rows = aggregateSimilarReportRows(
      [
        makeEntry({
          id: "e1",
          taskId: "task-a",
          taskTitle: "Peeling",
          description: "solo note",
          durationSeconds: 600,
        }),
      ],
      { mergeSameTaskNames: true },
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.description).toBe("solo note");
  });

  test("mergeSameTaskNames keeps different titles separate and merges empty titles", () => {
    const rows = aggregateSimilarReportRows(
      [
        makeEntry({
          id: "e1",
          taskId: "task-a",
          taskTitle: null,
          description: "a",
          durationSeconds: 100,
        }),
        makeEntry({
          id: "e2",
          taskId: "task-b",
          taskTitle: "  ",
          description: "b",
          durationSeconds: 200,
        }),
        makeEntry({
          id: "e3",
          taskId: "task-c",
          taskTitle: "QA",
          description: "c",
          durationSeconds: 300,
        }),
      ],
      { mergeSameTaskNames: true },
    );

    expect(rows).toHaveLength(2);
    const untitled = rows.find((row) => !row.taskTitle);
    expect(untitled?.durationSeconds).toBe(300);
    expect(untitled?.entryCount).toBe(2);
    expect(rows.find((row) => row.taskTitle === "QA")?.durationSeconds).toBe(300);
  });

  test("mergeSameTaskNames marks waste when any entry task is waste", () => {
    const rows = aggregateSimilarReportRows(
      [
        makeEntry({ id: "e1", taskId: "task-a", taskTitle: "Cleanup", taskIsWaste: false }),
        makeEntry({ id: "e2", taskId: "task-b", taskTitle: "Cleanup", taskIsWaste: true }),
      ],
      { mergeSameTaskNames: true },
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.taskIsWaste).toBe(true);
  });
});

describe("groupEntriesForDisplay", () => {
  test("groups by client and project before aggregating rows", () => {
    const groups = groupEntriesForDisplay([
      makeEntry({ id: "e1", clientId: "client-b", clientName: "Beta", description: "work" }),
      makeEntry({ id: "e2", clientId: "client-a", clientName: "Alpha", description: "work" }),
      makeEntry({ id: "e3", clientId: "client-a", clientName: "Alpha", description: "work" }),
    ]);

    expect(groups.map((group) => group.clientName)).toEqual(["Alpha", "Beta"]);
    expect(groups[0]?.projects[0]?.rows[0]?.durationSeconds).toBe(7_200);
    expect(groups[0]?.projects[0]?.rows[0]?.entryCount).toBe(2);
    expect(groups[0]?.totalSeconds).toBe(7_200);
    expect(groups[0]?.projects[0]?.totalSeconds).toBe(7_200);
  });

  test("sums project totals across multiple tasks and aggregated rows", () => {
    const groups = groupEntriesForDisplay([
      makeEntry({
        id: "e1",
        projectId: "project-a",
        projectName: "Soul In",
        taskId: "task-a",
        taskTitle: "CRM Management",
        description: "prep",
        durationSeconds: 1_800,
      }),
      makeEntry({
        id: "e2",
        projectId: "project-a",
        projectName: "Soul In",
        taskId: "task-b",
        taskTitle: "QA",
        description: "review",
        durationSeconds: 900,
      }),
      makeEntry({
        id: "e3",
        projectId: "project-a",
        projectName: "Soul In",
        taskId: "task-a",
        taskTitle: "CRM Management",
        description: "prep",
        durationSeconds: 600,
      }),
      makeEntry({
        id: "e4",
        projectId: "project-b",
        projectName: "Website",
        description: "other",
        durationSeconds: 300,
      }),
    ]);

    const soulIn = groups[0]?.projects.find((project) => project.projectName === "Soul In");
    expect(soulIn?.rows).toHaveLength(2);
    expect(soulIn?.totalSeconds).toBe(3_300);
    expect(groups[0]?.totalSeconds).toBe(3_600);
  });

  test("mergeSameTaskNames collapses same titles within a project only", () => {
    const groups = groupEntriesForDisplay(
      [
        makeEntry({
          id: "e1",
          projectId: "project-a",
          projectName: "Soul In",
          taskId: "task-a",
          taskTitle: "CRM",
          description: "prep",
          durationSeconds: 1_000,
        }),
        makeEntry({
          id: "e2",
          projectId: "project-a",
          projectName: "Soul In",
          taskId: "task-b",
          taskTitle: "CRM",
          description: "other",
          durationSeconds: 500,
        }),
        makeEntry({
          id: "e3",
          projectId: "project-b",
          projectName: "Website",
          taskId: "task-c",
          taskTitle: "CRM",
          description: "web",
          durationSeconds: 200,
        }),
      ],
      { mergeSameTaskNames: true },
    );

    const soulIn = groups[0]?.projects.find((project) => project.projectName === "Soul In");
    const website = groups[0]?.projects.find((project) => project.projectName === "Website");
    expect(soulIn?.rows).toHaveLength(1);
    expect(soulIn?.rows[0]?.durationSeconds).toBe(1_500);
    expect(website?.rows).toHaveLength(1);
    expect(website?.rows[0]?.durationSeconds).toBe(200);
  });
});

describe("filterEntriesByShowWaste", () => {
  test("hides all waste when showWaste is all off", () => {
    const entries = [
      makeEntry({ id: "ok", description: "billable" }),
      makeEntry({ id: "entry-waste", isWaste: true }),
      makeEntry({ id: "task-waste", taskIsWaste: true, taskTitle: "Cleanup" }),
      makeEntry({ id: "project-waste", projectName: "Waste bucket" }),
    ];

    const visible = filterEntriesByShowWaste(entries, {
      projects: false,
      tasks: false,
      entries: false,
    });

    expect(visible.map((entry) => entry.id)).toEqual(["ok"]);
  });

  test("reveals only matching waste sources", () => {
    const entries = [
      makeEntry({ id: "ok" }),
      makeEntry({ id: "entry-waste", isWaste: true }),
      makeEntry({ id: "task-waste", taskIsWaste: true }),
      makeEntry({ id: "project-waste", projectName: "Internal Waste" }),
    ];

    expect(
      filterEntriesByShowWaste(entries, {
        projects: false,
        tasks: false,
        entries: true,
      }).map((entry) => entry.id),
    ).toEqual(["ok", "entry-waste"]);

    expect(
      filterEntriesByShowWaste(entries, {
        projects: true,
        tasks: true,
        entries: false,
      }).map((entry) => entry.id),
    ).toEqual(["ok", "task-waste", "project-waste"]);
  });
});

describe("applyReportEntriesWaste", () => {
  test("flips only targeted entries", () => {
    const entries = [
      makeEntry({ id: "keep", isWaste: false }),
      makeEntry({ id: "flip", isWaste: false }),
    ];

    const next = applyReportEntriesWaste(entries, new Set(["flip"]), true);

    expect(next.find((entry) => entry.id === "keep")?.isWaste).toBe(false);
    expect(next.find((entry) => entry.id === "flip")?.isWaste).toBe(true);
    expect(entries.find((entry) => entry.id === "flip")?.isWaste).toBe(false);
  });
});

describe("isReportEntryWaste", () => {
  test("treats entry flag, task flag, and waste labels as waste", () => {
    expect(isReportEntryWaste(makeEntry({ id: "e1", isWaste: true }))).toBe(true);
    expect(
      isReportEntryWaste(makeEntry({ id: "e2", taskIsWaste: true, taskTitle: "Research" })),
    ).toBe(true);
    expect(
      isReportEntryWaste(makeEntry({ id: "e3", taskTitle: "Daily waste", projectName: "Ship" })),
    ).toBe(true);
    expect(isReportEntryWaste(makeEntry({ id: "e4", taskTitle: "wasted effort" }))).toBe(false);
  });

  test("aggregated rows are waste only when every child is waste", () => {
    const mixed = {
      projectName: "Ship",
      taskTitle: "Research",
      taskIsWaste: false,
      entries: [
        makeEntry({ id: "a", isWaste: true }),
        makeEntry({ id: "b", isWaste: false, taskTitle: "Research" }),
      ],
    };
    const allWaste = {
      projectName: "Ship",
      taskTitle: "Research",
      taskIsWaste: false,
      entries: [
        makeEntry({ id: "a", isWaste: true }),
        makeEntry({ id: "b", taskTitle: "waste QA" }),
      ],
    };
    expect(isReportEntryWaste(mixed)).toBe(false);
    expect(isReportEntryWaste(allWaste)).toBe(true);
  });
});

describe("joinedReportRowLinks / merge links", () => {
  test("joins unique links with middle-dot when mergeSameTaskNames", () => {
    const rows = aggregateSimilarReportRows(
      [
        makeEntry({
          id: "e1",
          taskId: "t1",
          taskTitle: "Peeling",
          links: [{ id: "l1", url: "https://a.example" }],
        }),
        makeEntry({
          id: "e2",
          taskId: "t2",
          taskTitle: "Peeling",
          userId: "user-2",
          userName: "Sam",
          links: [
            { id: "l2", url: "https://b.example" },
            { id: "l3", url: "https://a.example" },
          ],
        }),
      ],
      { mergeSameTaskNames: true },
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.links.map((link) => link.url)).toEqual([
      "https://a.example",
      "https://b.example",
    ]);
  });
});
