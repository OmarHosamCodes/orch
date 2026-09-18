import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import {
  MONEY_COHORT_PANE_OPTIONS,
  MONEY_COHORT_RULES_FIXTURE,
  type MoneyCohortPane,
} from "@/features/billing/money-cohort-allocations-fixture";
import {
  formatMoneyFormulaPreview,
  validateMoneyFormulaTokensClient,
  type MoneyFormulaDef,
} from "@/features/billing/money-formula-chips";
import {
  applyFormulaDraft,
  applyRuleDraft,
  createFormulaDraft,
  createNewCustomFormulaDraft,
  createNewCustomRuleDraft,
  createRuleDraft,
  listCustomMoneyRuleIds,
  listMoneyRuleOptions,
  resolveRuleCohort,
  resolveRuleLabel,
  resolveRuleMemberCount,
  resolveRuleSupportsMemberPick,
  type MoneySettingsEditorDraft,
} from "@/features/billing/money-settings-form";
import {
  selectIsInvoiceMutationPending,
  useAgencyOpsStore,
} from "@/features/shared/stores/agency-ops";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { orpc, orpcClient } from "@/lib/orpc";

export type MoneyCohortAllocationsSelection =
  | { kind: "rule"; ruleId: string }
  | { kind: "formula"; formulaId: string };

type UseAgencyMoneySettingsArgs = {
  teamId: string;
  periodStart: string;
  periodEnd: string;
  isOwner: boolean;
  scoreboardCurrency: string;
};

