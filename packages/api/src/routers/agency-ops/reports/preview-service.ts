import { ORPCError } from "@orpc/server";

import type { ReportEntityFilterInput } from "../shared/report-helpers";
import { parseIsoDateTime } from "../shared/date-helpers";
import { requireTeamMembership } from "../shared/membership";
import {
  buildReportEntryFilters,
  queryClientPreviewStats,
  queryProjectShareMetrics,
  queryReportTotals,
} from "./aggregate-queries";
import { pickPreviewClients, resolveClientPreviewAmount } from "./preview-helpers";
import { listAllAgencyTimeEntries } from "./service";

export async function getAgencyReportPreview(
  actorUserId: string,
  input: ReportEntityFilterInput & {
    teamId: string;
    from: string;
    to: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "editor");

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

  const picked = pickPreviewClients(clientStats);
  const previewClientIds = picked.preview.map((client) => client.clientId);
  const sampleItems = [];
  if (previewClientIds.length > 0) {
    let page = 1;
    while (true) {
      const listed = await listAllAgencyTimeEntries(actorUserId, {
        ...input,
        clientIds: previewClientIds,
        page,
        pageSize: 5_000,
      });
      sampleItems.push(...listed.items);
      if (sampleItems.length >= listed.total || listed.items.length < 5_000) break;
      page += 1;
    }
  }

  const entriesByClient = new Map<string, typeof sampleItems>();
  for (const entry of sampleItems) {
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
    totalClientCount: picked.totalClientCount,
    omittedClientCount: picked.omittedClientCount,
    clients: picked.preview.map((client) => {
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
