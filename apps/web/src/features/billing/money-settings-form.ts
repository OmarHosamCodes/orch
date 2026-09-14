import {
  MONEY_CALC_OPTIONS_FIXTURE,
  MONEY_COHORT_RULES_FIXTURE,
  type MoneyCohortRuleFixture,
  type MoneyCohortRuleId,
} from "./money-cohort-allocations-fixture";
import {
  createCustomMoneyFormulaDraft,
  deriveLegacyEnabledOptionIds,
  deriveLegacyValueByOptionId,
  type MoneyFormulaDef,
} from "./money-formula-chips";

export type MoneySettingsRulesState = {
  enabledRuleIds: string[];
  notesByRuleId?: Record<string, string>;
  labelByRuleId?: Record<string, string>;
  cohortByRuleId?: Record<string, string>;
  memberIdsByRuleId?: Record<string, string[]>;
};

export type MoneySettingsCalcState = {
  enabledOptionIds: string[];
  notesByOptionId?: Record<string, string>;
  summaryByOptionId?: Record<string, string>;
  valueByOptionId?: Record<string, number>;
  formulas?: MoneyFormulaDef[];
};

export type MoneySettingsRuleDraft = {
  kind: "rule";
  ruleId: string;
  label: string;
  locked: boolean;
  supportsMemberPick: boolean;
  enabled: boolean;
  cohort: string;
  memberIds: string[];
};

export type MoneySettingsFormulaDraft = {
  kind: "formula";
  formula: MoneyFormulaDef;
};

export type MoneySettingsEditorDraft = MoneySettingsRuleDraft | MoneySettingsFormulaDraft;

const SYSTEM_RULE_IDS = new Set<string>(MONEY_COHORT_RULES_FIXTURE.map((rule) => rule.id));

function isSystemRuleId(ruleId: string): ruleId is MoneyCohortRuleId {
  return SYSTEM_RULE_IDS.has(ruleId);
}

function ruleFixture(ruleId: MoneyCohortRuleId): MoneyCohortRuleFixture {
  return (
    MONEY_COHORT_RULES_FIXTURE.find((rule) => rule.id === ruleId) ?? MONEY_COHORT_RULES_FIXTURE[0]!
  );
}

/** Custom rule ids from persisted labels (plus any non-system enabled ids). */
export function listCustomMoneyRuleIds(rules: MoneySettingsRulesState | undefined): string[] {
  const ids = new Set<string>();
  for (const [ruleId, label] of Object.entries(rules?.labelByRuleId ?? {})) {
    if (!isSystemRuleId(ruleId) && label.trim().length > 0) ids.add(ruleId);
  }
  for (const ruleId of rules?.enabledRuleIds ?? []) {
    if (!isSystemRuleId(ruleId)) ids.add(ruleId);
  }
  return [...ids].sort((a, b) => a.localeCompare(b));
}

export function resolveRuleLabel(
  rules: MoneySettingsRulesState | undefined,
  ruleId: string,
): string {
  if (isSystemRuleId(ruleId)) return ruleFixture(ruleId).benefit;
  const saved = rules?.labelByRuleId?.[ruleId]?.trim();
  return saved || "Custom rule";
}

export function resolveRuleCohort(
  rules: MoneySettingsRulesState | undefined,
  ruleId: string,
): string {
  const saved = rules?.cohortByRuleId?.[ruleId]?.trim();
  if (saved) return saved;
  if (isSystemRuleId(ruleId)) return ruleFixture(ruleId).cohort;
  return "";
}

function resolveRuleMemberIds(
  rules: MoneySettingsRulesState | undefined,
  ruleId: string,
): string[] {
  const saved = rules?.memberIdsByRuleId?.[ruleId];
  return Array.isArray(saved) ? saved.filter((id) => typeof id === "string" && id.length > 0) : [];
}

export function resolveRuleMemberCount(
  rules: MoneySettingsRulesState | undefined,
  ruleId: string,
): number | null {
  const memberIds = resolveRuleMemberIds(rules, ruleId);
  if (memberIds.length > 0) return memberIds.length;
  if (isSystemRuleId(ruleId)) return ruleFixture(ruleId).memberCount;
  return null;
}

export function resolveRuleSupportsMemberPick(ruleId: string): boolean {
  if (isSystemRuleId(ruleId)) return ruleFixture(ruleId).supportsMemberPick === true;
  return true;
}

export function createRuleDraft(
  rules: MoneySettingsRulesState | undefined,
  ruleId: string,
): MoneySettingsRuleDraft {
  const locked = isSystemRuleId(ruleId);
  return {
    kind: "rule",
    ruleId,
    label: resolveRuleLabel(rules, ruleId),
    locked,
    supportsMemberPick: resolveRuleSupportsMemberPick(ruleId),
    enabled: rules?.enabledRuleIds.includes(ruleId) ?? true,
    cohort: resolveRuleCohort(rules, ruleId),
    memberIds: resolveRuleMemberIds(rules, ruleId),
  };
}

