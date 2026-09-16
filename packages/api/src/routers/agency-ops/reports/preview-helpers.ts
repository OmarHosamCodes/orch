import { amountFromDurationAndRate } from "../billing/client-billable-income";

/** Export (name) order for every client in the scoped range. */
export function sortPreviewClients<T extends { clientName: string }>(clients: readonly T[]): T[] {
  return [...clients].sort((left, right) => left.clientName.localeCompare(right.clientName));
}

export function resolveClientPreviewAmount(input: {
  rateAmount: number | null;
  sourceRateAmount?: number | null;
  currency: string | null;
  nonWasteSeconds: number;
}): { amount: number | null; amountCurrency: string | null } {
  const rate =
    input.sourceRateAmount != null && input.sourceRateAmount > 0
      ? input.sourceRateAmount
      : input.rateAmount != null && input.rateAmount > 0
        ? input.rateAmount
        : null;
  const currency = input.currency?.trim().toUpperCase() || null;
  if (rate == null || !currency) {
    return { amount: null, amountCurrency: null };
  }
  return {
    amount: amountFromDurationAndRate(input.nonWasteSeconds, rate),
    amountCurrency: currency,
  };
}
