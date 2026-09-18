import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@/lib/navigation";

import {
  moneyBillsActiveFilterSummary,
  moneyBillsEmptyCopy,
  moneyBillsSalaryPoolDetailVisible,
  moneyBillsSalaryPoolMatchesStatus,
  moneyBillsSalaryPoolStatus,
  moneyBillsStatusAllowed,
  moneyBillsStatusOptionsForParty,
  MONEY_BILLS_PARTY_OPTIONS,
  type MoneyBillsClientCategoryFilter,
  type MoneyBillsPartyFilter,
  type MoneyBillsStatusFilter,
} from "@/features/billing/money-bills-filters";
import {
  buildMoneyBillPersonGroups,
  filterComposeRowsByClientCategory,
  groupMoneyBillComposeDisplayRows,
  type MoneyBillComposeDisplayRow,
  type MoneyBillPersonGroup,
  type MoneyPendingAdjustmentSource,
} from "@/features/billing/money-bill-obligation-rows";
import {
  formatMoneyAmount,
  moneyBillClientHref,
  moneyBillMemberHref,
  moneyBillRowFromAdjustmentLine,
  MONEY_ADJUSTMENT_SECTION_OPTIONS,
  moneyBillsAdjustmentCreateValid,
  moneyBillsCreateFormValid,
  moneyBillsIsAdjustmentSection,
  moneyBillsPartyShowsAdjustments,
  moneyBillsPartyShowsClients,
  moneyBillsPartyShowsExpenses,
  moneyBillsPartyShowsMembers,
  moneyBillsPaymentCanSubmit,
  parseMoneyBillPaymentAmount,
  type MoneyBillAdjustmentRow,
} from "@/features/billing/money-bills-rows";
import {
  moneyExpenseAmountError,
  parseMoneyExpenseAmount,
} from "@/features/billing/money-expense-form";
import {
  selectIsInvoiceMutationPending,
  useAgencyOpsStore,
} from "@/features/shared/stores/agency-ops";
import { toDateInputValue } from "@/features/shared/use-agency-time-range-filters";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { orpc } from "@/lib/orpc";

import { useAgencyMoneyBillAdjust } from "./use-agency-money-bill-adjust";
import { useAgencyMoneyBillPreview } from "./use-agency-money-bill-preview";

const BILL_CREATE_FORM_ID = "agency-money-bill-create";
const BILL_PAYMENT_FORM_ID = "agency-money-bill-payment";

type MoneyPaymentTarget = {
  kind: "invoice" | "payout" | "adjustment";
  id: string;
  partyName: string;
  referenceLabel: string;
  remainingAmount: number;
  remainingLabel: string;
  currency: string;
};

export type BillsDetailSelection =
  | { kind: "group"; id: string }
  | { kind: "adjustment"; id: string }
  | { kind: "salary-pool" }
  | null;

type UseAgencyMoneyBillsArgs = {
  teamId: string;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  isOwner: boolean;
  canManageMoney: boolean;
  partyFilter: MoneyBillsPartyFilter;
  statusFilter: MoneyBillsStatusFilter | null;
  searchTerm: string;
  remoteSearchTerm: string;
  scoreboardCurrency: string;
  scoreboardCurrencyOptional: string | undefined;
  billsRemainingLabel: string | null;
  expensesStatus: "loading" | "error" | "ready";
  expensesErrorMessage: string;
  onOpenExpenseCreate: () => void;
  refetchExpenses: () => Promise<unknown>;
  updateMoneySearch: (
    updates: Partial<Record<"party" | "status" | "expense" | "q", string | null>>,
    replace?: boolean,
  ) => void;
};