export function createNewCustomRuleDraft(): MoneySettingsRuleDraft {
  const stamp = Date.now().toString(36);
  return {
    kind: "rule",
    ruleId: `custom_${stamp}`,
    label: "Custom rule",
    locked: false,
    supportsMemberPick: true,
    enabled: true,
    cohort: "",
    memberIds: [],
  };
}

export function createFormulaDraft(formula: MoneyFormulaDef): MoneySettingsFormulaDraft {
  return {
    kind: "formula",
    formula: {
      ...formula,
      tokens: formula.tokens.map((token) => ({ ...token })),
    },
  };
}

export function createNewCustomFormulaDraft(input?: {
  ruleId?: string | null;
  label?: string;
}): MoneySettingsFormulaDraft {
  return createFormulaDraft(createCustomMoneyFormulaDraft(input));
}

export type MoneyRuleOption = { id: string; label: string };

const IMPLICIT_FORMULA_RULES: MoneyRuleOption[] = [
  { id: "paid-vacation", label: "Paid vacation" },
  { id: "device-compensation", label: "Device compensation" },
];

export function listMoneyRuleOptions(
  rules: MoneySettingsRulesState | undefined,
): MoneyRuleOption[] {
  const rows: MoneyRuleOption[] = MONEY_COHORT_RULES_FIXTURE.map((rule) => ({
    id: rule.id,
    label: rule.benefit,
  }));
  for (const implicit of IMPLICIT_FORMULA_RULES) {
    if (!rows.some((row) => row.id === implicit.id)) rows.push(implicit);
  }
  for (const ruleId of listCustomMoneyRuleIds(rules)) {
    rows.push({ id: ruleId, label: resolveRuleLabel(rules, ruleId) });
  }
  return rows;
}

export function applyRuleDraft(
  rules: MoneySettingsRulesState,
  draft: MoneySettingsRuleDraft,
): MoneySettingsRulesState {
  const enabledRuleIds = draft.enabled
    ? rules.enabledRuleIds.includes(draft.ruleId)
      ? rules.enabledRuleIds
      : [...rules.enabledRuleIds, draft.ruleId]
    : rules.enabledRuleIds.filter((id) => id !== draft.ruleId);

  const labelByRuleId = { ...(rules.labelByRuleId ?? {}) };
  if (draft.locked) {
    delete labelByRuleId[draft.ruleId];
  } else {
    labelByRuleId[draft.ruleId] = draft.label.trim() || "Custom rule";
  }

  return {
    ...rules,
    enabledRuleIds,
    labelByRuleId,
    cohortByRuleId: {
      ...(rules.cohortByRuleId ?? {}),
      [draft.ruleId]: draft.cohort.trim(),
    },
    memberIdsByRuleId: {
      ...(rules.memberIdsByRuleId ?? {}),
      [draft.ruleId]: draft.memberIds,
    },
  };
}

export function applyFormulaDraft(
  calc: MoneySettingsCalcState,
  draft: MoneySettingsFormulaDraft,
): MoneySettingsCalcState {
  const current = [...(calc.formulas ?? [])];
  const index = current.findIndex((formula) => formula.id === draft.formula.id);
  const nextFormula: MoneyFormulaDef = {
    ...draft.formula,
    label: draft.formula.label.trim() || "Custom formula",
    tokens: draft.formula.tokens.map((token) => ({ ...token })),
  };

  if (index >= 0) {
    current[index] = nextFormula;
  } else {
    current.push(nextFormula);
  }

  return {
    ...calc,
    formulas: current,
    enabledOptionIds: deriveLegacyEnabledOptionIds(current),
    valueByOptionId: deriveLegacyValueByOptionId(current, calc.valueByOptionId),
  };
}

export function defaultRulesState(): MoneySettingsRulesState {
  return {
    enabledRuleIds: MONEY_COHORT_RULES_FIXTURE.map((rule) => rule.id),
    notesByRuleId: {},
    labelByRuleId: {},
    cohortByRuleId: {},
    memberIdsByRuleId: {},
  };
}

export function defaultCalcState(): MoneySettingsCalcState {
  return {
    enabledOptionIds: MONEY_CALC_OPTIONS_FIXTURE.map((option) => option.id),
    notesByOptionId: {},
    summaryByOptionId: {},
    valueByOptionId: Object.fromEntries(
      MONEY_CALC_OPTIONS_FIXTURE.filter((option) => option.defaultValue != null).map((option) => [
        option.id,
        option.defaultValue!,
      ]),
    ),
    formulas: [],
  };
}
