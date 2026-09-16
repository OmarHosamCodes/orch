import {
  type MoneyBillComposeDisplayRow,
  type MoneyBillPersonGroup,
} from "@/features/billing/money-bill-obligation-rows";
import { type MoneyBillAdjustmentRow } from "@/features/billing/money-bills-rows";
import {
  type MoneyLedgerOverflowId,
  type MoneyLedgerSalaryPoolInput,
  buildMoneyLedgerParents,
  moneyLedgerTableReceivedHeading,
} from "@/features/money/money-ledger-rows";

import { AgencyMoneyLedgerTableView } from "./agency-money-ledger-table-view";

type AgencyMoneyBillsTablesViewProps = {
  clientGroups: readonly MoneyBillPersonGroup[];
  teamGroups: readonly MoneyBillPersonGroup[];
  adjustments: readonly MoneyBillAdjustmentRow[];
  salaryPool: MoneyLedgerSalaryPoolInput;
  searchTerm: string;
  isMutationPending: boolean;
  selectedRowId?: string | null;
  showPartyGlyph: boolean;
  expandedRowIds: ReadonlySet<string>;
  onToggleExpand: (rowId: string) => void;
  onOpenRow: (row: MoneyBillComposeDisplayRow) => void;
  onOpenSalaryPool: () => void;
  onSettleGroup: (group: MoneyBillPersonGroup) => void;
  onSettleGroupLine: (group: MoneyBillPersonGroup, lineId: string) => void;
  onSettleAdjustment: (row: MoneyBillAdjustmentRow) => void;
  onOverflow: (rowId: string, action: MoneyLedgerOverflowId, childId?: string) => void;
};

export function AgencyMoneyBillsTablesView({
  clientGroups,
  teamGroups,
  adjustments,
  salaryPool,
  searchTerm,
  isMutationPending,
  selectedRowId,
  showPartyGlyph,
  expandedRowIds,
  onToggleExpand,
  onOpenRow,
  onOpenSalaryPool,
  onSettleGroup,
  onSettleGroupLine,
  onSettleAdjustment,
  onOverflow,
}: AgencyMoneyBillsTablesViewProps) {
  const rows = buildMoneyLedgerParents({
    clientGroups,
    teamGroups,
    adjustments,
    salaryPool,
  });
  const groupsById = new Map(clientGroups.concat(teamGroups).map((group) => [group.id, group]));
  const adjustmentsById = new Map(adjustments.map((row) => [row.id, row]));
  const receivedHeading = moneyLedgerTableReceivedHeading({
    clientGroups,
    teamGroups,
    adjustments,
    salaryPool,
  });

  function openLedgerRow(rowId: string) {
    if (rowId === "salary-pool") {
      onOpenSalaryPool();
      return;
    }
    const group = groupsById.get(rowId);
    if (group) {
      onOpenRow(group);
      return;
    }
    const adjustment = adjustmentsById.get(rowId);
    if (adjustment) onOpenRow(adjustment);
  }

  function settleLedgerRow(rowId: string, childId?: string) {
    if (rowId === "salary-pool") {
      onOpenSalaryPool();
      return;
    }
    const group = groupsById.get(rowId);
    if (group) {
      if (childId) {
        onSettleGroupLine(group, childId);
        return;
      }
      onSettleGroup(group);
      return;
    }
    const adjustment = adjustmentsById.get(rowId);
    if (adjustment) onSettleAdjustment(adjustment);
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      aria-label="Bill tables"
      aria-busy={isMutationPending}
    >
      <AgencyMoneyLedgerTableView
        ariaLabel="Money ledger"
        rows={rows}
        searchTerm={searchTerm}
        receivedHeading={receivedHeading}
        showPartyGlyph={showPartyGlyph}
        isMutationPending={isMutationPending}
        selectedRowId={selectedRowId}
        expandedRowIds={expandedRowIds}
        onToggleExpand={onToggleExpand}
        onOpenRow={openLedgerRow}
        onSettle={settleLedgerRow}
        onOverflow={onOverflow}
      />
    </div>
  );
}
