import { describe, expect, test } from "bun:test";

import { buildMoneyPnlStages, isMoneyPnlLiveMetric } from "./money-pnl-narrative";

describe("isMoneyPnlLiveMetric", () => {
  test("keeps Fin-Sheet spine metrics at zero", () => {
    expect(isMoneyPnlLiveMetric("total-income", 0)).toBe(true);
    expect(isMoneyPnlLiveMetric("received", 0)).toBe(true);
    expect(isMoneyPnlLiveMetric("remaining", 0)).toBe(true);
    expect(isMoneyPnlLiveMetric("team-profit", 0)).toBe(true);
    expect(isMoneyPnlLiveMetric("roi", 0)).toBe(true);
  });

  test("hides optional buckets until they have an amount", () => {
    expect(isMoneyPnlLiveMetric("charity", 0)).toBe(false);
    expect(isMoneyPnlLiveMetric("device-compensation", 0)).toBe(false);
    expect(isMoneyPnlLiveMetric("paid-vacation", 0)).toBe(false);
    expect(isMoneyPnlLiveMetric("salaries", 0)).toBe(false);
    expect(isMoneyPnlLiveMetric("pbc", 1200)).toBe(true);
  });
});

describe("buildMoneyPnlStages", () => {
  test("omits empty deductions and allocations stages", () => {
    const stages = buildMoneyPnlStages([
      {
        id: "income-cash" as const,
        title: "Income",
        primary: { id: "total-income" as const, amount: 10 },
        secondary: [{ id: "remaining" as const, amount: 4 }],
      },
      {
        id: "deductions" as const,
        title: "Deductions",
        primary: { id: "salaries" as const, amount: 0 },
        secondary: [{ id: "expenses" as const, amount: 0 }],
      },
      {
        id: "profitability" as const,
        title: "Profitability",
        primary: { id: "team-profit" as const, amount: 2 },
        secondary: [{ id: "roi" as const, amount: 0.1 }],
      },
      {
        id: "allocations" as const,
        title: "Allocations",
        primary: { id: "charity" as const, amount: 0 },
        secondary: [{ id: "pbc" as const, amount: 0 }],
      },
    ]);

    expect(stages.map((stage) => stage.id)).toEqual(["income-cash", "profitability"]);
    expect(stages[0]?.destinationHint).toBe("Client bills");
  });

  test("keeps deductions when a live cost exists", () => {
    const stages = buildMoneyPnlStages([
      {
        id: "deductions" as const,
        title: "Deductions",
        primary: { id: "salaries" as const, amount: 80 },
        secondary: [{ id: "expenses" as const, amount: 0 }],
      },
    ]);
    expect(stages.map((stage) => stage.id)).toEqual(["deductions"]);
  });
});
