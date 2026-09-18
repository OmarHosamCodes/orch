import { describe, expect, test } from "bun:test";

import {
  groupProjectsByCorridor,
  projectBookCorridor,
  projectBookCorridorLabel,
  projectBookNeedLabel,
  projectBookNeeds,
  projectBudgetUsagePct,
  projectIsAtRisk,
  PROJECT_JOURNEY_STALLED_DAYS,
} from "./projects-book-corridors";

const hoursBudget = {
  hoursBudget: 10,
  hoursLogged: 9,
  costBudgetAmount: null,
  costLoggedAmount: 0,
};

describe("projectBudgetUsagePct", () => {
  test("uses hours budget when configured", () => {
    expect(projectBudgetUsagePct(hoursBudget)).toBe(90);
  });

  test("returns zero without budget", () => {
    expect(projectBudgetUsagePct(null)).toBe(0);
  });
});

describe("projectIsAtRisk", () => {
  test("flags at or above 85%", () => {
    expect(projectIsAtRisk(hoursBudget)).toBe(true);
    expect(
      projectIsAtRisk({
        hoursBudget: 10,
        hoursLogged: 8,
        costBudgetAmount: null,
        costLoggedAmount: 0,
      }),
    ).toBe(false);
  });
});

describe("projectBookCorridor", () => {
  test("trash wins over budget and hours", () => {
    expect(
      projectBookCorridor({
        deletedAt: "2026-09-01T00:00:00.000Z",
        weekDurationSeconds: 3600,
        budget: hoursBudget,
      }),
    ).toBe("trash");
  });

  test("at risk wins over active hours", () => {
    expect(
      projectBookCorridor({
        deletedAt: null,
        weekDurationSeconds: 3600,
        budget: hoursBudget,
      }),
    ).toBe("at_risk");
  });

  test("active vs quiet", () => {
    expect(
      projectBookCorridor({
        deletedAt: null,
        weekDurationSeconds: 1,
        budget: null,
      }),
    ).toBe("active");
    expect(
      projectBookCorridor({
        deletedAt: null,
        weekDurationSeconds: 0,
        budget: null,
      }),
    ).toBe("quiet");
  });
});

describe("projectBookCorridorLabel", () => {
  test("names every corridor", () => {
    expect(projectBookCorridorLabel("at_risk")).toBe("At risk");
    expect(projectBookCorridorLabel("active")).toBe("Active this week");
    expect(projectBookCorridorLabel("quiet")).toBe("Quiet");
    expect(projectBookCorridorLabel("trash")).toBe("In trash");
  });
});

describe("projectBookNeeds", () => {
  test("collects delivery needs for active projects", () => {
    expect(
      projectBookNeeds({
        deletedAt: null,
        budget: hoursBudget,
        clientArchivedAt: "2026-09-01T00:00:00.000Z",
        inheritsClientRate: true,
        journeyIncomplete: true,
        daysSinceLastActivity: PROJECT_JOURNEY_STALLED_DAYS,
      }),
    ).toEqual(["at_risk", "journey_stalled", "client_archived", "rate_override"]);
  });

  test("skips chips for trashed projects", () => {
    expect(
      projectBookNeeds({
        deletedAt: "2026-09-01T00:00:00.000Z",
        budget: hoursBudget,
        clientArchivedAt: null,
        inheritsClientRate: true,
        journeyIncomplete: true,
        daysSinceLastActivity: 30,
      }),
    ).toEqual([]);
  });

  test("journey stalled requires incomplete journey and idle window", () => {
    expect(
      projectBookNeeds({
        deletedAt: null,
        budget: null,
        clientArchivedAt: null,
        inheritsClientRate: false,
        journeyIncomplete: true,
        daysSinceLastActivity: PROJECT_JOURNEY_STALLED_DAYS - 1,
      }),
    ).toEqual(["no_budget"]);
  });
});

describe("projectBookNeedLabel", () => {
  test("names every need chip", () => {
    expect(projectBookNeedLabel("at_risk")).toBe("At risk");
    expect(projectBookNeedLabel("no_budget")).toBe("No budget");
    expect(projectBookNeedLabel("journey_stalled")).toBe("Journey stalled");
    expect(projectBookNeedLabel("client_archived")).toBe("Client archived");
    expect(projectBookNeedLabel("rate_override")).toBe("Inherits rate");
  });
});

describe("groupProjectsByCorridor", () => {
  test("keeps corridor order and drops empty lanes", () => {
    const grouped = groupProjectsByCorridor([
      { corridor: "quiet" as const, name: "Quiet project" },
      { corridor: "at_risk" as const, name: "Hot project" },
      { corridor: "at_risk" as const, name: "Also hot" },
    ]);
    expect(grouped.map((lane) => lane.id)).toEqual(["at_risk", "quiet"]);
    expect(grouped[0]?.items).toHaveLength(2);
  });
});
