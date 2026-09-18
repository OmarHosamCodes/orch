/** Bills list filters + empty-state copy for Money. */

export type MoneyBillsClientCategoryFilter = "external" | null;

export type MoneyBillsPartyFilter = "all" | "client" | "team" | "adjustments" | "expenses";

export type MoneyBillsStatusFilter = "outstanding" | "partial" | "paid" | "refunded";

export type MoneyBillsStatusOption = {
  id: MoneyBillsStatusFilter;
  label: string;
};

export const MONEY_BILLS_PARTY_OPTIONS: ReadonlyArray<{
  id: MoneyBillsPartyFilter;
  label: string;
}> = [
  { id: "client", label: "Clients" },
  { id: "team", label: "Team" },
  { id: "expenses", label: "Expenses" },
  { id: "adjustments", label: "Adjustments" },
  { id: "all", label: "All" },
];

const MONEY_BILLS_STATUS_LABELS: Record<MoneyBillsStatusFilter, string> = {
  outstanding: "Outstanding",
  partial: "Partial",
  paid: "Paid",
  refunded: "Refunded",
};

export function moneyBillsPartyFilterFromSearch(value: string | null): MoneyBillsPartyFilter {
  return MONEY_BILLS_PARTY_OPTIONS.some((option) => option.id === value)
    ? (value as MoneyBillsPartyFilter)
    : "client";
}

export function moneyBillsStatusFilterFromSearch(
  value: string | null,
): MoneyBillsStatusFilter | null {
  return value && value in MONEY_BILLS_STATUS_LABELS ? (value as MoneyBillsStatusFilter) : null;
}

const TEAM_STATUS_OPTIONS: ReadonlyArray<MoneyBillsStatusOption> = [
  { id: "outstanding", label: MONEY_BILLS_STATUS_LABELS.outstanding },
  { id: "partial", label: MONEY_BILLS_STATUS_LABELS.partial },
  { id: "paid", label: MONEY_BILLS_STATUS_LABELS.paid },
];

/** Status chips available for the active party section. */
export function moneyBillsStatusOptionsForParty(
  party: MoneyBillsPartyFilter,
): ReadonlyArray<MoneyBillsStatusOption> {
  switch (party) {
    case "all":
      return [
        { id: "paid", label: MONEY_BILLS_STATUS_LABELS.paid },
        { id: "partial", label: MONEY_BILLS_STATUS_LABELS.partial },
        { id: "outstanding", label: MONEY_BILLS_STATUS_LABELS.outstanding },
      ];
    case "client":
      return [
        { id: "paid", label: MONEY_BILLS_STATUS_LABELS.paid },
        { id: "refunded", label: MONEY_BILLS_STATUS_LABELS.refunded },
        { id: "partial", label: MONEY_BILLS_STATUS_LABELS.partial },
        { id: "outstanding", label: MONEY_BILLS_STATUS_LABELS.outstanding },
      ];
    case "team":
    case "adjustments":
      // Adjustments reuse Team status chips (Outstanding / Partial / Paid).
      return TEAM_STATUS_OPTIONS;
    case "expenses":
      return [];
    default: {
      const _exhaustive: never = party;
      return _exhaustive;
    }
  }
}

export function moneyBillsStatusAllowed(
  party: MoneyBillsPartyFilter,
  status: MoneyBillsStatusFilter,
): boolean {
  return moneyBillsStatusOptionsForParty(party).some((option) => option.id === status);
}

/** Salary-pool sheet/footer is on All and Team only — not Clients, Adjustments, or Expenses. */
export function moneyBillsSalaryPoolDetailVisible(
  party: MoneyBillsPartyFilter,
  hasPool: boolean,
): boolean {
  return hasPool && (party === "all" || party === "team");
}

export type MoneyBillsSalaryPoolStatus = "paid" | "partial" | "outstanding";

export function moneyBillsSalaryPoolStatus(
  paidAmount: number,
  remainingAmount: number,
): MoneyBillsSalaryPoolStatus {
  if (remainingAmount <= 0) return "paid";
  return paidAmount > 0 ? "partial" : "outstanding";
}

