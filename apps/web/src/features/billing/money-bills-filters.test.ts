import { describe, expect, test } from "bun:test";

import {
  moneyBillsActiveFilterSummary,
  moneyBillsEmptyCopy,
  moneyBillsPartyFilterFromSearch,
  moneyBillsSalaryPoolDetailVisible,
  moneyBillsSalaryPoolMatchesStatus,
  moneyBillsSalaryPoolStatus,
  moneyBillsStatusAllowed,
  moneyBillsStatusFilterFromSearch,
  moneyBillsStatusOptionsForParty,
} from "./money-bills-filters";

describe("Money bill URL filters", () => {
  test("accepts known values and falls back safely", () => {
    expect(moneyBillsPartyFilterFromSearch("expenses")).toBe("expenses");
    expect(moneyBillsPartyFilterFromSearch("unknown")).toBe("client");
    expect(moneyBillsPartyFilterFromSearch(null)).toBe("client");
    expect(moneyBillsStatusFilterFromSearch("paid")).toBe("paid");
    expect(moneyBillsStatusFilterFromSearch("unknown")).toBeNull();
  });
});

describe("moneyBillsStatusOptionsForParty", () => {
  test("all exposes paid first so collected client money can be isolated", () => {
    expect(moneyBillsStatusOptionsForParty("all").map((option) => option.id)).toEqual([
      "paid",
      "partial",
      "outstanding",
    ]);
  });

  test("clients statuses in product order", () => {
    expect(moneyBillsStatusOptionsForParty("client").map((option) => option.id)).toEqual([
      "paid",
      "refunded",
      "partial",
      "outstanding",
    ]);
  });

  test("team and adjustments share status chips", () => {
    expect(moneyBillsStatusOptionsForParty("team").map((option) => option.id)).toEqual([
      "outstanding",
      "partial",
      "paid",
    ]);
    expect(moneyBillsStatusOptionsForParty("adjustments").map((option) => option.id)).toEqual([
      "outstanding",
      "partial",
      "paid",
    ]);
  });

  test("expenses has no status chips", () => {
    expect(moneyBillsStatusOptionsForParty("expenses")).toEqual([]);
  });

  test("refunded only allowed on clients", () => {
    expect(moneyBillsStatusAllowed("client", "refunded")).toBe(true);
    expect(moneyBillsStatusAllowed("team", "refunded")).toBe(false);
    expect(moneyBillsStatusAllowed("adjustments", "partial")).toBe(true);
    expect(moneyBillsStatusAllowed("all", "paid")).toBe(true);
  });
});

describe("moneyBillsEmptyCopy", () => {
  test("default all + no status", () => {
    expect(moneyBillsEmptyCopy("all", null).title).toBe("No bills in this period");
  });

  test("party only", () => {
    expect(moneyBillsEmptyCopy("client", null).title).toBe("No client bills");
    expect(moneyBillsEmptyCopy("adjustments", null).title).toBe("No adjustments");
    expect(moneyBillsEmptyCopy("expenses", null).title).toBe("No expenses in this period");
  });

  test("party + status", () => {
    expect(moneyBillsEmptyCopy("client", "outstanding").title).toBe("No outstanding client bills");
    expect(moneyBillsEmptyCopy("client", "refunded").title).toBe("No refunded client bills");
    expect(moneyBillsEmptyCopy("team", "paid").title).toBe("No paid team bills");
  });

  test("search overrides filter title", () => {
    expect(moneyBillsEmptyCopy("client", "paid", "acme").title).toBe("No matching bills");
    expect(moneyBillsEmptyCopy("client", "paid", "acme").body).toContain("acme");
  });

  test("external client filter explains how to include internal clients", () => {
    const copy = moneyBillsEmptyCopy("all", null, "", "external");
    expect(copy.title).toContain("external");
    expect(copy.body).toBe("Dismiss External to include internal clients.");
  });

  test("default copy does not mention expenses", () => {
    expect(moneyBillsEmptyCopy("all", null).body).toBe(
      "When invoices or payouts land in this range, they'll appear here.",
    );
  });
});

