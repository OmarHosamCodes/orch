import type { AgencyReportFieldId } from "@/features/reports/agency-report-fields";

/** Print-friendly Agency report sheet palette (ARGB). */
export const AGENCY_REPORT_EXPORT_PALETTE = {
  ink: "FF18181B",
  muted: "FF71717A",
  white: "FFFFFFFF",
  clientBanner: "FF0F766E",
  headerFill: "FF334155",
  zebra: "FFF8FAFC",
  waste: "FFFEE2E2",
  period: "FFDCFCE7",
  grandTotal: "FFCCFBF1",
  border: "FFCBD5E1",
  projectAccent: "FF14B8A6",
} as const;

export const AGENCY_REPORT_EXPORT_FONT_SIZES = {
  client: 16,
  project: 14,
  header: 12,
  body: 12,
} as const;

const AGENCY_REPORT_EXPORT_ROW_HEIGHTS = {
  client: 28,
  header: 24,
  data: 22,
  total: 26,
} as const;

export const AGENCY_REPORT_EXPORT_COLUMN_WIDTHS: Record<AgencyReportFieldId, number> = {
  from: 12,
  to: 12,
  project: 28,
  task: 28,
  description: 48,
  link: 40,
  duration: 14,
  assignee: 20,
};

type ExcelFont = {
  bold?: boolean;
  size?: number;
  color?: { argb: string };
  name?: string;
};

type ExcelFill = {
  type: "pattern";
  pattern: "solid";
  fgColor: { argb: string };
};

type ExcelBorderEdge = { style: "thin"; color: { argb: string } };

type ExcelBorder = {
  top?: ExcelBorderEdge;
  left?: ExcelBorderEdge;
  bottom?: ExcelBorderEdge;
  right?: ExcelBorderEdge;
};

type ExcelAlignment = {
  horizontal?: "left" | "center" | "right";
  vertical?: "top" | "middle" | "bottom";
  wrapText?: boolean;
};

/** Minimal ExcelJS cell surface used by style helpers. */
export type AgencyReportExportCell = {
  value?: unknown;
  font?: ExcelFont;
  fill?: ExcelFill;
  border?: ExcelBorder;
  alignment?: ExcelAlignment;
};

/** Minimal ExcelJS row surface used by style helpers. */
export type AgencyReportExportRow = {
  height?: number;
  values?: unknown;
  getCell: (columnNumber: number) => AgencyReportExportCell;
  eachCell: (
    opt: { includeEmpty: boolean },
    callback: (cell: AgencyReportExportCell, colNumber: number) => void,
  ) => void;
};

type AgencyReportExportSheet = {
  mergeCells: (startRow: number, startCol: number, endRow: number, endCol: number) => void;
  getCell: (row: number, col: number) => AgencyReportExportCell;
  getRow: (row: number) => AgencyReportExportRow;
};

export type { AgencyReportExportSheet };

const FONT_NAME = "Calibri";

const thinBorder: ExcelBorderEdge = {
  style: "thin",
  color: { argb: AGENCY_REPORT_EXPORT_PALETTE.border },
};

const gridBorder: ExcelBorder = {
  top: thinBorder,
  left: thinBorder,
  bottom: thinBorder,
  right: thinBorder,
};

function solidFill(argb: string): ExcelFill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

export function resolveExportColumnWidths(
  activeFields: readonly AgencyReportFieldId[],
): Array<{ width: number }> {
  return activeFields.map((field) => ({
    width: AGENCY_REPORT_EXPORT_COLUMN_WIDTHS[field],
  }));
}

function styleRange(
  sheet: AgencyReportExportSheet,
  rowIndex: number,
  columnCount: number,
  apply: (cell: AgencyReportExportCell, col: number) => void,
) {
  for (let col = 1; col <= columnCount; col += 1) {
    apply(sheet.getCell(rowIndex, col), col);
  }
}

export function applyClientBanner(
  sheet: AgencyReportExportSheet,
  rowIndex: number,
  columnCount: number,
  clientName: string,
  totalLabel: string,
) {
  const mergeEndColumn = Math.max(1, columnCount - 1);
  sheet.mergeCells(rowIndex, 1, rowIndex, mergeEndColumn);

  styleRange(sheet, rowIndex, columnCount, (cell, col) => {
    cell.fill = solidFill(AGENCY_REPORT_EXPORT_PALETTE.clientBanner);
    cell.font = {
      name: FONT_NAME,
      bold: true,
      size: AGENCY_REPORT_EXPORT_FONT_SIZES.client,
      color: { argb: AGENCY_REPORT_EXPORT_PALETTE.white },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: col === columnCount ? "right" : "left",
    };
  });

  sheet.getCell(rowIndex, 1).value = clientName;
  sheet.getCell(rowIndex, columnCount).value = totalLabel;
  sheet.getRow(rowIndex).height = AGENCY_REPORT_EXPORT_ROW_HEIGHTS.client;
}