export function moneyBillsSalaryPoolMatchesStatus(
  statusFilter: MoneyBillsStatusFilter | null,
  poolStatus: MoneyBillsSalaryPoolStatus,
): boolean {
  if (statusFilter === null) return true;
  switch (statusFilter) {
    case "paid":
    case "partial":
    case "outstanding":
      return statusFilter === poolStatus;
    case "refunded":
      return false;
    default: {
      const _exhaustive: never = statusFilter;
      return _exhaustive;
    }
  }
}

export type MoneyBillsEmptyCopy = {
  title: string;
  body: string;
};

/** Compact summary for the Bills toolbar when filters are active. */
export function moneyBillsActiveFilterSummary(
  party: MoneyBillsPartyFilter,
  status: MoneyBillsStatusFilter | null,
  clientCategory: MoneyBillsClientCategoryFilter = null,
): string | null {
  const partyLabel = MONEY_BILLS_PARTY_OPTIONS.find((option) => option.id === party)?.label;
  const statusLabel = status ? MONEY_BILLS_STATUS_LABELS[status] : null;
  const categoryLabel = clientCategory === "external" ? "External" : null;

  const parts = [party === "all" ? null : partyLabel, statusLabel, categoryLabel].filter(
    Boolean,
  ) as string[];

  if (parts.length === 0) return null;
  return parts.join(" · ");
}

const EMPTY_BODY = "When invoices or payouts land in this range, they'll appear here.";

function partyNoun(party: MoneyBillsPartyFilter): string | null {
  switch (party) {
    case "all":
      return null;
    case "client":
      return "client";
    case "team":
      return "team";
    case "adjustments":
      return "adjustment";
    case "expenses":
      return "expense";
    default: {
      const _exhaustive: never = party;
      return _exhaustive;
    }
  }
}

function statusAdjective(status: MoneyBillsStatusFilter | null): string | null {
  if (!status) return null;
  switch (status) {
    case "outstanding":
      return "outstanding";
    case "partial":
      return "partial";
    case "paid":
      return "paid";
    case "refunded":
      return "refunded";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/** Compose empty-state title from party + optional status + search. */
export function moneyBillsEmptyCopy(
  party: MoneyBillsPartyFilter,
  status: MoneyBillsStatusFilter | null,
  searchTerm = "",
  clientCategory: MoneyBillsClientCategoryFilter = null,
): MoneyBillsEmptyCopy {
  const normalizedSearch = searchTerm.trim();
  if (normalizedSearch) {
    return {
      title: "No matching bills",
      body: `Nothing matches “${normalizedSearch}” in this view.`,
    };
  }

  const partyPart = partyNoun(party);
  const statusPart = statusAdjective(status);
  const isExternal = clientCategory === "external" && (party === "all" || party === "client");

  if (isExternal) {
    return {
      title: statusPart
        ? `No ${statusPart} external ${party === "all" ? "" : "client "}bills`.replace("  ", " ")
        : `No external ${party === "all" ? "" : "client "}bills`.replace("  ", " "),
      body: "Dismiss External to include internal clients.",
    };
  }

  if (party === "adjustments") {
    return { title: "No adjustments", body: EMPTY_BODY };
  }

  if (party === "expenses") {
    return {
      title: normalizedSearch ? "No matching expenses" : "No expenses in this period",
      body: normalizedSearch
        ? `Nothing matches “${normalizedSearch}” in this view.`
        : "Add a one-time expense or subscription to see it here.",
    };
  }

  if (!partyPart && !statusPart) {
    return { title: "No bills in this period", body: EMPTY_BODY };
  }

  if (!partyPart && statusPart) {
    return { title: `No ${statusPart} bills`, body: EMPTY_BODY };
  }

  if (partyPart && !statusPart) {
    return { title: `No ${partyPart} bills`, body: EMPTY_BODY };
  }

  return { title: `No ${statusPart} ${partyPart} bills`, body: EMPTY_BODY };
}
