import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  moneyBillGroupPartyId,
  moneyBillGroupPartyType,
  type MoneyBillObligationLine,
  type MoneyBillPersonGroup,
} from "@/features/billing/money-bill-obligation-rows";
import { formatMoneyAmount, formatMoneyBillPeriod } from "@/features/billing/money-bills-rows";
import { formatDuration } from "@/lib/utils/format-duration";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { orpcClient } from "@/lib/orpc";

type MoneyPreviewParty = {
  partyType: "client" | "member";
  partyId: string;
  title: string;
  currency: string;
  lines: MoneyBillObligationLine[];
};

type MoneyExportMode = "combine" | "split";

export function useAgencyMoneyBillPreview(input: {
  teamId: string;
  periodLabel: string;
  composeActionPending: boolean;
  setComposeActionPending: (value: boolean) => void;
  invalidateMoneyComposeQueries: () => Promise<void>;
}) {
  const {
    teamId,
    periodLabel,
    composeActionPending,
    setComposeActionPending,
    invalidateMoneyComposeQueries,
  } = input;

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewParty, setPreviewParty] = useState<MoneyPreviewParty | null>(null);
  const [selectedObligationIds, setSelectedObligationIds] = useState<string[]>([]);
  const [exportMode, setExportMode] = useState<MoneyExportMode>("combine");

  function onOpenPreview(group: MoneyBillPersonGroup) {
    const partyId = moneyBillGroupPartyId(group);
    if (!partyId) return;
    setPreviewParty({
      partyType: moneyBillGroupPartyType(group),
      partyId,
      title: group.title,
      currency: group.currency,
      lines: group.lines,
    });
    setSelectedObligationIds(group.lines.map((line) => line.id));
    setExportMode("combine");
    setPreviewOpen(true);
  }

  function onOpenPreviewLine(group: MoneyBillPersonGroup, line: MoneyBillObligationLine) {
    const partyId = moneyBillGroupPartyId(group);
    if (!partyId) return;
    setPreviewParty({
      partyType: moneyBillGroupPartyType(group),
      partyId,
      title: group.title,
      currency: group.currency,
      lines: group.lines,
    });
    setSelectedObligationIds([line.id]);
    setExportMode("combine");
    setPreviewOpen(true);
  }

  function onClosePreview() {
    setPreviewOpen(false);
  }

  function onPreviewOpenChange(open: boolean) {
    if (!open) onClosePreview();
    else setPreviewOpen(true);
  }

  function onToggleObligationSelect(obligationId: string) {
    setSelectedObligationIds((current) =>
      current.includes(obligationId)
        ? current.filter((id) => id !== obligationId)
        : [...current, obligationId],
    );
  }

  function onSelectAllObligations() {
    if (!previewParty) return;
    const allIds = previewParty.lines.map((line) => line.id);
    setSelectedObligationIds((current) => (current.length === allIds.length ? [] : allIds));
  }

  async function onExportDocuments() {
    if (!previewParty || selectedObligationIds.length === 0) return;
    const selectedLines = previewParty.lines.filter((line) =>
      selectedObligationIds.includes(line.id),
    );
    if (selectedLines.length === 0) return;
    setComposeActionPending(true);
    try {
      await orpcClient.agencyOps.money.exportDocuments({
        teamId,
        partyType: previewParty.partyType,
        partyId: previewParty.partyId,
        mode: exportMode,
        selections: selectedLines.map((line) => ({
          obligationId: line.id,
          periodStart: line.periodStart,
          periodEnd: line.periodEnd,
          kind: line.obligationKind,
          amount: line.openCents,
        })),
      });
      await invalidateMoneyComposeQueries();
      toast.success(exportMode === "combine" ? "Document exported" : "Documents exported");
      onClosePreview();
    } catch (error) {
      toast.error("Couldn't export documents", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      setComposeActionPending(false);
    }
  }

  const selectedPreviewLines = useMemo(() => {
    if (!previewParty) return [];
    return previewParty.lines.filter((line) => selectedObligationIds.includes(line.id));
  }, [previewParty, selectedObligationIds]);

  const previewSelectedCents = useMemo(
    () => selectedPreviewLines.reduce((sum, line) => sum + line.openCents, 0),
    [selectedPreviewLines],
  );

  const previewSelectedHours = useMemo(
    () => selectedPreviewLines.reduce((sum, line) => sum + line.durationSeconds, 0),
    [selectedPreviewLines],
  );

  const documentKind = previewParty?.partyType === "member" ? "payslip" : "invoice";

  return {
    onOpenPreview,
    onOpenPreviewLine,
    preview: {
      open: previewOpen,
      onOpenChange: onPreviewOpenChange,
      title: documentKind === "payslip" ? "Payslip preview" : "Invoice preview",
      documentKind,
      partyTitle: previewParty?.title ?? "",
      periodLabel,
      currency: previewParty?.currency ?? "USD",
      lines: (previewParty?.lines ?? []).map((line) => ({
        id: line.id,
        periodLabel: formatMoneyBillPeriod(line.periodStart, line.periodEnd),
        hoursLabel: line.durationSeconds > 0 ? formatDuration(line.durationSeconds, "units") : "",
        totalLabel: line.totalLabel,
        receivedLabel: line.receivedLabel,
        remainingLabel: line.remainingLabel,
        remainingAmount: line.remainingAmount,
        statusLabel: line.statusLabel,
        isCarry: line.isCarry,
        wasteLabel: line.wasteAmount > 0 ? line.wasteLabel : null,
        amountLabel: line.openLabel,
        checked: selectedObligationIds.includes(line.id),
      })),
      documentLines: selectedPreviewLines.map((line) => ({
        id: line.id,
        periodLabel: formatMoneyBillPeriod(line.periodStart, line.periodEnd),
        hoursLabel: line.durationSeconds > 0 ? formatDuration(line.durationSeconds, "units") : "—",
        totalLabel: line.totalLabel,
        remainingLabel: line.openLabel,
        isCarry: line.isCarry,
      })),
      selectedCount: selectedObligationIds.length,
      allSelected:
        previewParty != null &&
        previewParty.lines.length > 0 &&
        selectedObligationIds.length === previewParty.lines.length,
      onToggleObligationSelect,
      onSelectAllObligations,
      exportMode,
      onExportModeChange: setExportMode,
      selectedTotalLabel: formatMoneyAmount(previewSelectedCents, previewParty?.currency ?? "USD"),
      dueLabel: formatMoneyAmount(previewSelectedCents, previewParty?.currency ?? "USD"),
      hoursLabel: previewSelectedHours > 0 ? formatDuration(previewSelectedHours, "units") : "",
      canExport: selectedObligationIds.length > 0 && !composeActionPending,
      onExport: () => void onExportDocuments(),
      onClose: onClosePreview,
    },
  };
}
