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

/** Keep in sync with API `REPORT_PREVIEW_CLIENT_LIMIT`. */
export const REPORT_PREVIEW_CLIENT_LIMIT = 3;
export const REPORT_PREVIEW_ROWS_PER_CLIENT = 8;

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
  shownRowCount: number;
  totalRowCount: number;
  omittedRowCount: number;
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

export function truncatePreviewClientGroup(
  group: DisplayClientGroup,
  rowLimit = REPORT_PREVIEW_ROWS_PER_CLIENT,
): {
  group: DisplayClientGroup;
  shownRowCount: number;
  totalRowCount: number;
  omittedRowCount: number;
} {
  const totalRowCount = group.projects.reduce((sum, project) => sum + project.rows.length, 0);
  const shownProjects = [];
  let remaining = Math.max(0, rowLimit);

  for (const project of group.projects) {
    if (remaining <= 0) break;
    const rows = project.rows.slice(0, remaining);
    remaining -= rows.length;
    shownProjects.push({
      ...project,
      rows,
      totalSeconds: rows.reduce((sum, row) => sum + row.durationSeconds, 0),
    });
  }

  const shownRowCount = shownProjects.reduce((sum, project) => sum + project.rows.length, 0);
  return {
    group: {
      ...group,
      projects: shownProjects,
    },
    shownRowCount,
    totalRowCount,
    omittedRowCount: Math.max(0, totalRowCount - shownRowCount),
  };
}

export function buildPreviewDocumentClients(
  samples: readonly PreviewClientSample[],
  options: {
    showWaste: AgencyReportShowWaste;
    mergeSameTaskNames: boolean;
    excludedEntryIds: ReadonlySet<string>;
  },
): PreviewDocumentClient[] {
  return samples.map((sample) => {
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
    const truncated = truncatePreviewClientGroup(group);
    return {
      clientId: sample.clientId,
      clientName: sample.clientName,
      totalSeconds: sample.totalSeconds,
      totalEntries: sample.totalEntries,
      amount: sample.amount,
      amountCurrency: sample.amountCurrency,
      amountLabel: formatPreviewAmountLabel(sample.amount, sample.amountCurrency),
      group: truncated.group,
      shownRowCount: truncated.shownRowCount,
      totalRowCount: truncated.totalRowCount,
      omittedRowCount: truncated.omittedRowCount,
    };
  });
}

function formatPreviewAmountLabel(amount: number | null, currency: string | null): string | null {
  if (amount == null || !currency) return null;
  return formatMoneyAmount(amount, currency);
}

export function previewOmissionCaption(input: {
  omittedRowCount: number;
  omittedClientCount: number;
}): string | null {
  const parts: string[] = [];
  if (input.omittedRowCount > 0) {
    parts.push(`${input.omittedRowCount} more ${input.omittedRowCount === 1 ? "row" : "rows"}`);
  }
  if (input.omittedClientCount > 0) {
    parts.push(
      `${input.omittedClientCount} ${input.omittedClientCount === 1 ? "client" : "clients"} not shown`,
    );
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}
