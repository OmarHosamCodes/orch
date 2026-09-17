import { type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { ChevronRight, Building2, SlidersHorizontal, Users, Wallet } from "lucide-react";

import { moneyBillInitials } from "@/features/billing/money-bills-rows";
import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import { AgencySearchHighlight } from "@/features/shared/agency-search-highlight";
import { projectHueStyle } from "@/features/shared/project-palette";
import { ExpenseStripGlyph } from "@/features/money/money-expense-strip-glyphs";
import {
  type MoneyLedgerChildRow,
  type MoneyLedgerMark,
  type MoneyLedgerOverflowId,
  type MoneyLedgerParentRow,
  type MoneyLedgerPartyKind,
  type MoneyLedgerStatusTone,
  moneyLedgerTableIdentityHeading,
  moneyLedgerTableShowsHours,
} from "@/features/money/money-ledger-rows";
import { Button } from "@/ui/button";
import { DropdownMenuItem } from "@/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import { cn } from "@/lib/utils";

import { MoneyTableActionsCell } from "./agency-money-table-actions-view";

export type AgencyMoneyLedgerTableViewProps = {
  ariaLabel: string;
  rows: readonly MoneyLedgerParentRow[];
  searchTerm: string;
  receivedHeading: "Received" | "Paid" | "In";
  showPartyGlyph: boolean;
  isMutationPending: boolean;
  selectedRowId?: string | null;
  expandedRowIds: ReadonlySet<string>;
  onToggleExpand: (rowId: string) => void;
  onOpenRow: (rowId: string) => void;
  onSettle: (rowId: string, childId?: string) => void;
  onOverflow: (rowId: string, action: MoneyLedgerOverflowId, childId?: string) => void;
  alwaysShowChildren?: boolean;
  hideParentRow?: boolean;
};

const tableWrapperClass = "min-h-0 flex-1 overflow-auto";
const shrinkNumericClass = "w-[1%] whitespace-nowrap";
const numericCellClass = cn(shrinkNumericClass, "text-right font-mono tabular-nums");
const desktopOnlyCellClass = "hidden md:table-cell";
const spacerCellClass = "w-full p-0";
const stickySurfaceClass =
  "bg-default group-hover/row:bg-muted group-focus-visible/row:bg-muted group-data-[state=selected]/row:bg-muted";
const identityStickyHeadClass = "sticky left-0 z-[2] w-72 min-w-56 bg-elevated px-4";
const identityStickyBodyClass = cn(
  "sticky left-0 z-[1] w-72 min-w-56",
  stickySurfaceClass,
);
const remainingStickyHeadClass = cn(
  "sticky right-24 z-[2] bg-elevated md:right-28",
  shrinkNumericClass,
  "text-right",
);
const remainingStickyBodyClass = cn(
  "sticky right-24 z-[1] md:right-28",
  stickySurfaceClass,
);
const actionsStickyHeadClass = cn(
  "sticky right-0 z-[2] w-[1%] whitespace-nowrap bg-elevated text-right",
);
const actionsStickyBodyClass = cn("sticky right-0 z-[1] w-[1%] whitespace-nowrap", stickySurfaceClass);
const headerClass = "border-b border-default bg-elevated backdrop-blur-none";

const overflowLabels: Record<MoneyLedgerOverflowId, string> = {
  preview: "Preview",
  adjust: "Adjust",
  send: "Send",
};

function stopRowClick(event: MouseEvent<HTMLElement>) {
  event.stopPropagation();
}

function statusToneClass(tone: MoneyLedgerStatusTone): string {
  switch (tone) {
    case "success":
      return "text-success";
    case "warning":
      return "text-warning";
    case "default":
      return "text-highlighted";
    case "muted":
      return "text-muted";
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

function MoneyCell({
  label,
  remainingAmount,
  highlighted = false,
  className,
}: {
  label: string;
  remainingAmount?: number;
  highlighted?: boolean;
  className?: string;
}) {
  const tone =
    remainingAmount !== undefined && remainingAmount > 0
      ? "text-warning"
      : highlighted
        ? "text-highlighted"
        : "text-muted";
  return <TableCell className={cn(numericCellClass, tone, className)}>{label || "—"}</TableCell>;
}

function BillClientMark({ title, hueId }: { title: string; hueId: string }) {
  return (
    <span
      className="relative flex size-8 shrink-0 items-center justify-center rounded-xl border border-default bg-[var(--project-hue-soft)] text-[0.6875rem] font-semibold tracking-wide text-[var(--project-hue)] dark:bg-[var(--project-hue-soft-dark)] dark:text-[var(--project-hue-dark)]"
      style={projectHueStyle(hueId)}
      aria-hidden
    >
      {moneyBillInitials(title)}
    </span>
  );
}

function IconMark({ children }: { children: ReactNode }) {
  return (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-default bg-elevated text-muted"
      aria-hidden
    >
      {children}
    </span>
  );
}

function LedgerMark({ mark, title }: { mark: MoneyLedgerMark; title: string }) {
  switch (mark.kind) {
    case "client":
      return <BillClientMark title={title} hueId={mark.hueId} />;
    case "member":
      return (
        <AgencyMemberAvatar
          name={title}
          userId={mark.userId}
          avatarUrl={mark.avatarUrl}
          size="md"
        />
      );
    case "expense":
      return <ExpenseStripGlyph kind={mark.expenseKind} />;
    case "salary-pool":
      return (
        <IconMark>
          <Users className="size-3.5" />
        </IconMark>
      );
    case "adjustment":
      return (
        <IconMark>
          <span className="text-[0.6875rem] font-semibold tracking-wide">
            {moneyBillInitials(title)}
          </span>
        </IconMark>
      );
    default: {
      const _exhaustive: never = mark;
      return _exhaustive;
    }
  }
}

function PartyGlyph({ partyKind }: { partyKind: MoneyLedgerPartyKind }) {
  switch (partyKind) {
    case "client":
      return <Building2 className="size-3" aria-hidden />;
    case "team":
    case "salary-pool":
      return <Users className="size-3" aria-hidden />;
    case "adjustment":
      return <SlidersHorizontal className="size-3" aria-hidden />;
    case "expense":
      return <Wallet className="size-3" aria-hidden />;
    default: {
      const _exhaustive: never = partyKind;
      return _exhaustive;
    }
  }
}

function InteractiveBillRow({
  label,
  onOpen,
  children,
  className,
  selected = false,
}: {
  label: string;
  onOpen: () => void;
  children: ReactNode;
  className?: string;
  selected?: boolean;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onOpen();
  }

  return (
    <TableRow
      tabIndex={0}
      data-state={selected ? "selected" : undefined}
      aria-haspopup="dialog"
      aria-label={label}
      aria-selected={selected}
      className={cn(
        "group/row cursor-pointer border-b border-default last:border-b-0 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset data-[state=selected]:bg-muted",
        className,
      )}
      onClick={onOpen}
      onKeyDown={onKeyDown}
    >
      {children}
    </TableRow>
  );
}

function OverflowItems({
  items,
  disabled,
  onSelect,
}: {
  items: readonly MoneyLedgerOverflowId[];
  disabled: boolean;
  onSelect: (action: MoneyLedgerOverflowId) => void;
}) {
  if (items.length === 0) return null;
  return items.map((item) => (
    <DropdownMenuItem key={item} disabled={disabled} onSelect={() => onSelect(item)}>
      {overflowLabels[item]}
    </DropdownMenuItem>
  ));
}

function ChildIdentity({ child }: { child: MoneyLedgerChildRow }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 pl-10 md:pl-14">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="truncate text-xs font-medium text-highlighted">{child.periodLabel}</span>
        {child.isCarry ? (
          <span className="rounded-md border border-default px-1.5 py-px text-[0.625rem] font-medium tracking-wide text-muted uppercase">
            Prior
          </span>
        ) : null}
        {child.wasteLabel ? (
          <span className="rounded-md border border-default px-1.5 py-px text-[0.625rem] font-medium tracking-wide text-muted uppercase">
            Waste {child.wasteLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function AgencyMoneyLedgerTableView({
  ariaLabel,
  rows,
  searchTerm,
  receivedHeading,
  showPartyGlyph,
  isMutationPending,
  selectedRowId,
  expandedRowIds,
  onToggleExpand,
  onOpenRow,
  onSettle,
  onOverflow,
  alwaysShowChildren = false,
  hideParentRow = false,
}: AgencyMoneyLedgerTableViewProps) {
  const reserveExpandGutter = rows.some((row) => row.expandable) && !alwaysShowChildren;
  const showHours = moneyLedgerTableShowsHours(rows);
  const identityHeading = moneyLedgerTableIdentityHeading(rows);
  const tableMinWidth = showHours ? "min-w-[42rem]" : "min-w-[34rem]";

  return (
    <div className={tableWrapperClass}>
      <Table className={tableMinWidth} aria-label={ariaLabel}>
        <TableHeader className={headerClass}>
          <TableRow>
            <TableHead scope="col" className={identityStickyHeadClass}>
              {identityHeading}
            </TableHead>
            <TableHead aria-hidden className={spacerCellClass} />
            <TableHead
              scope="col"
              className={cn(desktopOnlyCellClass, shrinkNumericClass, "text-right")}
            >
              Status
            </TableHead>
            {showHours ? (
              <TableHead scope="col" className={cn(shrinkNumericClass, "text-right")}>
                Hours
              </TableHead>
            ) : null}
            <TableHead
              scope="col"
              className={cn(desktopOnlyCellClass, shrinkNumericClass, "text-right")}
            >
              Total
            </TableHead>
            <TableHead
              scope="col"
              className={cn(desktopOnlyCellClass, shrinkNumericClass, "text-right")}
            >
              {receivedHeading}
            </TableHead>
            <TableHead scope="col" className={remainingStickyHeadClass}>
              Remaining
            </TableHead>
            <TableHead scope="col" className={actionsStickyHeadClass}>
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const expanded = alwaysShowChildren || expandedRowIds.has(row.id);
            const showChildren = row.children.length > 0 && (row.expandable ? expanded : false);
            const visibleChildren = alwaysShowChildren
              ? row.children
              : showChildren
                ? row.children
                : [];

            return (
              <LedgerParentBlock
                key={row.id}
                row={row}
                searchTerm={searchTerm}
                showPartyGlyph={showPartyGlyph}
                isMutationPending={isMutationPending}
                selected={selectedRowId === row.id}
                expanded={expanded}
                showExpandControl={row.expandable && !alwaysShowChildren}
                reserveExpandGutter={reserveExpandGutter}
                hideParentRow={hideParentRow}
                visibleChildren={visibleChildren}
                showHours={showHours}
                onToggleExpand={() => onToggleExpand(row.id)}
                onOpen={() => onOpenRow(row.id)}
                onSettle={onSettle}
                onOverflow={onOverflow}
              />
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function LedgerParentBlock({
  row,
  searchTerm,
  showPartyGlyph,
  isMutationPending,
  selected,
  expanded,
  showExpandControl,
  reserveExpandGutter,
  hideParentRow,
  visibleChildren,
  showHours,
  onToggleExpand,
  onOpen,
  onSettle,
  onOverflow,
}: {
  row: MoneyLedgerParentRow;
  searchTerm: string;
  showPartyGlyph: boolean;
  isMutationPending: boolean;
  selected: boolean;
  expanded: boolean;
  showExpandControl: boolean;
  reserveExpandGutter: boolean;
  hideParentRow: boolean;
  visibleChildren: readonly MoneyLedgerChildRow[];
  showHours: boolean;
  onToggleExpand: () => void;
  onOpen: () => void;
  onSettle: (rowId: string, childId?: string) => void;
  onOverflow: (rowId: string, action: MoneyLedgerOverflowId, childId?: string) => void;
}) {
  return (
    <>
      {hideParentRow ? null : (
        <InteractiveBillRow
          label={`${row.title}. Remaining ${row.remainingLabel}.`}
          onOpen={onOpen}
          selected={selected}
        >
          <TableCell className={identityStickyBodyClass}>
            <div className="flex min-w-0 items-center gap-2.5">
              {showExpandControl ? (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="size-7 shrink-0"
                  aria-expanded={expanded}
                  aria-label={expanded ? `Collapse ${row.title}` : `Expand ${row.title}`}
                  onClick={(event) => {
                    stopRowClick(event);
                    onToggleExpand();
                  }}
                >
                  <ChevronRight
                    className={cn(
                      "size-3.5 text-muted transition-transform duration-200 ease-out motion-reduce:transition-none",
                      expanded && "rotate-90",
                    )}
                  />
                </Button>
              ) : reserveExpandGutter ? (
                <span className="size-7 shrink-0" aria-hidden />
              ) : null}
              {showPartyGlyph ? (
                <span className="text-muted">
                  <PartyGlyph partyKind={row.partyKind} />
                </span>
              ) : null}
              <LedgerMark mark={row.mark} title={row.title} />
              <span className="min-w-0 truncate font-medium text-highlighted" dir="auto">
                <AgencySearchHighlight text={row.title} query={searchTerm} />
              </span>
            </div>
          </TableCell>
          <TableCell aria-hidden className={spacerCellClass} />
          <TableCell className={cn(desktopOnlyCellClass, shrinkNumericClass, "text-right")}>
            <span className={cn("text-xs font-medium", statusToneClass(row.statusTone))}>
              {row.statusLabel}
            </span>
          </TableCell>
          {showHours ? (
            <TableCell className={cn(numericCellClass, "text-muted")}>
              {row.hoursLabel || "—"}
            </TableCell>
          ) : null}
          <MoneyCell label={row.totalLabel} highlighted className={desktopOnlyCellClass} />
          <MoneyCell label={row.receivedLabel} className={desktopOnlyCellClass} />
          <MoneyCell
            label={row.remainingLabel}
            remainingAmount={row.remainingAmount}
            className={remainingStickyBodyClass}
          />
          <MoneyTableActionsCell
            className={actionsStickyBodyClass}
            settleLabel={row.settleLabel}
            settleDisabled={isMutationPending}
            onSettle={() => onSettle(row.id)}
            overflow={
              row.overflow.length > 0 ? (
                <OverflowItems
                  items={row.overflow}
                  disabled={isMutationPending}
                  onSelect={(action) => onOverflow(row.id, action)}
                />
              ) : null
            }
          />
        </InteractiveBillRow>
      )}
      {visibleChildren.map((child) => (
        <InteractiveBillRow
          key={child.id}
          label={`${row.title}, ${child.periodLabel}. Remaining ${child.remainingLabel}.`}
          onOpen={onOpen}
          className="border-t border-default/60"
        >
          <TableCell className={identityStickyBodyClass}>
            <ChildIdentity child={child} />
          </TableCell>
          <TableCell aria-hidden className={spacerCellClass} />
          <TableCell className={cn(desktopOnlyCellClass, shrinkNumericClass, "text-right")}>
            <span className={cn("text-xs font-medium", statusToneClass(child.statusTone))}>
              {child.statusLabel}
            </span>
          </TableCell>
          {showHours ? (
            <TableCell className={cn(numericCellClass, "text-muted")}>
              {child.hoursLabel || "—"}
            </TableCell>
          ) : null}
          <MoneyCell label={child.totalLabel} highlighted className={desktopOnlyCellClass} />
          <MoneyCell label={child.receivedLabel} className={desktopOnlyCellClass} />
          <MoneyCell
            label={child.remainingLabel}
            remainingAmount={child.remainingAmount}
            className={remainingStickyBodyClass}
          />
          <MoneyTableActionsCell
            className={actionsStickyBodyClass}
            settleLabel={child.settleLabel}
            settleDisabled={isMutationPending}
            onSettle={() => onSettle(row.id, child.id)}
            overflow={
              child.overflow.length > 0 ? (
                <OverflowItems
                  items={child.overflow}
                  disabled={isMutationPending}
                  onSelect={(action) => onOverflow(row.id, action, child.id)}
                />
              ) : null
            }
          />
        </InteractiveBillRow>
      ))}
    </>
  );
}
