import { describe, expect, test } from "bun:test";

import { buildMoneyBillPersonGroups } from "@/features/billing/money-bill-obligation-rows";
import { formatMoneyBillPeriod } from "@/features/billing/money-bills-rows";
import { moneyLedgerParentStatusLabel } from "@/features/billing/money-bills-table-columns";
import {
  buildMoneyLedgerExpenseParents,
  buildMoneyLedgerParents,
  moneyLedgerTableReceivedHeading,
} from "./money-ledger-rows";

function personGroupFromClients(
  clients: Parameters<typeof buildMoneyBillPersonGroups>[0]["clients"],
) {
  const rows = buildMoneyBillPersonGroups({
    clients,
    members: [],
    adjustments: [],
    pendingAdjustments: [],
    statusFilter: null,
    includeClients: true,
    includeMembers: false,
    includeAdjustments: false,
  });
  const group = rows[0];
  expect(group?.kind).toBe("person-group");
  if (group?.kind !== "person-group") throw new Error("expected person-group");
  return group;
}

const readyClient = {
  kind: "ready" as const,
  id: "ready:1",
  clientId: "c1",
  clientName: "Northwind",
  periodStart: "2026-04-01T00:00:00.000Z",
  periodEnd: "2026-04-30T23:59:59.999Z",
  isCarry: false,
  amount: 1000,
  sourceAmount: 1000,
  rateCurrency: "USD",
  receivedAmount: 0,
  remainingAmount: 1000,
  wasteAmount: 0,
  durationSeconds: 3600,
  number: null,
};

const carryInvoice = {
  kind: "invoice" as const,
  id: "inv-1",
  clientId: "c1",
  clientName: "Northwind",
  periodStart: "2026-03-01T00:00:00.000Z",
  periodEnd: "2026-03-31T23:59:59.999Z",
  isCarry: true,
  amount: 2000,
  sourceAmount: 2000,
  rateCurrency: "USD",
  receivedAmount: 500,
  remainingAmount: 1500,
  wasteAmount: 200,
  durationSeconds: 7200,
  number: "INV-1",
};

describe("moneyLedgerParentStatusLabel", () => {
  test("does not return Mixed when lines disagree", () => {
    const group = personGroupFromClients([readyClient, carryInvoice]);
    expect(moneyLedgerParentStatusLabel(group)).not.toBe("Mixed");
    expect(moneyLedgerParentStatusLabel(group)).toBe("Open");
  });

  test("keeps a shared status", () => {
    const group = personGroupFromClients([readyClient]);
    expect(moneyLedgerParentStatusLabel(group)).toBe("Ready");
  });
});

describe("buildMoneyLedgerParents", () => {
  test("nests current then carry under an expandable client parent", () => {
    const group = personGroupFromClients([carryInvoice, readyClient]);
    const parents = buildMoneyLedgerParents({
      clientGroups: [group],
      teamGroups: [],
      adjustments: [],
      salaryPool: { pool: null, canPay: false },
    });
    const parent = parents[0];
    expect(parent?.title).toBe("Northwind");
    expect(parent?.expandable).toBe(true);
    expect(parent?.settleLabel).toBe("Collect");
    expect(parent?.children).toHaveLength(2);
    expect(parent?.children[0]?.isCarry).toBe(false);
    expect(parent?.children[0]?.periodLabel).toBe(
      formatMoneyBillPeriod(readyClient.periodStart, readyClient.periodEnd),
    );
    expect(parent?.children[1]?.isCarry).toBe(true);
    expect(parent?.children[1]?.wasteLabel).not.toBeNull();
    expect(parent?.hoursLabel).toContain("h:");
  });

  test("keeps a single-line party as one row", () => {
    const group = personGroupFromClients([readyClient]);
    const parents = buildMoneyLedgerParents({
      clientGroups: [group],
      teamGroups: [],
      adjustments: [],
      salaryPool: { pool: null, canPay: false },
    });
    expect(parents[0]?.expandable).toBe(false);
    expect(parents[0]?.children).toHaveLength(1);
  });

  test("places the salary pool as a first-class parent after team rows", () => {
    const parents = buildMoneyLedgerParents({
      clientGroups: [],
      teamGroups: [],
      adjustments: [],
      salaryPool: {
        pool: {
          totalLabel: "EGP 10,000",
          paidLabel: "EGP 2,000",
          remainingLabel: "EGP 8,000",
          remainingAmount: 800_000,
          statusLabel: "Outstanding",
        },
        canPay: true,
      },
    });
    expect(parents).toHaveLength(1);
    expect(parents[0]?.id).toBe("salary-pool");
    expect(parents[0]?.partyKind).toBe("salary-pool");
    expect(parents[0]?.settleLabel).toBe("Pay");
    expect(parents[0]?.expandable).toBe(false);
  });

  test("uses In as the All-table received heading", () => {
    const group = personGroupFromClients([readyClient]);
    expect(
      moneyLedgerTableReceivedHeading({
        clientGroups: [group],
        teamGroups: [],
        adjustments: [{ id: "adj-1" }],
        salaryPool: { pool: null, canPay: false },
      }),
    ).toBe("In");
    expect(
      moneyLedgerTableReceivedHeading({
        clientGroups: [group],
        teamGroups: [],
        adjustments: [],
        salaryPool: { pool: null, canPay: false },
      }),
    ).toBe("Received");
  });
});

describe("buildMoneyLedgerExpenseParents", () => {
  test("maps a due subscription to Pay without an expander", () => {
    const parents = buildMoneyLedgerExpenseParents([
      {
        id: "exp-1",
        expenseId: "e1",
        name: "Figma",
        kind: "subscription",
        status: "due",
        statusLabel: "Due",
        remainingAmount: 1200,
        remainingLabel: "EGP 12",
        amountLabel: "EGP 12",
        canRecordPayment: true,
        note: null,
      },
    ]);
    expect(parents[0]?.expandable).toBe(false);
    expect(parents[0]?.settleLabel).toBe("Pay");
    expect(parents[0]?.statusTone).toBe("warning");
  });
});
