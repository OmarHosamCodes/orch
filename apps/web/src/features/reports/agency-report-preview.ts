import { formatMoneyAmount } from "@/features/billing/money-bills-rows";
import {
  filterEntriesByShowWaste,
  groupEntriesForDisplay,
  isReportEntryWaste,
  type AgencyReportEntry,
  type AggregatedReportRow,
  type DisplayClientGroup,
} from "@/features/reports/agency-report-grouping";
import type { AgencyReportShowWaste } from "@/features/reports/agency-report-show-waste";

export type PreviewClientSample = {
  clientId: string;
  clientName: string;
  totalSeconds: number;
  totalEntries: number;
  amount: number | null;
  amountCurrency: string | null;
  entries: AgencyReportEntry[];
};

export type PreviewDocumentClient = {
  clientId: string;
  clientName: string;
  totalSeconds: number;
  totalEntries: number;
  amount: number | null;
  amountCurrency: string | null;
  amountLabel: string | null;
  group: DisplayClientGroup;
  rowCount: number;
};

export type AggregatedWasteKind = "none" | "partial" | "all";

export function aggregatedWasteKind(row: AggregatedReportRow): AggregatedWasteKind {
  if (row.entries.length === 0) {
    return isReportEntryWaste(row) ? "all" : "none";
  }
  const wasteCount = row.entries.filter((entry) => isReportEntryWaste(entry)).length;
  if (wasteCount === 0) return "none";
  if (wasteCount === row.entries.length) return "all";
  return "partial";
}

export function aggregatedWasteCounts(row: AggregatedReportRow): {
  wasteCount: number;
  totalCount: number;
} {
  const wasteCount = row.entries.filter((entry) => isReportEntryWaste(entry)).length;
  return { wasteCount, totalCount: row.entries.length };
}

export function countPreviewClientRows(client: {
  group: Pick<DisplayClientGroup, "projects">;
}): number {
  return client.group.projects.reduce((sum, project) => sum + project.rows.length, 0);
}

export function buildPreviewDocumentClients(
  samples: readonly PreviewClientSample[],
  options: {
    showWaste: AgencyReportShowWaste;
    mergeSameTaskNames: boolean;
    excludedEntryIds: ReadonlySet<string>;
  },
): PreviewDocumentClient[] {
  return samples.flatMap((sample) => {
    const visible = filterEntriesByShowWaste(
      sample.entries.filter((entry) => !options.excludedEntryIds.has(entry.id)),
      options.showWaste,
    );
    const grouped = groupEntriesForDisplay(visible, {
      mergeSameTaskNames: options.mergeSameTaskNames,
    });
    const group = grouped[0] ?? {
      clientId: sample.clientId,
      clientName: sample.clientName,
      totalSeconds: 0,
      projects: [],
    };
    const rowCount = countPreviewClientRows({ group });
    if (rowCount === 0) return [];
    return [
      {
        clientId: sample.clientId,
        clientName: sample.clientName,
        totalSeconds: sample.totalSeconds,
        totalEntries: sample.totalEntries,
        amount: sample.amount,
        amountCurrency: sample.amountCurrency,
        amountLabel: formatPreviewAmountLabel(sample.amount, sample.amountCurrency),
        group,
        rowCount,
      },
    ];
  });
}

function formatPreviewAmountLabel(amount: number | null, currency: string | null): string | null {
  if (amount == null || !currency) return null;
  return formatMoneyAmount(amount, currency);
}
