import { ORPCError } from "@orpc/server";

import type { ReportEntityFilterInput } from "../shared/report-helpers";
import { parseIsoDateTime } from "../shared/date-helpers";
import { requireAgencyRole } from "../shared/membership";
import {
  buildReportEntryFilters,
  queryClientPreviewStats,
  queryProjectShareMetrics,
  queryReportTotals,
} from "./aggregate-queries";
import { resolveClientPreviewAmount, sortPreviewClients } from "./preview-helpers";
import { listAllAgencyTimeEntries } from "./service";

export async function getAgencyReportPreview(
  actorUserId: string,
  input: ReportEntityFilterInput & {
    teamId: string;
    from: string;
    to: string;
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "editor");

  const from = parseIsoDateTime(input.from, "from");
  const to = parseIsoDateTime(input.to, "to");
  if (from > to) {
    throw new ORPCError("BAD_REQUEST", {
      message: "from must be before or equal to to.",
    });
  }

  const filters = buildReportEntryFilters(input.teamId, from, to, input);
  const [totals, share, clientStats] = await Promise.all([
    queryReportTotals(filters),
    queryProjectShareMetrics(filters),
    queryClientPreviewStats(filters),
  ]);

  const previewClients = sortPreviewClients(clientStats);
  const items: Awaited<ReturnType<typeof listAllAgencyTimeEntries>>["items"] = [];
  if (previewClients.length > 0) {
    let page = 1;
    while (true) {
      const listed = await listAllAgencyTimeEntries(actorUserId, {
        ...input,
        page,
        pageSize: 5_000,
      });
      items.push(...listed.items);
      if (items.length >= listed.total || listed.items.length < 5_000) break;
      page += 1;
    }
  }

  const entriesByClient = new Map<string, typeof items>();
  for (const entry of items) {
    const list = entriesByClient.get(entry.clientId) ?? [];
    list.push(entry);
    entriesByClient.set(entry.clientId, list);
  }

  return {
    totals: {
      totalSeconds: totals.totalSeconds,
      totalEntries: totals.totalEntries,
      paidSeconds: share.paidSeconds,
      wasteSeconds: totals.wasteSeconds,
      internalSeconds: share.internalSeconds,
      internalBillableSeconds: share.internalBillableSeconds,
      externalSeconds: share.externalSeconds,
    },
    totalClientCount: previewClients.length,
    clients: previewClients.map((client) => {
      const nonWasteSeconds = Math.max(0, client.seconds - client.wasteSeconds);
      const amount = resolveClientPreviewAmount({
        rateAmount: client.billableRateAmount,
        sourceRateAmount: client.sourceBillableRateAmount,
        currency: client.currency,
        nonWasteSeconds,
      });
      return {
        clientId: client.clientId,
        clientName: client.clientName,
        totalSeconds: client.seconds,
        totalEntries: client.entryCount,
        amount: amount.amount,
        amountCurrency: amount.amountCurrency,
        entries: entriesByClient.get(client.clientId) ?? [],
      };
    }),
  };
}