export function useAgencyMoneySettings({
  teamId,
  periodStart,
  periodEnd,
  isOwner,
  scoreboardCurrency,
}: UseAgencyMoneySettingsArgs) {
  const agencyOps = useAgencyOpsStore();
  const isInvoiceMutationPending = useAgencyOpsStore(selectIsInvoiceMutationPending);

  const [moneySettingsOpen, setMoneySettingsOpen] = useState(false);
  const [cohortPane, setCohortPane] = useState<MoneyCohortPane>("rules");
  const [moneySettingsDraft, setMoneySettingsDraft] = useState<MoneySettingsEditorDraft | null>(
    null,
  );
  const [formulaPreviewLabel, setFormulaPreviewLabel] = useState("—");
  const [formulaPreviewPending, setFormulaPreviewPending] = useState(false);
  const [fxFromCurrency, setFxFromCurrency] = useState("USD");
  const [fxRateDraft, setFxRateDraft] = useState("");
  const [currencyDraft, setCurrencyDraft] = useState("USD");

  const setAgencyCurrency = useAgencyOpsStore((s) => s.setAgencyCurrency);
  const upsertFxRate = useAgencyOpsStore((s) => s.upsertFxRate);
  const deleteFxRate = useAgencyOpsStore((s) => s.deleteFxRate);
  const suggestFxRate = useAgencyOpsStore((s) => s.suggestFxRate);

  const formulaValidationError = useMemo(() => {
    if (moneySettingsDraft?.kind !== "formula") return null;
    const result = validateMoneyFormulaTokensClient(moneySettingsDraft.formula.tokens);
    return result.ok ? null : result.error;
  }, [moneySettingsDraft]);

  const moneySettingsQuery = useQuery({
    ...orpc.agencyOps.moneySettings.get.queryOptions({
      input: { teamId },
    }),
    enabled: Boolean(teamId) && isOwner,
  });

  const fxRatesQuery = useQuery({
    ...orpc.agencyOps.fxRates.list.queryOptions({
      input: { teamId },
    }),
    enabled: Boolean(teamId) && isOwner && moneySettingsOpen && cohortPane === "currency",
  });

  useEffect(() => {
    const currency = moneySettingsQuery.data?.currency;
    if (currency) setCurrencyDraft(currency);
  }, [moneySettingsQuery.data?.currency]);

  const teamMembersQuery = useQuery({
    ...orpc.team.members.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId) && isOwner && moneySettingsOpen,
  });

  useEffect(() => {
    if (moneySettingsDraft?.kind !== "formula" || !teamId) {
      setFormulaPreviewLabel("—");
      setFormulaPreviewPending(false);
      return;
    }
    if (formulaValidationError) {
      setFormulaPreviewLabel("—");
      setFormulaPreviewPending(false);
      return;
    }

    const formula = moneySettingsDraft.formula;
    let cancelled = false;
    setFormulaPreviewPending(true);
    const timer = window.setTimeout(() => {
      void orpcClient.agencyOps.moneySettings
        .preview({
          teamId,
          periodStart,
          periodEnd,
          tokens: formula.tokens,
          output: formula.output,
          ruleId: formula.ruleId,
          sectionKey: formula.sectionKey,
        })
        .then((result) => {
          if (cancelled) return;
          if (result.error) {
            setFormulaPreviewLabel("—");
            return;
          }
          setFormulaPreviewLabel(
            formatMoneyFormulaPreview(result.value, formula.output, scoreboardCurrency),
          );
        })
        .catch(() => {
          if (!cancelled) setFormulaPreviewLabel("—");
        })
        .finally(() => {
          if (!cancelled) setFormulaPreviewPending(false);
        });
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    formulaValidationError,
    moneySettingsDraft,
    periodStart,
    periodEnd,
    scoreboardCurrency,
    teamId,
  ]);

  const moneySettingsStatus = moneySettingsQuery.isPending
    ? "loading"
    : moneySettingsQuery.isError
      ? "error"
      : moneySettingsQuery.isSuccess && moneySettingsQuery.data
        ? "ready"
        : "loading";
  const moneySettingsErrorMessage = getErrorMessage(
    moneySettingsQuery.error,
    "Try refreshing Money settings.",
  );

  function onMoneySettingsOpenChange(open: boolean) {
    setMoneySettingsOpen(open);
    if (!open) {
      setMoneySettingsDraft(null);
      setCohortPane("rules");
    }
  }

  function onMoneySettingsPaneChange(pane: MoneyCohortPane) {
    setCohortPane(pane);
    setMoneySettingsDraft(null);
  }

  function onSelectCohortAllocation(selection: MoneyCohortAllocationsSelection) {
    const current = moneySettingsQuery.data;
    if (!current || moneySettingsStatus !== "ready") return;
    if (selection.kind === "rule") {
      setMoneySettingsDraft(createRuleDraft(current.rules, selection.ruleId));
      return;
    }
    const formula = (current.calcOptions.formulas ?? []).find(
      (item) => item.id === selection.formulaId,
    );
    if (!formula) return;
    setMoneySettingsDraft(createFormulaDraft(formula as MoneyFormulaDef));
  }

  function onAddCustomFormula() {
    setCohortPane("formulas");
    setMoneySettingsDraft(createNewCustomFormulaDraft());
  }

  function onAddCustomRule() {
    setCohortPane("rules");
    setMoneySettingsDraft(createNewCustomRuleDraft());
  }

  function onMoneySettingsDraftChange(draft: MoneySettingsEditorDraft) {
    setMoneySettingsDraft(draft);
  }

  function onMoneySettingsEditorCancel() {
    setMoneySettingsDraft(null);
  }

  function onMoneySettingsEditorSave() {
    if (!moneySettingsDraft || !moneySettingsQuery.isSuccess || !moneySettingsQuery.data) return;
    const current = moneySettingsQuery.data;
    const rules = current.rules;
    const calcOptions = current.calcOptions;

    const syncFormulasAfterSave = () => {
      void agencyOps.syncFormulaPayoutLines(
        {
          teamId,
          periodStart,
          periodEnd,
          refreshSnapshot: true,
        },
        { quiet: true },
      );
    };

    if (moneySettingsDraft.kind === "rule") {
      const isNewCustom =
        !moneySettingsDraft.locked &&
        !listCustomMoneyRuleIds(rules).includes(moneySettingsDraft.ruleId);
      void agencyOps.upsertMoneySettings(
        {
          teamId,
          rules: applyRuleDraft(rules, moneySettingsDraft),
          calcOptions,
        },
        {
          onSuccess: () => {
            if (!isNewCustom) {
              syncFormulasAfterSave();
              setMoneySettingsDraft(null);
              return;
            }
            setCohortPane("formulas");
            setMoneySettingsDraft(
              createNewCustomFormulaDraft({
                ruleId: moneySettingsDraft.ruleId,
                label: moneySettingsDraft.label.trim() || "Custom formula",
              }),
            );
          },
        },
      );
      return;
    }

    void agencyOps.upsertMoneySettings(
      {
        teamId,
        rules,
        calcOptions: applyFormulaDraft(
          {
            ...calcOptions,
            formulas: (calcOptions.formulas ?? []) as MoneyFormulaDef[],
          },
          moneySettingsDraft,
        ),
      },
      {
        onSuccess: () => {
          syncFormulasAfterSave();
          setMoneySettingsDraft(null);
        },
      },
    );
  }

  function openProfitLossShareSettings() {
    setMoneySettingsDraft(null);
    setCohortPane("formulas");
    setMoneySettingsOpen(true);
  }

  return {
    moneySettings: {
      open: moneySettingsOpen,
      onOpenChange: onMoneySettingsOpenChange,
      onOpen: isOwner
        ? () => {
            setMoneySettingsDraft(null);
            setCohortPane("rules");
            setMoneySettingsOpen(true);
          }
        : null,
      title: "Money settings",
      description: "Who qualifies and how much they get. Open a rule or formula, edit, then save.",
      pane: cohortPane,
      paneOptions: MONEY_COHORT_PANE_OPTIONS,
      onPaneChange: onMoneySettingsPaneChange,
      status: moneySettingsStatus,
      errorMessage: moneySettingsErrorMessage,
      onRetry: () => void moneySettingsQuery.refetch(),
      canEdit: moneySettingsStatus === "ready" && isOwner,
      rules: (() => {
        if (moneySettingsStatus !== "ready") return [];
        const rules = moneySettingsQuery.data?.rules;
        const systemRows = MONEY_COHORT_RULES_FIXTURE.map((rule) => ({
          id: rule.id,
          benefit: rule.benefit,
          locked: true as const,
          supportsMemberPick: rule.supportsMemberPick === true,
          enabled: rules?.enabledRuleIds.includes(rule.id) ?? true,
          cohort: resolveRuleCohort(rules, rule.id),
          memberCount: resolveRuleMemberCount(rules, rule.id),
        }));
        const customRows = listCustomMoneyRuleIds(rules).map((ruleId) => ({
          id: ruleId,
          benefit: resolveRuleLabel(rules, ruleId),
          locked: false as const,
          supportsMemberPick: resolveRuleSupportsMemberPick(ruleId),
          enabled: rules?.enabledRuleIds.includes(ruleId) ?? true,
          cohort: resolveRuleCohort(rules, ruleId),
          memberCount: resolveRuleMemberCount(rules, ruleId),
        }));
        return [...systemRows, ...customRows];
      })(),
      formulas:
        moneySettingsStatus === "ready"
          ? ((moneySettingsQuery.data?.calcOptions.formulas ?? []) as MoneyFormulaDef[]).map(
              (formula) => ({
                id: formula.id,
                key: formula.key,
                label: formula.label,
                locked: formula.locked,
                enabled: formula.enabled,
                tokens: formula.tokens,
                output: formula.output,
                metricId: formula.metricId,
                sectionKey: formula.sectionKey,
                ruleId: formula.ruleId ?? null,
              }),
            )
          : [],
      ruleOptions:
        moneySettingsStatus === "ready" ? listMoneyRuleOptions(moneySettingsQuery.data?.rules) : [],
      memberOptions: (teamMembersQuery.data?.items ?? []).map((member) => ({
        value: member.userId,
        label: member.userName,
        avatar: {
          userId: member.userId,
          name: member.userName,
          avatarUrl: member.userAvatar,
        },
      })),
      editor: moneySettingsDraft,
      onSelect: onSelectCohortAllocation,
      onAddCustomFormula,
      onAddCustomRule,
      onEditorChange: onMoneySettingsDraftChange,
      onEditorCancel: onMoneySettingsEditorCancel,
      onEditorSave: onMoneySettingsEditorSave,
      canSaveEditor:
        moneySettingsStatus === "ready" &&
        moneySettingsQuery.data != null &&
        moneySettingsDraft != null &&
        (moneySettingsDraft.kind === "rule"
          ? moneySettingsDraft.cohort.trim().length > 0 &&
            moneySettingsDraft.label.trim().length > 0
          : moneySettingsDraft.formula.label.trim().length > 0 && formulaValidationError == null),
      formulaValidationError,
      formulaPreviewLabel,
      formulaPreviewPending,
      isSaving: isInvoiceMutationPending,
      currency: {
        code: moneySettingsQuery.data?.currency ?? currencyDraft,
        lockedAt: moneySettingsQuery.data?.currencyLockedAt ?? null,
        draft: currencyDraft,
        onDraftChange: setCurrencyDraft,
        onSave: () => {
          if (!teamId || !currencyDraft.trim()) return;
          void setAgencyCurrency({ teamId, currency: currencyDraft.trim().toUpperCase() });
        },
        options: ["EGP", "USD", "EUR", "GBP", "CAD", "SAR", "AED"] as const,
      },
      fxRates: {
        items: fxRatesQuery.data?.items ?? [],
        isLoading: fxRatesQuery.isPending,
        fromCurrency: fxFromCurrency,
        onFromCurrencyChange: setFxFromCurrency,
        rateDraft: fxRateDraft,
        onRateDraftChange: setFxRateDraft,
        onSuggest: () => {
          if (!teamId) return;
          const agency = moneySettingsQuery.data?.currency ?? currencyDraft;
          void suggestFxRate({
            teamId,
            fromCurrency: fxFromCurrency,
            toCurrency: agency,
          }).then((result) => {
            if (result?.rate) setFxRateDraft(result.rate);
          });
        },
        onSave: () => {
          if (!teamId || !fxRateDraft.trim()) return;
          const agency = moneySettingsQuery.data?.currency ?? currencyDraft;
          void upsertFxRate({
            teamId,
            fromCurrency: fxFromCurrency,
            toCurrency: agency,
            rate: fxRateDraft.trim(),
          }).then(() => setFxRateDraft(""));
        },
        onDelete: (id: string) => {
          if (!teamId) return;
          void deleteFxRate({ teamId, id });
        },
      },
    },
    openProfitLossShareSettings,
  };
}
