/** Pure helpers: current + prior carry obligations for Money compose-on-demand. */

export type MoneyCarryPeriod = {
  periodStart: string;
  periodEnd: string;
};

export type MoneyCarryOpenDoc = MoneyCarryPeriod & {
  id: string;
  remainingAmount: number;
  amount: number;
  receivedOrPaidAmount: number;
};

export type MoneyCarryReadySlice = MoneyCarryPeriod & {
  partyId: string;
  partyName: string;
  amount: number;
  sourceAmount: number;
  rateCurrency: string;
  durationSeconds: number;
  wasteAmount: number;
};

export type MoneyCarryClientObligation =
  | {
      kind: "invoice";
      id: string;
      clientId: string;
      clientName: string;
      periodStart: string;
      periodEnd: string;
      isCarry: boolean;
      amount: number;
      sourceAmount: number;
      rateCurrency: string;
      receivedAmount: number;
      remainingAmount: number;
      wasteAmount: number;
      durationSeconds: number;
      number: string | null;
    }
  | {
      kind: "ready";
      id: string;
      clientId: string;
      clientName: string;
      periodStart: string;
      periodEnd: string;
      isCarry: boolean;
      amount: number;
      sourceAmount: number;
      rateCurrency: string;
      receivedAmount: 0;
      remainingAmount: number;
      wasteAmount: number;
      durationSeconds: number;
      number: null;
    };

export type MoneyCarryMemberObligation =
  | {
      kind: "payout";
      id: string;
      userId: string;
      userName: string;
      userAvatar: string | null;
      periodStart: string;
      periodEnd: string;
      isCarry: boolean;
      amount: number;
      paidAmount: number;
      remainingAmount: number;
      wasteAmount: number;
      durationSeconds: number;
    }
  | {
      kind: "ready";
      id: string;
      userId: string;
      userName: string;
      userAvatar: string | null;
      periodStart: string;
      periodEnd: string;
      isCarry: boolean;
      amount: number;
      paidAmount: 0;
      remainingAmount: number;
      wasteAmount: number;
      durationSeconds: number;
    };

function periodEndsBefore(periodEndIso: string, rangeStartIso: string): boolean {
  return new Date(periodEndIso).getTime() < new Date(rangeStartIso).getTime();
}

function periodsOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return (
    new Date(aStart).getTime() <= new Date(bEnd).getTime() &&
    new Date(aEnd).getTime() >= new Date(bStart).getTime()
  );
}

/** Open docs whose period ends before the viewing range (carry-in). */
export function selectOpenPriorDocs<T extends MoneyCarryOpenDoc>(
  docs: T[],
  rangeStartIso: string,
): T[] {
  return docs.filter(
    (doc) => doc.remainingAmount > 0 && periodEndsBefore(doc.periodEnd, rangeStartIso),
  );
}

/** Docs overlapping the viewing range (current period). */
export function selectCurrentPeriodDocs<T extends MoneyCarryPeriod & { id: string }>(
  docs: T[],
  rangeStartIso: string,
  rangeEndIso: string,
): T[] {
  return docs.filter((doc) =>
    periodsOverlap(doc.periodStart, doc.periodEnd, rangeStartIso, rangeEndIso),
  );
}

/**
 * Ready slices with no covering document overlapping that slice's period.
 * Used for both current-period Ready and prior Ready carry.
 */
export function selectUncoveredReadySlices<T extends MoneyCarryReadySlice>(
  slices: T[],
  coveringDocs: MoneyCarryPeriod[],
): T[] {
  return slices.filter(
    (slice) =>
      slice.amount > 0 &&
      !coveringDocs.some((doc) =>
        periodsOverlap(doc.periodStart, doc.periodEnd, slice.periodStart, slice.periodEnd),
      ),
  );
}

export type MoneyPendingAdjustmentKind = "discount" | "surcharge" | "debt";

export type MoneyAdjustmentMatch = {
  partyId: string;
  obligationId: string | null;
  appliedInvoiceId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  kind: MoneyPendingAdjustmentKind;
  amount: number;
};

export function clientReadyObligationId(
  clientId: string,
  periodStart: string,
  periodEnd: string,
): string {
  return `ready:client:${clientId}:${periodStart}:${periodEnd}`;
}

