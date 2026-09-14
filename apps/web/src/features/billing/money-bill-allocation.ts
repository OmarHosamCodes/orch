/** Approach 02 — segmented pool allocation for client + team bill rows. */

type MoneyBillAllocationParty = "client" | "team";

export type MoneyBillAllocationAmount = {
  totalCents: number;
  receivedAmount: number;
  remainingAmount: number;
  uninvoicedCents: number;
  wasteAmount: number;
  currency: string;
  party?: MoneyBillAllocationParty;
};

type MoneyBillAllocationSegmentId = "received" | "remaining" | "uninvoiced";

type MoneyBillAllocationSegment = {
  id: MoneyBillAllocationSegmentId;
  percent: number;
};

export type MoneyBillAllocationView = MoneyBillAllocationAmount & {
  party: MoneyBillAllocationParty;
  presentation: "document" | "activity";
  receivedTitle: string;
  remainingTitle: string;
  uninvoicedTitle: string;
  receivedLabel: string;
  remainingLabel: string;
  uninvoicedLabel: string;
  totalLabel: string;
  wasteLabel: string;
  showWaste: boolean;
  segments: MoneyBillAllocationSegment[];
  ariaLabel: string;
};

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(0)} ${currency}`;
  }
}

function titlesForParty(party: MoneyBillAllocationParty): {
  receivedTitle: string;
  remainingTitle: string;
  uninvoicedTitle: string;
} {
  switch (party) {
    case "client":
      return {
        receivedTitle: "Received",
        remainingTitle: "Remaining",
        uninvoicedTitle: "Uninvoiced",
      };
    case "team":
      return {
        receivedTitle: "Paid",
        remainingTitle: "Remaining",
        uninvoicedTitle: "Ready",
      };
    default: {
      const _exhaustive: never = party;
      return _exhaustive;
    }
  }
}

export function buildMoneyBillAllocation(
  input: MoneyBillAllocationAmount,
  presentation: "document" | "activity" = "document",
): MoneyBillAllocationView {
  const party = input.party ?? "client";
  const titles = titlesForParty(party);
  const totalCents = Math.max(0, input.totalCents);
  const receivedAmount = Math.max(0, input.receivedAmount);
  const remainingAmount = Math.max(0, input.remainingAmount);
  const uninvoicedCents = Math.max(0, input.uninvoicedCents);
  const wasteAmount = Math.max(0, input.wasteAmount);
  const currency = input.currency;

  const parts: Array<{ id: MoneyBillAllocationSegmentId; amount: number }> = [
    { id: "received", amount: receivedAmount },
    { id: "remaining", amount: remainingAmount },
    { id: "uninvoiced", amount: uninvoicedCents },
  ];

  const segments: MoneyBillAllocationSegment[] =
    totalCents <= 0
      ? []
      : parts
          .filter((part) => part.amount > 0)
          .map((part) => ({
            id: part.id,
            percent: Math.min(100, Math.max(0, (part.amount / totalCents) * 100)),
          }));

  const receivedLabel = formatAmount(receivedAmount, currency);
  const remainingLabel = formatAmount(remainingAmount, currency);
  const uninvoicedLabel = formatAmount(uninvoicedCents, currency);
  const totalLabel = formatAmount(totalCents, currency);
  const wasteLabel = formatAmount(wasteAmount, currency);

  const activityTitle = titles.uninvoicedTitle;
  const activityAria = `${activityTitle} ${uninvoicedLabel}${
    wasteAmount > 0 ? `, excluded waste ${wasteLabel}` : ""
  }`;

  return {
    totalCents,
    receivedAmount,
    remainingAmount,
    uninvoicedCents,
    wasteAmount,
    currency,
    party,
    presentation,
    ...titles,
    receivedLabel,
    remainingLabel,
    uninvoicedLabel,
    totalLabel,
    wasteLabel,
    showWaste: wasteAmount > 0,
    segments,
    ariaLabel:
      presentation === "activity"
        ? activityAria
        : `Total ${totalLabel}: ${titles.receivedTitle.toLowerCase()} ${receivedLabel}, remaining ${remainingLabel}, ${titles.uninvoicedTitle.toLowerCase()} ${uninvoicedLabel}${
            wasteAmount > 0 ? `, excluded waste ${wasteLabel}` : ""
          }`,
  };
}

export function allocationFromReadyClient(input: {
  billableAmount: number;
  wasteAmount: number;
  currency: string;
}): MoneyBillAllocationView {
  const allocation = buildMoneyBillAllocation(
    {
      totalCents: input.billableAmount,
      receivedAmount: 0,
      remainingAmount: 0,
      uninvoicedCents: input.billableAmount,
      wasteAmount: input.wasteAmount,
      currency: input.currency,
      party: "client",
    },
    "activity",
  );
  return {
    ...allocation,
    uninvoicedTitle: "Billable",
    ariaLabel: `Billable ${allocation.uninvoicedLabel}${
      allocation.showWaste ? `, excluded waste ${allocation.wasteLabel}` : ""
    }`,
  };
}

export function allocationFromInvoice(input: {
  amount: number;
  receivedAmount: number;
  remainingAmount: number;
  wasteAmount: number;
  currency: string;
}): MoneyBillAllocationView {
  return buildMoneyBillAllocation({
    totalCents: input.amount,
    receivedAmount: input.receivedAmount,
    remainingAmount: input.remainingAmount,
    uninvoicedCents: 0,
    wasteAmount: input.wasteAmount,
    currency: input.currency,
    party: "client",
  });
}

export function allocationFromReadyMember(input: {
  payableAmount: number;
  wasteAmount: number;
  currency: string;
}): MoneyBillAllocationView {
  const allocation = buildMoneyBillAllocation(
    {
      totalCents: input.payableAmount,
      receivedAmount: 0,
      remainingAmount: 0,
      uninvoicedCents: input.payableAmount,
      wasteAmount: input.wasteAmount,
      currency: input.currency,
      party: "team",
    },
    "activity",
  );
  return {
    ...allocation,
    uninvoicedTitle: "Payable",
    ariaLabel: `Payable ${allocation.uninvoicedLabel}${
      allocation.showWaste ? `, excluded waste ${allocation.wasteLabel}` : ""
    }`,
  };
}

export function allocationFromPayout(input: {
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  wasteAmount: number;
  currency: string;
}): MoneyBillAllocationView {
  return buildMoneyBillAllocation({
    totalCents: input.amount,
    receivedAmount: input.paidAmount,
    remainingAmount: input.remainingAmount,
    uninvoicedCents: 0,
    wasteAmount: input.wasteAmount,
    currency: input.currency,
    party: "team",
  });
}
