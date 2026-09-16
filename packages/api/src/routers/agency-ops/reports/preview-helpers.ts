import { amountFromDurationAndRate } from "../billing/client-billable-income";

/** First client blocks in export (name) order. The document preview never dumps the corpus. */
export const REPORT_PREVIEW_CLIENT_LIMIT = 3;

export function pickPreviewClients<T extends { clientId: string; clientName: string }>(
  clients: readonly T[],
  limit = REPORT_PREVIEW_CLIENT_LIMIT,
): { preview: T[]; omittedClientCount: number; totalClientCount: number } {
  const sorted = [...clients].sort((left, right) =>
    left.clientName.localeCompare(right.clientName),
  );
  return {
    preview: sorted.slice(0, Math.max(0, limit)),
    omittedClientCount: Math.max(0, sorted.length - Math.max(0, limit)),
    totalClientCount: sorted.length,
  };
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
