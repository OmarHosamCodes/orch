import { describe, expect, test } from "bun:test";

import {
  clientBookCorridor,
  clientBookCorridorLabel,
  clientBookNeedLabel,
  clientBookNeeds,
  groupClientsByCorridor,
} from "./clients-book-corridors";

describe("clientBookCorridor", () => {
  test("archived wins over hours and uninvoiced", () => {
    expect(
      clientBookCorridor({
        category: "external",
        archivedAt: "2026-09-01T00:00:00.000Z",
        weekDurationSeconds: 3600,
        monthUninvoicedDurationSeconds: 7200,
        canViewBilling: true,
      }),
    ).toBe("archived");
  });

  test("internal wins over working hours", () => {
    expect(
      clientBookCorridor({
        category: "internal",
        archivedAt: null,
        weekDurationSeconds: 3600,
        monthUninvoicedDurationSeconds: 0,
        canViewBilling: true,
      }),
    ).toBe("internal");
  });

  test("ready to invoice requires owner billing and uninvoiced time", () => {
    expect(
      clientBookCorridor({
        category: "external",
        archivedAt: null,
        weekDurationSeconds: 0,
        monthUninvoicedDurationSeconds: 3600,
        canViewBilling: true,
      }),
    ).toBe("ready");
    expect(
      clientBookCorridor({
        category: "external",
        archivedAt: null,
        weekDurationSeconds: 0,
        monthUninvoicedDurationSeconds: 3600,
        canViewBilling: false,
      }),
    ).toBe("quiet");
  });

  test("working vs quiet", () => {
    expect(
      clientBookCorridor({
        category: "external",
        archivedAt: null,
        weekDurationSeconds: 1,
        monthUninvoicedDurationSeconds: 0,
        canViewBilling: true,
      }),
    ).toBe("working");
    expect(
      clientBookCorridor({
        category: "external",
        archivedAt: null,
        weekDurationSeconds: 0,
        monthUninvoicedDurationSeconds: 0,
        canViewBilling: true,
      }),
    ).toBe("quiet");
  });
});

describe("clientBookCorridorLabel", () => {
  test("names every corridor", () => {
    expect(clientBookCorridorLabel("ready")).toBe("Ready to invoice");
    expect(clientBookCorridorLabel("working")).toBe("Working this week");
    expect(clientBookCorridorLabel("quiet")).toBe("Quiet");
    expect(clientBookCorridorLabel("internal")).toBe("Internal");
    expect(clientBookCorridorLabel("archived")).toBe("Archived");
  });
});

describe("clientBookNeeds", () => {
  test("orders invoice and outstanding before catalog gaps", () => {
    expect(
      clientBookNeeds({
        canViewBilling: true,
        monthUninvoicedDurationSeconds: 60,
        outstandingAmount: 100,
        rateMissing: true,
        contactIncomplete: true,
      }),
    ).toEqual(["invoice", "outstanding", "rate", "contact"]);
  });

  test("hides billing needs from members", () => {
    expect(
      clientBookNeeds({
        canViewBilling: false,
        monthUninvoicedDurationSeconds: 60,
        outstandingAmount: 100,
        rateMissing: true,
        contactIncomplete: false,
      }),
    ).toEqual(["rate"]);
  });

  test("internal clients do not get ready-to-invoice chips", () => {
    expect(
      clientBookNeeds({
        category: "internal",
        canViewBilling: true,
        monthUninvoicedDurationSeconds: 60,
        outstandingAmount: 0,
        rateMissing: true,
        contactIncomplete: false,
      }),
    ).toEqual(["rate"]);
  });
});

describe("clientBookNeedLabel", () => {
  test("names every need chip", () => {
    expect(clientBookNeedLabel("invoice")).toBe("Ready to invoice");
    expect(clientBookNeedLabel("outstanding")).toBe("Outstanding");
    expect(clientBookNeedLabel("rate")).toBe("Set rate");
    expect(clientBookNeedLabel("contact")).toBe("Add contact");
  });
});

describe("groupClientsByCorridor", () => {
  test("keeps corridor order and drops empty lanes", () => {
    const grouped = groupClientsByCorridor([
      { corridor: "quiet" as const, name: "Quiet Co" },
      { corridor: "ready" as const, name: "Billable Co" },
      { corridor: "ready" as const, name: "Also Ready" },
    ]);
    expect(grouped.map((lane) => lane.id)).toEqual(["ready", "quiet"]);
    expect(grouped[0]?.items).toHaveLength(2);
  });
});
