/** Seed defaults for Money settings Rules / Formulas panes (live data from API). */

export type MoneyCohortRuleId = "profit-loss-share" | "rent-allowance" | "device-compensation";

type MoneyCalcOptionId =
  | "roi-variables"
  | "charity"
  | "profit-loss-share"
  | "paid-vacation"
  | "device-compensation"
  | "pbc";

export type MoneyCohortRuleFixture = {
  id: MoneyCohortRuleId;
  benefit: string;
  cohort: string;
  memberCount: number | null;
  /** When true, editor shows a member multi-select. */
  supportsMemberPick?: boolean;
};

export type MoneyCalcOptionFixture = {
  id: MoneyCalcOptionId;
  label: string;
  summary: string;
  valueLabel?: string;
  defaultValue?: number;
};

export type MoneyCohortPane = "rules" | "formulas" | "currency";

export const MONEY_COHORT_PANE_OPTIONS: ReadonlyArray<{
  id: MoneyCohortPane;
  label: string;
  description: string;
}> = [
  {
    id: "rules",
    label: "Rules",
    description: "Who qualifies for extras or reductions",
  },
  {
    id: "formulas",
    label: "Formulas",
    description: "How much each allocation is — scoreboard and payout amounts",
  },
  {
    id: "currency",
    label: "Currency",
    description: "Agency ledger currency and FX rates for foreign inputs",
  },
];

export const MONEY_COHORT_RULES_FIXTURE: MoneyCohortRuleFixture[] = [
  {
    id: "profit-loss-share",
    benefit: "Profit share / Loss share",
    cohort: "All members except interns",
    memberCount: null,
  },
  {
    id: "rent-allowance",
    benefit: "Rent allowance",
    cohort: "Selected members",
    memberCount: 5,
    supportsMemberPick: true,
  },
];

export const MONEY_CALC_OPTIONS_FIXTURE: MoneyCalcOptionFixture[] = [
  {
    id: "roi-variables",
    label: "ROI variables",
    summary: "Team profit ÷ total income",
  },
  {
    id: "charity",
    label: "Charity",
    summary: "Fixed period allocation",
  },
  {
    id: "profit-loss-share",
    label: "Profit / Loss share",
    summary: "Cohort-gated team result",
  },
  {
    id: "paid-vacation",
    label: "Paid vacation",
    summary: "200H · salary-rate conversion",
    valueLabel: "Hours",
    defaultValue: 200,
  },
  {
    id: "device-compensation",
    label: "Device compensation",
    summary: "Per-member stipend",
  },
  {
    id: "pbc",
    label: "PBC",
    summary: "Performance bonus pool",
  },
];