export function applyHeaderRow(row: AgencyReportExportRow, columnCount: number) {
  row.height = AGENCY_REPORT_EXPORT_ROW_HEIGHTS.header;
  for (let col = 1; col <= columnCount; col += 1) {
    const cell = row.getCell(col);
    cell.font = {
      name: FONT_NAME,
      bold: true,
      size: AGENCY_REPORT_EXPORT_FONT_SIZES.header,
      color: { argb: AGENCY_REPORT_EXPORT_PALETTE.white },
    };
    cell.fill = solidFill(AGENCY_REPORT_EXPORT_PALETTE.headerFill);
    cell.border = gridBorder;
    cell.alignment = { vertical: "middle", horizontal: "left" };
  }
}

export function applyDataRow(
  row: AgencyReportExportRow,
  activeFields: readonly AgencyReportFieldId[],
  options: { zebra: boolean; isWaste: boolean },
) {
  row.height = AGENCY_REPORT_EXPORT_ROW_HEIGHTS.data;
  const fillArgb = options.isWaste
    ? AGENCY_REPORT_EXPORT_PALETTE.waste
    : options.zebra
      ? AGENCY_REPORT_EXPORT_PALETTE.zebra
      : AGENCY_REPORT_EXPORT_PALETTE.white;

  activeFields.forEach((field, index) => {
    const cell = row.getCell(index + 1);
    const isProject = field === "project";
    const isPeriod = field === "from" || field === "to";
    cell.font = {
      name: FONT_NAME,
      bold: isProject || isPeriod,
      size: isProject
        ? AGENCY_REPORT_EXPORT_FONT_SIZES.project
        : AGENCY_REPORT_EXPORT_FONT_SIZES.body,
      color: { argb: AGENCY_REPORT_EXPORT_PALETTE.ink },
    };
    cell.fill = solidFill(isPeriod ? AGENCY_REPORT_EXPORT_PALETTE.period : fillArgb);
    cell.border = gridBorder;
    const wrap = isProject || field === "task" || field === "description";
    if (field === "duration") {
      cell.alignment = { vertical: "middle", horizontal: "right", wrapText: wrap };
    } else if (isPeriod) {
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: false };
    } else {
      cell.alignment = { vertical: "middle", horizontal: "left", wrapText: wrap };
    }
  });
}

export function applyPeriodMergeAccent(
  sheet: AgencyReportExportSheet,
  startRow: number,
  endRow: number,
  columnIndex: number,
) {
  const col = columnIndex + 1;
  sheet.mergeCells(startRow, col, endRow, col);
  const cell = sheet.getCell(startRow, col);
  cell.font = {
    name: FONT_NAME,
    bold: true,
    size: AGENCY_REPORT_EXPORT_FONT_SIZES.body,
    color: { argb: AGENCY_REPORT_EXPORT_PALETTE.ink },
  };
  cell.fill = solidFill(AGENCY_REPORT_EXPORT_PALETTE.period);
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: false };
  cell.border = gridBorder;
}

export function applyProjectMergeAccent(
  sheet: AgencyReportExportSheet,
  startRow: number,
  endRow: number,
  projectColumnIndex: number,
) {
  const col = projectColumnIndex + 1;
  sheet.mergeCells(startRow, col, endRow, col);
  const cell = sheet.getCell(startRow, col);
  cell.font = {
    name: FONT_NAME,
    bold: true,
    size: AGENCY_REPORT_EXPORT_FONT_SIZES.project,
    color: { argb: AGENCY_REPORT_EXPORT_PALETTE.ink },
  };
  cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  cell.border = {
    ...gridBorder,
    left: { style: "thin", color: { argb: AGENCY_REPORT_EXPORT_PALETTE.projectAccent } },
  };
}

export function applyGrandTotal(
  sheet: AgencyReportExportSheet,
  rowIndex: number,
  columnCount: number,
  totalLabel: string,
) {
  const mergeEndColumn = Math.max(1, columnCount - 1);
  sheet.mergeCells(rowIndex, 1, rowIndex, mergeEndColumn);

  styleRange(sheet, rowIndex, columnCount, (cell, col) => {
    cell.fill = solidFill(AGENCY_REPORT_EXPORT_PALETTE.grandTotal);
    cell.font = {
      name: FONT_NAME,
      bold: true,
      size: AGENCY_REPORT_EXPORT_FONT_SIZES.header,
      color: { argb: AGENCY_REPORT_EXPORT_PALETTE.ink },
    };
    cell.border = gridBorder;
    cell.alignment = {
      vertical: "middle",
      horizontal: col === columnCount ? "right" : "left",
    };
  });

  sheet.getCell(rowIndex, 1).value = "Grand total";
  sheet.getCell(rowIndex, columnCount).value = totalLabel;
  sheet.getRow(rowIndex).height = AGENCY_REPORT_EXPORT_ROW_HEIGHTS.total;
}