export function memberReadyObligationId(
  userId: string,
  periodStart: string,
  periodEnd: string,
): string {
  return `ready:member:${userId}:${periodStart}:${periodEnd}`;
}

export function isReadyObligationId(obligationId: string): boolean {
  return obligationId.startsWith("ready:");
}

export function isInvoiceObligationId(obligationId: string): boolean {
  return !isReadyObligationId(obligationId);
}

export function pendingAdjustmentKindLabel(kind: MoneyPendingAdjustmentKind): string {
  switch (kind) {
    case "discount":
      return "Discount";
    case "surcharge":
      return "Surcharge";
    case "debt":
      return "Debt";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function signedClientAdjustmentAmount(
  kind: MoneyPendingAdjustmentKind,
  amount: number,
): number {
  switch (kind) {
    case "discount":
      return -amount;
    case "surcharge":
    case "debt":
      return amount;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function netClientAdjustmentAmount(
  adjustments: ReadonlyArray<{ kind: MoneyPendingAdjustmentKind; amount: number }>,
): number {
  return adjustments.reduce(
    (total, adj) => total + signedClientAdjustmentAmount(adj.kind, adj.amount),
    0,
  );
}

/** Apply pending Adjust deltas: discount reduces, surcharge/debt increase. */
export function applyPendingAdjustmentAmount(
  baseAmount: number,
  adjustments: ReadonlyArray<{ kind: MoneyPendingAdjustmentKind; amount: number }>,
): number {
  return Math.max(0, baseAmount + netClientAdjustmentAmount(adjustments));
}

export function adjustmentPeriodOverlaps(
  adj: { periodStart: string | null; periodEnd: string | null },
  rangeStart: string,
  rangeEnd: string,
): boolean {
  if (!adj.periodStart || !adj.periodEnd) return true;
  return periodsOverlap(adj.periodStart, adj.periodEnd, rangeStart, rangeEnd);
}

export function filterAdjustmentsForPeriod<
  T extends { periodStart: string | null; periodEnd: string | null },
>(adjustments: readonly T[], rangeStart: string, rangeEnd: string): T[] {
  return adjustments.filter((adj) => adjustmentPeriodOverlaps(adj, rangeStart, rangeEnd));
}

export function isUnappliedReadyAdjustment(adj: {
  appliedInvoiceId: string | null;
  obligationId: string | null;
}): boolean {
  if (adj.appliedInvoiceId) return false;
  if (adj.obligationId && !isReadyObligationId(adj.obligationId)) return false;
  return true;
}

export function adjustmentsForReadyObligation(
  slice: { partyId: string; obligationId: string; periodStart: string; periodEnd: string },
  adjustments: readonly MoneyAdjustmentMatch[],
): MoneyAdjustmentMatch[] {
  return adjustments.filter((adj) => {
    if (adj.partyId !== slice.partyId) return false;
    if (!isUnappliedReadyAdjustment(adj)) return false;
    if (adj.obligationId && adj.obligationId !== slice.obligationId) return false;
    return adjustmentPeriodOverlaps(adj, slice.periodStart, slice.periodEnd);
  });
}

/**
 * Income/ROI bump that is not already sitting in invoice remaining.
 * Invoice-targeted rows (even after apply) raise the pool when tracked work still
 * dominates invoiced totals. Ready rows only count until export bakes them into
 * an invoice; exported ready rows are skipped so max(pool, invoiced) does not
 * double-count them.
 */
export function scoreboardClientAdjustmentNet(
  adjustments: ReadonlyArray<{
    kind: MoneyPendingAdjustmentKind;
    amount: number;
    obligationId: string | null;
    appliedInvoiceId: string | null;
  }>,
): number {
  return netClientAdjustmentAmount(
    adjustments.filter((adj) => {
      if (adj.obligationId && isInvoiceObligationId(adj.obligationId)) return true;
      return isUnappliedReadyAdjustment(adj);
    }),
  );
}

export function readyAdjustmentMatchesExport(
  adj: {
    obligationId: string | null;
    appliedInvoiceId: string | null;
    periodStart: string | null;
    periodEnd: string | null;
  },
  exported: ReadonlyArray<{ obligationId: string; periodStart: string; periodEnd: string }>,
): boolean {
  if (adj.appliedInvoiceId) return false;
  if (adj.obligationId) {
    return exported.some((item) => item.obligationId === adj.obligationId);
  }
  return exported.some((item) => adjustmentPeriodOverlaps(adj, item.periodStart, item.periodEnd));
}

export function buildClientObligations(input: {
  rangeStart: string;
  rangeEnd: string;
  invoices: Array<{
    id: string;
    clientId: string;
    clientName: string;
    number: string;
    periodStart: string;
    periodEnd: string;
    amount: number;
    sourceAmount: number;
    rateCurrency: string;
    receivedAmount: number;
    remainingAmount: number;
  }>;
  readySlices: Array<{
    clientId: string;
    clientName: string;
    periodStart: string;
    periodEnd: string;
    amount: number;
    sourceAmount: number;
    rateCurrency: string;
    durationSeconds: number;
    wasteAmount: number;
  }>;
  adjustments?: readonly MoneyAdjustmentMatch[];
}): MoneyCarryClientObligation[] {
  const out: MoneyCarryClientObligation[] = [];

  for (const invoice of input.invoices) {
    const isCarry = periodEndsBefore(invoice.periodEnd, input.rangeStart);
    const inCurrent = periodsOverlap(
      invoice.periodStart,
      invoice.periodEnd,
      input.rangeStart,
      input.rangeEnd,
    );
    if (!inCurrent && !(isCarry && invoice.remainingAmount > 0)) continue;
    if (isCarry && invoice.remainingAmount <= 0) continue;

    out.push({
      kind: "invoice",
      id: invoice.id,
      clientId: invoice.clientId,
      clientName: invoice.clientName,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      isCarry: isCarry && !inCurrent,
      amount: invoice.amount,
      sourceAmount: invoice.sourceAmount,
      rateCurrency: invoice.rateCurrency,
      receivedAmount: invoice.receivedAmount,
      remainingAmount: invoice.remainingAmount,
      wasteAmount: 0,
      durationSeconds: 0,
      number: invoice.number,
    });
  }

  // Ready = residual activity after overlapping invoice amounts for that slice,
  // then unapplied ready adjustments (invoice-targeted rows already live on invoices).
  const adjustments = input.adjustments ?? [];
  for (const slice of input.readySlices) {
    const overlappingInvoices = input.invoices.filter(
      (invoice) =>
        invoice.clientId === slice.clientId &&
        periodsOverlap(invoice.periodStart, invoice.periodEnd, slice.periodStart, slice.periodEnd),
    );
    const invoicedAmount = overlappingInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
    const residual = Math.max(0, slice.amount - invoicedAmount);
    const obligationId = clientReadyObligationId(
      slice.clientId,
      slice.periodStart,
      slice.periodEnd,
    );
    const matching = adjustmentsForReadyObligation(
      {
        partyId: slice.clientId,
        obligationId,
        periodStart: slice.periodStart,
        periodEnd: slice.periodEnd,
      },
      adjustments,
    );
    const readyAmount = applyPendingAdjustmentAmount(residual, matching);
    if (readyAmount <= 0) continue;

    const invoicedSourceAmount = overlappingInvoices.reduce(
      (sum, invoice) => sum + invoice.sourceAmount,
      0,
    );
    const residualSource = Math.max(0, slice.sourceAmount - invoicedSourceAmount);
    const readySourceAmount = applyPendingAdjustmentAmount(residualSource, matching);

    const isCarry = periodEndsBefore(slice.periodEnd, input.rangeStart);
    const inCurrent = periodsOverlap(
      slice.periodStart,
      slice.periodEnd,
      input.rangeStart,
      input.rangeEnd,
    );
    if (!inCurrent && !isCarry) continue;

    out.push({
      kind: "ready",
      id: obligationId,
      clientId: slice.clientId,
      clientName: slice.clientName,
      periodStart: slice.periodStart,
      periodEnd: slice.periodEnd,
      isCarry,
      amount: readyAmount,
      sourceAmount: readySourceAmount,
      rateCurrency: slice.rateCurrency,
      receivedAmount: 0,
      remainingAmount: readyAmount,
      wasteAmount: slice.wasteAmount,
      durationSeconds: slice.durationSeconds,
      number: null,
    });
  }

  return out.sort((a, b) => {
    if (a.clientName !== b.clientName) return a.clientName.localeCompare(b.clientName);
    if (a.isCarry !== b.isCarry) return a.isCarry ? 1 : -1;
    return a.periodStart.localeCompare(b.periodStart);
  });
}

export function buildMemberObligations(input: {
  rangeStart: string;
  rangeEnd: string;
  payouts: Array<{
    id: string;
    userId: string;
    userName: string;
    userAvatar: string | null;
    periodStart: string;
    periodEnd: string;
    amount: number;
    paidAmount: number;
    remainingAmount: number;
    durationSeconds: number;
  }>;
  readySlices: Array<{
    userId: string;
    userName: string;
    userAvatar: string | null;
    periodStart: string;
    periodEnd: string;
    amount: number;
    durationSeconds: number;
    wasteAmount: number;
  }>;
  adjustments?: readonly MoneyAdjustmentMatch[];
}): MoneyCarryMemberObligation[] {
  const out: MoneyCarryMemberObligation[] = [];

  for (const payout of input.payouts) {
    const isCarry = periodEndsBefore(payout.periodEnd, input.rangeStart);
    const inCurrent = periodsOverlap(
      payout.periodStart,
      payout.periodEnd,
      input.rangeStart,
      input.rangeEnd,
    );
    if (!inCurrent && !(isCarry && payout.remainingAmount > 0)) continue;
    if (isCarry && payout.remainingAmount <= 0) continue;

    out.push({
      kind: "payout",
      id: payout.id,
      userId: payout.userId,
      userName: payout.userName,
      userAvatar: payout.userAvatar,
      periodStart: payout.periodStart,
      periodEnd: payout.periodEnd,
      isCarry: isCarry && !inCurrent,
      amount: payout.amount,
      paidAmount: payout.paidAmount,
      remainingAmount: payout.remainingAmount,
      wasteAmount: 0,
      durationSeconds: payout.durationSeconds,
    });
  }

  const memberAdjustments = input.adjustments ?? [];
  for (const slice of input.readySlices) {
    const paidOutAmount = input.payouts
      .filter(
        (payout) =>
          payout.userId === slice.userId &&
          periodsOverlap(payout.periodStart, payout.periodEnd, slice.periodStart, slice.periodEnd),
      )
      .reduce((sum, payout) => sum + payout.amount, 0);
    const residual = Math.max(0, slice.amount - paidOutAmount);
    const obligationId = memberReadyObligationId(slice.userId, slice.periodStart, slice.periodEnd);
    const matching = adjustmentsForReadyObligation(
      {
        partyId: slice.userId,
        obligationId,
        periodStart: slice.periodStart,
        periodEnd: slice.periodEnd,
      },
      memberAdjustments,
    );
    const readyAmount = applyPendingAdjustmentAmount(residual, matching);
    if (readyAmount <= 0) continue;

    const isCarry = periodEndsBefore(slice.periodEnd, input.rangeStart);
    const inCurrent = periodsOverlap(
      slice.periodStart,
      slice.periodEnd,
      input.rangeStart,
      input.rangeEnd,
    );
    if (!inCurrent && !isCarry) continue;

    out.push({
      kind: "ready",
      id: obligationId,
      userId: slice.userId,
      userName: slice.userName,
      userAvatar: slice.userAvatar,
      periodStart: slice.periodStart,
      periodEnd: slice.periodEnd,
      isCarry,
      amount: readyAmount,
      paidAmount: 0,
      remainingAmount: readyAmount,
      wasteAmount: slice.wasteAmount,
      durationSeconds: slice.durationSeconds,
    });
  }

  return out.sort((a, b) => {
    if (a.userName !== b.userName) return a.userName.localeCompare(b.userName);
    if (a.isCarry !== b.isCarry) return a.isCarry ? 1 : -1;
    return a.periodStart.localeCompare(b.periodStart);
  });
}

/** Group selected obligation periods for combine vs split export. */
export function groupObligationsForExport(
  obligations: MoneyCarryPeriod[],
  mode: "combine" | "split",
): MoneyCarryPeriod[][] {
  if (obligations.length === 0) return [];
  if (mode === "combine") return [obligations];
  const byPeriod = new Map<string, MoneyCarryPeriod[]>();
  for (const item of obligations) {
    const key = `${item.periodStart}|${item.periodEnd}`;
    const list = byPeriod.get(key) ?? [];
    list.push(item);
    byPeriod.set(key, list);
  }
  return [...byPeriod.values()];
}