export function useAgencyMoneyBills({
  teamId,
  periodStart,
  periodEnd,
  periodLabel,
  isOwner,
  canManageMoney,
  partyFilter,
  statusFilter,
  searchTerm,
  remoteSearchTerm,
  scoreboardCurrency,
  scoreboardCurrencyOptional,
  billsRemainingLabel,
  expensesStatus,
  expensesErrorMessage,
  onOpenExpenseCreate,
  refetchExpenses,
  updateMoneySearch,
}: UseAgencyMoneyBillsArgs) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const agencyOps = useAgencyOpsStore();
  const isInvoiceMutationPending = useAgencyOpsStore(selectIsInvoiceMutationPending);

  const [clientCategoryFilter, setClientCategoryFilter] =
    useState<MoneyBillsClientCategoryFilter>("external");
  const [billCreateOpen, setBillCreateOpen] = useState(false);
  const [billCreateClientId, setBillCreateClientId] = useState("");
  const [billCreatePeriodStart, setBillCreatePeriodStart] = useState("");
  const [billCreatePeriodEnd, setBillCreatePeriodEnd] = useState("");
  const [billCreateSubmitted, setBillCreateSubmitted] = useState(false);
  const [adjustmentCreateOpen, setAdjustmentCreateOpen] = useState(false);
  const [adjustmentSectionKey, setAdjustmentSectionKey] =
    useState<(typeof MONEY_ADJUSTMENT_SECTION_OPTIONS)[number]["id"]>("debt_discount");
  const [adjustmentLabel, setAdjustmentLabel] = useState("");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentCreateSubmitted, setAdjustmentCreateSubmitted] = useState(false);
  const [salaryPoolPayAmount, setSalaryPoolPayAmount] = useState("");
  const [salaryPoolPayPending, setSalaryPoolPayPending] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<{
    kind: "invoice" | "payout" | "adjustment";
    id: string;
  } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [pendingActionInvoiceId, setPendingActionInvoiceId] = useState<string | null>(null);
  const [markPaidTargetId, setMarkPaidTargetId] = useState<string | null>(null);
  const [dismissTargetId, setDismissTargetId] = useState<string | null>(null);
  const [composeActionPending, setComposeActionPending] = useState(false);
  const [expandedLedgerIds, setExpandedLedgerIds] = useState<ReadonlySet<string>>(() => new Set());
  const [detailSelection, setDetailSelection] = useState<BillsDetailSelection>(null);

  const showsClientBills = moneyBillsPartyShowsClients(partyFilter);
  const showsMemberBills = moneyBillsPartyShowsMembers(partyFilter);
  const showsAdjustmentBills = moneyBillsPartyShowsAdjustments(partyFilter);
  const showsExpenses = moneyBillsPartyShowsExpenses(partyFilter);
  const loadsPeriodBills =
    !showsExpenses && (showsClientBills || showsMemberBills || showsAdjustmentBills);
  const loadsPayoutLines = showsMemberBills || showsAdjustmentBills;
  const loadsPeriodObligations = showsClientBills || showsMemberBills;
  const loadsSalaryPool = moneyBillsSalaryPoolDetailVisible(partyFilter, true);

  const teamBillStatus =
    statusFilter === "outstanding" || statusFilter === "partial" || statusFilter === "paid"
      ? statusFilter
      : undefined;

  const payoutBillsParty =
    partyFilter === "team"
      ? ("team" as const)
      : partyFilter === "adjustments"
        ? ("adjustments" as const)
        : ("all" as const);

  const invoicesQuery = useQuery({
    ...orpc.agencyOps.invoices.list.queryOptions({
      input: {
        teamId,
        periodStart,
        periodEnd,
        billStatus: statusFilter ?? undefined,
        search: remoteSearchTerm.trim() || undefined,
      },
    }),
    enabled: Boolean(teamId) && isOwner && showsClientBills,
  });

  const payoutsQuery = useQuery({
    ...orpc.agencyOps.payouts.list.queryOptions({
      input: {
        teamId,
        periodStart,
        periodEnd,
        billStatus: teamBillStatus,
        search: remoteSearchTerm.trim() || undefined,
        billsParty: payoutBillsParty,
      },
    }),
    enabled: Boolean(teamId) && isOwner && loadsPayoutLines,
  });

  const salaryPoolQuery = useQuery({
    ...orpc.agencyOps.salaryPool.get.queryOptions({
      input: {
        teamId,
        periodStart,
        periodEnd,
      },
    }),
    enabled: Boolean(teamId) && isOwner,
  });

  const periodObligationsQuery = useQuery({
    ...orpc.agencyOps.periodObligations.list.queryOptions({
      input: {
        teamId,
        periodStart,
        periodEnd,
        search: remoteSearchTerm.trim() || undefined,
      },
    }),
    enabled: Boolean(teamId) && isOwner && loadsPeriodObligations,
  });

  const periodActivityQuery = useQuery({
    ...orpc.agencyOps.invoices.periodActivity.queryOptions({
      input: {
        teamId,
        periodStart,
        periodEnd,
        search: remoteSearchTerm.trim() || undefined,
      },
    }),
    enabled: Boolean(teamId) && isOwner && (showsClientBills || showsMemberBills),
  });

  const clientsQuery = useQuery({
    ...orpc.agencyOps.clients.list.queryOptions({
      input: { teamId, page: 1, pageSize: 200 },
    }),
    enabled: Boolean(teamId),
  });

  const salaryPool = salaryPoolQuery.data?.pool ?? null;
  const salaryPoolStatus = salaryPool
    ? moneyBillsSalaryPoolStatus(salaryPool.paidAmount, salaryPool.remainingAmount)
    : null;
  const visibleSalaryPool =
    salaryPool &&
    moneyBillsSalaryPoolDetailVisible(partyFilter, true) &&
    salaryPoolStatus &&
    moneyBillsSalaryPoolMatchesStatus(statusFilter, salaryPoolStatus)
      ? salaryPool
      : null;

  const statusOptions = useMemo(() => moneyBillsStatusOptionsForParty(partyFilter), [partyFilter]);

  const billsClientCategoryFilterActive =
    partyFilter === "all" || partyFilter === "client" ? clientCategoryFilter : null;
  const billsEmptyCopy = useMemo(
    () =>
      moneyBillsEmptyCopy(partyFilter, statusFilter, searchTerm, billsClientCategoryFilterActive),
    [billsClientCategoryFilterActive, partyFilter, searchTerm, statusFilter],
  );
  const billsActiveFilterSummary = useMemo(
    () => moneyBillsActiveFilterSummary(partyFilter, statusFilter, billsClientCategoryFilterActive),
    [billsClientCategoryFilterActive, partyFilter, statusFilter],
  );

  const clientCategoryById = useMemo(() => {
    const map = new Map<string, "internal" | "external">();
    for (const client of clientsQuery.data?.items ?? []) {
      map.set(client.id, client.category);
    }
    return map;
  }, [clientsQuery.data?.items]);

  const billRows = useMemo(() => {
    const currency = scoreboardCurrency;
    const clients = (periodObligationsQuery.data?.clients ?? []).map((client) => ({
      ...client,
      currency,
    }));
    const members = (periodObligationsQuery.data?.members ?? []).map((member) => ({
      ...member,
      currency,
    }));
    const pendingAdjustments: MoneyPendingAdjustmentSource[] = (
      periodObligationsQuery.data?.pendingAdjustments ?? []
    ).map((item) => ({
      id: item.id,
      partyType: item.partyType,
      partyId: item.partyId,
      kind: item.kind,
      amount: item.amount,
      note: item.note,
      periodStart: item.periodStart,
      periodEnd: item.periodEnd,
      obligationId: item.obligationId,
      appliedInvoiceId: item.appliedInvoiceId,
    }));
    const adjustmentLines = (payoutsQuery.data?.items ?? [])
      .filter((payout) => moneyBillsIsAdjustmentSection(payout.sectionKey))
      .map((payout) => {
        const row = moneyBillRowFromAdjustmentLine(payout);
        if (row.currency === currency) return row;
        return {
          ...row,
          currency,
          amountLabel: formatMoneyAmount(row.amount, currency),
          paidLabel: formatMoneyAmount(row.paidAmount, currency),
          remainingLabel: formatMoneyAmount(row.remainingAmount, currency),
        };
      });
    const rows = buildMoneyBillPersonGroups({
      clients: showsClientBills ? clients : [],
      members: showsMemberBills ? members : [],
      adjustments: showsAdjustmentBills ? adjustmentLines : [],
      pendingAdjustments,
      statusFilter,
      includeClients: showsClientBills,
      includeMembers: showsMemberBills,
      includeAdjustments: showsAdjustmentBills,
    });
    if (billsClientCategoryFilterActive === null) return rows;
    return filterComposeRowsByClientCategory(
      rows,
      billsClientCategoryFilterActive,
      clientCategoryById,
    );
  }, [
    clientCategoryById,
    billsClientCategoryFilterActive,
    periodObligationsQuery.data?.clients,
    periodObligationsQuery.data?.members,
    periodObligationsQuery.data?.pendingAdjustments,
    scoreboardCurrency,
    payoutsQuery.data?.items,
    showsAdjustmentBills,
    showsClientBills,
    showsMemberBills,
    statusFilter,
  ]);

  const visibleDetailSelection =
    detailSelection?.kind === "salary-pool" && !visibleSalaryPool ? null : detailSelection;

  const detailRow = useMemo<MoneyBillPersonGroup | MoneyBillAdjustmentRow | null>(() => {
    if (!visibleDetailSelection || visibleDetailSelection.kind === "salary-pool") return null;
    return (
      billRows.find((row) => {
        if (row.id !== visibleDetailSelection.id) return false;
        return visibleDetailSelection.kind === "group"
          ? row.kind === "person-group"
          : row.kind === "adjustment";
      }) ?? null
    );
  }, [billRows, visibleDetailSelection]);

  useEffect(() => {
    if (!detailSelection) return;
    if (detailSelection.kind === "salary-pool") {
      if (!visibleSalaryPool) setDetailSelection(null);
      return;
    }
    if (!detailRow) setDetailSelection(null);
  }, [detailRow, detailSelection, visibleSalaryPool]);

  function onOpenRow(row: MoneyBillComposeDisplayRow) {
    switch (row.kind) {
      case "person-group":
        setDetailSelection({ kind: "group", id: row.id });
        return;
      case "adjustment":
        setDetailSelection({ kind: "adjustment", id: row.id });
        return;
      default: {
        const _exhaustive: never = row;
        void _exhaustive;
      }
    }
  }

  async function invalidateMoneyComposeQueries() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.periodObligations.list.key(),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.invoices.list.key(),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.payouts.list.key(),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.money.periodScoreboard.key(),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.invoices.periodActivity.key(),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.salaryPool.get.key(),
      }),
    ]);
  }

  const billAdjust = useAgencyMoneyBillAdjust({
    teamId,
    isInvoiceMutationPending,
    composeActionPending,
    setComposeActionPending,
    setPendingActionInvoiceId,
    invalidateMoneyComposeQueries,
  });
  const billPreview = useAgencyMoneyBillPreview({
    teamId,
    periodLabel,
    composeActionPending,
    setComposeActionPending,
    invalidateMoneyComposeQueries,
  });

  const resolvePaymentTarget = useMemo(
    () =>
      (rowId: string): MoneyPaymentTarget | null => {
        const currency = scoreboardCurrency;
        const payoutLine = (payoutsQuery.data?.items ?? []).find((line) => line.id === rowId);
        if (payoutLine) {
          const kind = moneyBillsIsAdjustmentSection(payoutLine.sectionKey)
            ? "adjustment"
            : "payout";
          return {
            kind,
            id: payoutLine.id,
            partyName:
              kind === "adjustment"
                ? payoutLine.label || payoutLine.sectionTitle
                : payoutLine.userName,
            referenceLabel: kind === "adjustment" ? payoutLine.sectionTitle : payoutLine.label,
            remainingAmount: payoutLine.remainingAmount,
            remainingLabel: formatMoneyAmount(payoutLine.remainingAmount, currency),
            currency,
          };
        }

        const invoice = (invoicesQuery.data?.items ?? []).find((item) => item.id === rowId);
        if (invoice) {
          return {
            kind: "invoice",
            id: invoice.id,
            partyName: invoice.clientName,
            referenceLabel: invoice.number,
            remainingAmount: invoice.remainingAmount,
            remainingLabel: formatMoneyAmount(invoice.remainingAmount, currency),
            currency,
          };
        }

        return null;
      },
    [invoicesQuery.data?.items, payoutsQuery.data?.items, scoreboardCurrency],
  );

  const paymentRow = useMemo(
    () => (paymentTarget ? resolvePaymentTarget(paymentTarget.id) : null),
    [paymentTarget, resolvePaymentTarget],
  );

  const adjustmentCreateValid = moneyBillsAdjustmentCreateValid(
    adjustmentSectionKey,
    adjustmentLabel,
    adjustmentAmount,
  );

  const clients = useMemo(() => {
    const activityClients = (periodActivityQuery.data?.clients ?? []).map((client) => ({
      id: client.clientId,
      name: client.clientName,
    }));
    if (activityClients.length > 0) return activityClients;
    return (clientsQuery.data?.items ?? []).map((client) => ({
      id: client.id,
      name: client.name,
    }));
  }, [clientsQuery.data?.items, periodActivityQuery.data?.clients]);

  const createFormValid = moneyBillsCreateFormValid(
    billCreateClientId,
    billCreatePeriodStart,
    billCreatePeriodEnd,
  );
  const billCreateErrors = {
    client: billCreateSubmitted && !billCreateClientId ? "Choose the client to invoice." : null,
    period:
      billCreateSubmitted && (!billCreatePeriodStart || !billCreatePeriodEnd)
        ? "Choose the invoice period."
        : billCreateSubmitted && billCreatePeriodEnd < billCreatePeriodStart
          ? "The end date must be on or after the start date."
          : null,
  };
  const adjustmentCreateErrors = {
    label:
      adjustmentCreateSubmitted && adjustmentSectionKey !== "salary_pool" && !adjustmentLabel.trim()
        ? "Enter a label for this adjustment."
        : null,
    amount: adjustmentCreateSubmitted ? moneyExpenseAmountError(adjustmentAmount) : null,
  };
  const paymentCanSubmit = paymentRow
    ? moneyBillsPaymentCanSubmit(paymentAmount, paymentRow.remainingAmount)
    : false;
  const paymentValidationMessage =
    paymentAmount.trim().length > 0 && paymentRow && !paymentCanSubmit
      ? `Enter an amount greater than zero and no more than ${paymentRow.remainingLabel}.`
      : null;
  const markPaidTarget = markPaidTargetId ? resolvePaymentTarget(markPaidTargetId) : null;
  const dismissTarget = dismissTargetId ? resolvePaymentTarget(dismissTargetId) : null;

  const billsIsLoading = showsExpenses
    ? expensesStatus === "loading"
    : loadsPeriodBills &&
      ((loadsPeriodObligations && periodObligationsQuery.isPending) ||
        (showsAdjustmentBills && payoutsQuery.isPending) ||
        (loadsSalaryPool && salaryPoolQuery.isPending));
  const billsIsError = showsExpenses
    ? expensesStatus === "error"
    : loadsPeriodBills &&
      ((loadsPeriodObligations && periodObligationsQuery.isError) ||
        (showsAdjustmentBills && payoutsQuery.isError) ||
        (loadsSalaryPool && salaryPoolQuery.isError));
  const billsErrorMessage = showsExpenses
    ? expensesErrorMessage
    : getErrorMessage(
        periodObligationsQuery.error ?? payoutsQuery.error ?? salaryPoolQuery.error,
        "Try refreshing.",
      );

  function onPartyFilterChange(next: MoneyBillsPartyFilter) {
    const updates: Partial<Record<"party" | "status" | "expense" | "q", string | null>> = {
      party: next,
      status: statusFilter && moneyBillsStatusAllowed(next, statusFilter) ? statusFilter : null,
    };
    if (next !== "expenses") updates.expense = null;
    updateMoneySearch(updates, false);
    if (next === "all" || next === "client") {
      setClientCategoryFilter("external");
    }
  }

  function onStatusFilterChange(next: MoneyBillsStatusFilter) {
    updateMoneySearch({ status: next }, false);
  }

  function onClearStatusFilter() {
    updateMoneySearch({ status: null }, false);
  }

  function onClearClientCategoryFilter() {
    setClientCategoryFilter(null);
  }

  function onClearAllFilters() {
    updateMoneySearch({ party: null, status: null, expense: null, q: null }, false);
    setClientCategoryFilter(null);
  }

  function resetBillCreateForm() {
    setBillCreateClientId("");
    setBillCreatePeriodStart("");
    setBillCreatePeriodEnd("");
    setBillCreateSubmitted(false);
  }

  function openBillCreate(clientId = "") {
    setBillCreateClientId(clientId);
    setBillCreatePeriodStart(toDateInputValue(new Date(periodStart)));
    setBillCreatePeriodEnd(toDateInputValue(new Date(periodEnd)));
    setBillCreateOpen(true);
  }

  function onBillCreateOpenChange(open: boolean) {
    setBillCreateOpen(open);
    if (!open) resetBillCreateForm();
  }

  function onCreateInvoiceForClient(clientId: string) {
    openBillCreate(clientId);
  }

  function onOpenClient(clientId: string) {
    navigate(moneyBillClientHref(clientId));
  }

  function onOpenMember(userId: string) {
    navigate(moneyBillMemberHref(userId));
  }

  async function onCreatePayoutForMember(userId: string) {
    const member = (periodActivityQuery.data?.members ?? []).find((item) => item.userId === userId);
    setPendingActionInvoiceId(`merged-member:${userId}`);
    await agencyOps.createPayoutFromMember(
      {
        teamId,
        userId,
        userName: member?.userName ?? "",
        periodStart,
        periodEnd,
      },
      { onSuccess: () => setPendingActionInvoiceId(null) },
    );
    setPendingActionInvoiceId(null);
  }

  async function onBillCreateSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    setBillCreateSubmitted(true);
    if (!createFormValid) return;
    const client = clients.find((item) => item.id === billCreateClientId);
    await agencyOps.createInvoice(
      {
        teamId,
        clientId: billCreateClientId,
        clientName: client?.name ?? "",
        periodStart: new Date(billCreatePeriodStart).toISOString(),
        periodEnd: new Date(`${billCreatePeriodEnd}T23:59:59.999`).toISOString(),
      },
      { onSuccess: () => onBillCreateOpenChange(false) },
    );
  }

  function onPaymentOpenChange(open: boolean) {
    if (!open) {
      setPaymentTarget(null);
      setPaymentAmount("");
    }
  }

  function onOpenPayment(rowId: string) {
    const target = resolvePaymentTarget(rowId);
    if (!target) return;
    setPaymentTarget({ kind: target.kind, id: target.id });
    if (target) {
      setPaymentAmount((target.remainingAmount / 100).toFixed(2));
      return;
    }
    setPaymentAmount("");
  }

  async function onPaymentSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (!paymentRow) return;
    const amount = parseMoneyBillPaymentAmount(paymentAmount, paymentRow.remainingAmount);
    if (amount === null) return;
    setPendingActionInvoiceId(paymentRow.id);
    if (paymentRow.kind === "invoice") {
      await agencyOps.recordInvoicePayment(
        { teamId, invoiceId: paymentRow.id, amount },
        {
          onSuccess: () => {
            onPaymentOpenChange(false);
            setPendingActionInvoiceId(null);
          },
        },
      );
    } else {
      await agencyOps.recordPayoutPayment(
        { teamId, lineId: paymentRow.id, amount },
        {
          onSuccess: () => {
            onPaymentOpenChange(false);
            setPendingActionInvoiceId(null);
          },
        },
      );
    }
    setPendingActionInvoiceId(null);
  }

  function onAdjustmentCreateOpenChange(open: boolean) {
    setAdjustmentCreateOpen(open);
    if (!open) {
      setAdjustmentSectionKey("debt_discount");
      setAdjustmentLabel("");
      setAdjustmentAmount("");
      setAdjustmentCreateSubmitted(false);
    }
  }

  async function onAdjustmentCreateSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    setAdjustmentCreateSubmitted(true);
    if (!adjustmentCreateValid) return;
    const amount = parseMoneyExpenseAmount(adjustmentAmount);
    if (amount === null) return;
    if (adjustmentSectionKey === "salary_pool") {
      await agencyOps.upsertSalaryPoolTotal(
        {
          teamId,
          periodStart,
          periodEnd,
          totalAmount: amount,
          currency: scoreboardCurrencyOptional,
        },
        { onSuccess: () => onAdjustmentCreateOpenChange(false) },
      );
      return;
    }
    await agencyOps.createPayoutLine(
      {
        teamId,
        periodStart,
        periodEnd,
        sectionKey: adjustmentSectionKey,
        label: adjustmentLabel,
        amount,
      },
      { onSuccess: () => onAdjustmentCreateOpenChange(false) },
    );
  }

  async function onSendBill(invoiceId: string) {
    setPendingActionInvoiceId(invoiceId);
    await agencyOps.updateInvoiceStatus(
      { teamId, invoiceId, status: "sent" },
      { onSuccess: () => setPendingActionInvoiceId(null) },
    );
    setPendingActionInvoiceId(null);
  }

  function onRequestMarkBillPaid(rowId: string) {
    setMarkPaidTargetId(rowId);
  }

  async function onConfirmMarkBillPaid() {
    const rowId = markPaidTargetId;
    if (!rowId) return;
    const target = resolvePaymentTarget(rowId);
    if (!target) {
      setMarkPaidTargetId(null);
      return;
    }
    setPendingActionInvoiceId(rowId);
    if (target.kind === "payout" || target.kind === "adjustment") {
      await agencyOps.updatePayoutLineStatus(
        { teamId, lineId: rowId, status: "paid" },
        { onSuccess: () => setPendingActionInvoiceId(null) },
      );
    } else {
      await agencyOps.updateInvoiceStatus(
        { teamId, invoiceId: rowId, status: "paid" },
        { onSuccess: () => setPendingActionInvoiceId(null) },
      );
    }
    setPendingActionInvoiceId(null);
    setMarkPaidTargetId(null);
  }

  async function runDismissAdjustment(rowId: string) {
    setPendingActionInvoiceId(rowId);
    await agencyOps.deletePayoutLine(
      { teamId, lineId: rowId },
      { onSuccess: () => setPendingActionInvoiceId(null) },
    );
    setPendingActionInvoiceId(null);
    setDismissTargetId(null);
  }

  function onDismissAdjustment(rowId: string) {
    const payout = (payoutsQuery.data?.items ?? []).find((line) => line.id === rowId);
    if (!payout?.canDelete) return;
    if (payout.status !== "draft") {
      setDismissTargetId(rowId);
      return;
    }
    void runDismissAdjustment(rowId);
  }

  async function onSalaryPoolPay() {
    const pool = salaryPoolQuery.data?.pool;
    if (!pool) return;
    const amount = parseMoneyBillPaymentAmount(salaryPoolPayAmount, pool.remainingAmount);
    if (amount === null) return;

    setSalaryPoolPayPending(true);
    await agencyOps.recordSalaryPoolPayment(
      {
        teamId,
        periodStart,
        periodEnd,
        amount,
      },
      {
        onSuccess: () => setSalaryPoolPayAmount(""),
      },
    );
    setSalaryPoolPayPending(false);
  }

  const salaryPoolViewModel = useMemo(() => {
    const pool = visibleSalaryPool;
    const currency = pool?.currency ?? scoreboardCurrency;
    const canPay = pool != null && pool.remainingAmount > 0 && canManageMoney;
    const payAmount = pool
      ? parseMoneyBillPaymentAmount(salaryPoolPayAmount, pool.remainingAmount)
      : null;
    return {
      pool: pool
        ? {
            totalLabel: formatMoneyAmount(pool.totalAmount, currency),
            paidLabel: formatMoneyAmount(pool.paidAmount, currency),
            remainingLabel: formatMoneyAmount(pool.remainingAmount, currency),
            remainingAmount: pool.remainingAmount,
            statusLabel:
              salaryPoolStatus === "paid"
                ? "Paid"
                : salaryPoolStatus === "partial"
                  ? "Partial"
                  : "Outstanding",
            currency,
          }
        : null,
      payAmount: salaryPoolPayAmount,
      canPay,
      canSubmitPay: canPay && payAmount !== null,
      validationMessage:
        salaryPoolPayAmount.trim() && pool && payAmount === null
          ? `Enter an amount greater than zero and no more than ${formatMoneyAmount(pool.remainingAmount, currency)}.`
          : null,
      isPending: salaryPoolPayPending,
      onPayAmountChange: setSalaryPoolPayAmount,
      onPay: () => void onSalaryPoolPay(),
    };
  }, [
    canManageMoney,
    scoreboardCurrency,
    salaryPoolPayAmount,
    salaryPoolPayPending,
    salaryPoolStatus,
    visibleSalaryPool,
  ]);

  const billDisplaySections = useMemo(() => {
    const grouped = groupMoneyBillComposeDisplayRows(billRows);
    if (
      salaryPoolViewModel.pool &&
      !grouped.some((section) => section.id === "team") &&
      (partyFilter === "all" || partyFilter === "team")
    ) {
      return [
        ...grouped.filter((section) => section.id === "clients"),
        {
          id: "team" as const,
          title: "Team",
          hint: "Shared salary pool",
          rows: [],
        },
        ...grouped.filter((section) => section.id === "adjustments"),
      ];
    }
    return grouped;
  }, [billRows, partyFilter, salaryPoolViewModel.pool]);

  return {
    partyFilter,
    partyOptions: MONEY_BILLS_PARTY_OPTIONS,
    onPartyFilterChange,
    statusFilter,
    statusOptions,
    onStatusFilterChange,
    onClearStatusFilter,
    clientCategoryFilter,
    onClearClientCategoryFilter,
    onClearAllFilters,
    searchTerm,
    onSearchTermChange: (next: string) => updateMoneySearch({ q: next.trim() ? next : null }),
    activeFilterSummary: billsActiveFilterSummary,
    emptyCopy: billsEmptyCopy,
    billCount: billRows.length,
    remainingLabel: billsRemainingLabel,
    rows: billRows,
    displaySections: billDisplaySections,
    detailSelection: visibleDetailSelection,
    detailRow,
    selectedRowId:
      visibleDetailSelection?.kind === "salary-pool"
        ? "salary-pool"
        : (visibleDetailSelection?.id ?? null),
    expandedLedgerIds,
    onToggleLedgerExpand: (rowId: string) => {
      setExpandedLedgerIds((current) => {
        const next = new Set(current);
        if (next.has(rowId)) next.delete(rowId);
        else next.add(rowId);
        return next;
      });
    },
    onOpenRow,
    onOpenSalaryPool: () => setDetailSelection({ kind: "salary-pool" }),
    onCloseDetail: () => setDetailSelection(null),
    isLoading: billsIsLoading,
    isError: billsIsError,
    errorMessage: billsErrorMessage,
    onRetry: () => {
      if (showsExpenses) {
        void refetchExpenses();
        return;
      }
      void periodObligationsQuery.refetch();
      void payoutsQuery.refetch();
      void salaryPoolQuery.refetch();
    },
    isMutationPending: isInvoiceMutationPending || composeActionPending,
    pendingActionInvoiceId,
    periodLabel,
    createMenu: {
      onOpenInvoice: () => openBillCreate(),
      onOpenAdjustment: () => onAdjustmentCreateOpenChange(true),
      onOpenExpense: onOpenExpenseCreate,
    },
    onOpenClient,
    onOpenMember,
    onOpenPreview: billPreview.onOpenPreview,
    onOpenPreviewLine: billPreview.onOpenPreviewLine,
    onOpenAdjust: billAdjust.onOpenAdjust,
    onOpenAdjustLine: billAdjust.onOpenAdjustLine,
    onAddAdjustment: billAdjust.onAddAdjustment,
    onEditPendingAdjustment: billAdjust.onEditPendingAdjustment,
    onDeletePendingAdjustment: billAdjust.onDeletePendingAdjustment,
    onCreateInvoiceForClient,
    onCreatePayoutForMember,
    onSend: onSendBill,
    onMarkPaid: onRequestMarkBillPaid,
    onOpenPayment,
    onDismissAdjustment,
    markPaidConfirm: {
      open: Boolean(markPaidTarget),
      onOpenChange: (open: boolean) => {
        if (!open) setMarkPaidTargetId(null);
      },
      partyName: markPaidTarget?.partyName ?? "",
      amountLabel: markPaidTarget?.remainingLabel ?? "",
      isPending: isInvoiceMutationPending,
      onConfirm: () => void onConfirmMarkBillPaid(),
    },
    dismissConfirm: {
      open: Boolean(dismissTarget),
      onOpenChange: (open: boolean) => {
        if (!open) setDismissTargetId(null);
      },
      partyName: dismissTarget?.partyName ?? "",
      amountLabel: dismissTarget?.remainingLabel ?? "",
      isPending: isInvoiceMutationPending,
      onConfirm: () => {
        if (!dismissTargetId) return;
        void runDismissAdjustment(dismissTargetId);
      },
    },
    salaryPool: salaryPoolViewModel,
    queueSalaryPoolRemainingAmount: salaryPool?.remainingAmount ?? 0,
    queueSalaryPoolQueryStatus:
      salaryPoolQuery.isPending && isOwner
        ? ("loading" as const)
        : salaryPoolQuery.isError
          ? ("error" as const)
          : ("ready" as const),
    preview: billPreview.preview,
    adjust: billAdjust.adjust,
    create: {
      open: billCreateOpen,
      onOpenChange: onBillCreateOpenChange,
      formId: BILL_CREATE_FORM_ID,
      clients,
      clientId: billCreateClientId,
      onClientIdChange: setBillCreateClientId,
      periodStart: billCreatePeriodStart,
      onPeriodStartChange: setBillCreatePeriodStart,
      periodEnd: billCreatePeriodEnd,
      onPeriodEndChange: setBillCreatePeriodEnd,
      errors: billCreateErrors,
      canSubmit: createFormValid && !isInvoiceMutationPending,
      isPending: isInvoiceMutationPending,
      onSubmit: onBillCreateSubmit,
    },
    adjustmentCreate: {
      open: adjustmentCreateOpen,
      onOpenChange: onAdjustmentCreateOpenChange,
      formId: "agency-money-adjustment-create",
      sectionKey: adjustmentSectionKey,
      sectionOptions: MONEY_ADJUSTMENT_SECTION_OPTIONS,
      onSectionKeyChange: setAdjustmentSectionKey,
      isSalaryPool: adjustmentSectionKey === "salary_pool",
      label: adjustmentLabel,
      onLabelChange: setAdjustmentLabel,
      amount: adjustmentAmount,
      onAmountChange: setAdjustmentAmount,
      errors: adjustmentCreateErrors,
      canSubmit: adjustmentCreateValid && !isInvoiceMutationPending,
      isPending: isInvoiceMutationPending,
      onSubmit: onAdjustmentCreateSubmit,
    },
    payment: {
      open: Boolean(paymentRow),
      onOpenChange: onPaymentOpenChange,
      formId: BILL_PAYMENT_FORM_ID,
      partyName: paymentRow?.partyName ?? "",
      referenceLabel: paymentRow?.referenceLabel ?? "",
      remainingLabel: paymentRow?.remainingLabel ?? "",
      currency: paymentRow?.currency ?? scoreboardCurrency,
      amount: paymentAmount,
      onAmountChange: setPaymentAmount,
      validationMessage: paymentValidationMessage,
      canSubmit: paymentCanSubmit && !isInvoiceMutationPending,
      onSubmit: onPaymentSubmit,
    },
  };
}
