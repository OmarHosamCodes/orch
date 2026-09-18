import { describe, expect, test } from "bun:test";

import {
  buildMoneyNeedsActionItems,
  moneyNeedsActionEmptyCopy,
  moneyNeedsActionStatus,
} from "./money-needs-action";

describe("buildMoneyNeedsActionItems", () => {
  test("ranks by remaining amount then due expenses", () => {
    const items = buildMoneyNeedsActionItems({
      currency: "EGP",
      clientRemainingAmount: 50_000,
      salaryPoolRemainingAmount: 300_000_00,
      profitShareRemainingAmount: 80_000_00,
      dueExpenses: [
        {
          name: "Figma",
          kind: "subscription",
          remainingAmount: 20_000,
          canRecordPayment: true,
        },
        {
          name: "Rent",
          kind: "subscription",
          remainingAmount: 40_000,
          canRecordPayment: true,
        },
      ],
    });

    expect(items.map((item) => item.kind)).toEqual([
      "salary-pool",
      "profit-share",
      "expenses-due",
      "client-remaining",
    ]);
    expect(items[0]?.actionLabel).toBe("Pay");
    expect(items[0]?.party).toBe("team");
    const expensesItem = items.find((item) => item.kind === "expenses-due");
    expect(expensesItem?.title).toBe("Due expenses");
    expect(expensesItem?.meta).toBe("2 due this period");
    expect(expensesItem?.expense).toBe("due");
    expect(items.at(-1)?.title).toBe("Client remaining");
  });

  test("names a single due expense", () => {
    const items = buildMoneyNeedsActionItems({
      currency: "EGP",
      clientRemainingAmount: 0,
      salaryPoolRemainingAmount: 0,
      profitShareRemainingAmount: 0,
      dueExpenses: [
        {
          name: "Adobe",
          kind: "subscription",
          remainingAmount: 12_000,
          canRecordPayment: true,
        },
      ],
    });
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe("Adobe");
    expect(items[0]?.actionLabel).toBe("Pay");
  });

  test("skips zero remaining buckets", () => {
    expect(
      buildMoneyNeedsActionItems({
        currency: "EGP",
        clientRemainingAmount: 0,
        salaryPoolRemainingAmount: 0,
        profitShareRemainingAmount: 0,
        dueExpenses: [
          { name: "Paid tool", kind: "subscription", remainingAmount: 0, canRecordPayment: false },
        ],
      }),
    ).toEqual([]);
  });
});

describe("moneyNeedsActionEmptyCopy", () => {
  test("tells the owner the period is clear", () => {
    expect(moneyNeedsActionEmptyCopy().title).toBe("Nothing to collect or pay");
  });
});

describe("moneyNeedsActionStatus", () => {
  test("loading wins over error and ready", () => {
    expect(moneyNeedsActionStatus("ready", "loading", "error")).toBe("loading");
  });

  test("scoreboard or expenses error fail the queue", () => {
    expect(moneyNeedsActionStatus("error", "ready", "ready")).toBe("error");
    expect(moneyNeedsActionStatus("ready", "error", "ready")).toBe("error");
  });
});