describe("moneyBillsSalaryPoolDetailVisible", () => {
  test("all + pool", () => {
    expect(moneyBillsSalaryPoolDetailVisible("all", true)).toBe(true);
  });

  test("team + pool", () => {
    expect(moneyBillsSalaryPoolDetailVisible("team", true)).toBe(true);
  });

  test("client + pool", () => {
    expect(moneyBillsSalaryPoolDetailVisible("client", true)).toBe(false);
  });

  test("adjustments + pool", () => {
    expect(moneyBillsSalaryPoolDetailVisible("adjustments", true)).toBe(false);
  });

  test("expenses + pool", () => {
    expect(moneyBillsSalaryPoolDetailVisible("expenses", true)).toBe(false);
  });

  test("all + no pool", () => {
    expect(moneyBillsSalaryPoolDetailVisible("all", false)).toBe(false);
  });
});

describe("moneyBillsSalaryPoolStatus", () => {
  test("unpaid pool is outstanding", () => {
    expect(moneyBillsSalaryPoolStatus(0, 10_000)).toBe("outstanding");
  });

  test("partially paid pool is partial", () => {
    expect(moneyBillsSalaryPoolStatus(2_500, 7_500)).toBe("partial");
  });

  test("pool with no remaining amount is paid", () => {
    expect(moneyBillsSalaryPoolStatus(10_000, 0)).toBe("paid");
  });
});

describe("moneyBillsSalaryPoolMatchesStatus", () => {
  test("no status filter shows every pool status", () => {
    expect(moneyBillsSalaryPoolMatchesStatus(null, "outstanding")).toBe(true);
    expect(moneyBillsSalaryPoolMatchesStatus(null, "partial")).toBe(true);
    expect(moneyBillsSalaryPoolMatchesStatus(null, "paid")).toBe(true);
  });

  test("outstanding filter hides a paid pool", () => {
    expect(moneyBillsSalaryPoolMatchesStatus("outstanding", "paid")).toBe(false);
  });

  test("paid filter hides outstanding and partial pools", () => {
    expect(moneyBillsSalaryPoolMatchesStatus("paid", "outstanding")).toBe(false);
    expect(moneyBillsSalaryPoolMatchesStatus("paid", "partial")).toBe(false);
    expect(moneyBillsSalaryPoolMatchesStatus("paid", "paid")).toBe(true);
  });

  test("partial filter shows only partial pools", () => {
    expect(moneyBillsSalaryPoolMatchesStatus("partial", "outstanding")).toBe(false);
    expect(moneyBillsSalaryPoolMatchesStatus("partial", "partial")).toBe(true);
    expect(moneyBillsSalaryPoolMatchesStatus("partial", "paid")).toBe(false);
  });

  test("refunded filter never shows a pool", () => {
    expect(moneyBillsSalaryPoolMatchesStatus("refunded", "outstanding")).toBe(false);
    expect(moneyBillsSalaryPoolMatchesStatus("refunded", "partial")).toBe(false);
    expect(moneyBillsSalaryPoolMatchesStatus("refunded", "paid")).toBe(false);
  });
});

describe("moneyBillsActiveFilterSummary", () => {
  test("hides when all and no status", () => {
    expect(moneyBillsActiveFilterSummary("all", null)).toBeNull();
    expect(moneyBillsActiveFilterSummary("all", null, "external")).toBe("External");
  });

  test("composes party and status", () => {
    expect(moneyBillsActiveFilterSummary("client", null)).toBe("Clients");
    expect(moneyBillsActiveFilterSummary("client", null, "external")).toBe("Clients · External");
    expect(moneyBillsActiveFilterSummary("client", "refunded")).toBe("Clients · Refunded");
    expect(moneyBillsActiveFilterSummary("client", "refunded", "external")).toBe(
      "Clients · Refunded · External",
    );
    expect(moneyBillsActiveFilterSummary("team", "partial")).toBe("Team · Partial");
  });
});
