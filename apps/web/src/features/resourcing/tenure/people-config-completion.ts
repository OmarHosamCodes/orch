export type PeopleConfigSignals = {
  hasEmploymentType: boolean;
  hasWorkModel: boolean;
  hasContact: boolean;
  hasRate: boolean;
  tenureAwaitingFirstEntry: boolean;
  hasTenureOverride: boolean;
  hasActiveExemption: boolean;
  employmentStatus: "active" | "inactive" | null;
};

export type PeopleConfigBadge = "Incomplete" | "Override" | "Inactive" | null;

const PEOPLE_CONFIG_STEPS = [
  { id: "identity", label: "Identity" },
  { id: "employment", label: "Employment" },
  { id: "leave", label: "Off days" },
  { id: "rates", label: "Rates" },
  { id: "tenure", label: "Intern & tenure" },
  { id: "access", label: "Access" },
] as const;

export type PeopleConfigStepId = (typeof PEOPLE_CONFIG_STEPS)[number]["id"];

export const PEOPLE_CONFIG_STEP_IDS: PeopleConfigStepId[] = PEOPLE_CONFIG_STEPS.map(
  (step) => step.id,
);

export const PEOPLE_CONFIG_STEP_LABELS: Record<PeopleConfigStepId, string> = Object.fromEntries(
  PEOPLE_CONFIG_STEPS.map((step) => [step.id, step.label]),
) as Record<PeopleConfigStepId, string>;

export function peopleConfigStepDone(
  signals: PeopleConfigSignals,
): Record<PeopleConfigStepId, boolean> {
  return {
    identity: signals.hasContact,
    employment: signals.hasEmploymentType && signals.hasWorkModel,
    leave: true,
    rates: signals.hasRate,
    tenure: !signals.tenureAwaitingFirstEntry,
    access: true,
  };
}

export function peopleConfigCompletionPercent(signals: PeopleConfigSignals): number {
  const done = peopleConfigStepDone(signals);
  const complete = PEOPLE_CONFIG_STEP_IDS.filter((step) => done[step]).length;
  return Math.round((complete / PEOPLE_CONFIG_STEP_IDS.length) * 100);
}

export function peopleConfigBadge(signals: PeopleConfigSignals): PeopleConfigBadge {
  if (signals.employmentStatus === "inactive") return "Inactive";
  const done = peopleConfigStepDone(signals);
  const incomplete = PEOPLE_CONFIG_STEP_IDS.some((step) => !done[step]);
  if (incomplete) return "Incomplete";
  if (signals.hasTenureOverride || signals.hasActiveExemption) return "Override";
  return null;
}

/** Attention = Incomplete only; Override stays informational on the card. */
export function peopleDirectoryAttentionCount(items: readonly PeopleConfigSignals[]): number {
  return items.filter((item) => peopleConfigBadge(item) === "Incomplete").length;
}

/** Map list-summary fields into the shared completion signals shape. */
export function peopleDirectoryListSignals(input: {
  hasEmploymentType: boolean;
  hasWorkModel: boolean;
  hasContact: boolean;
  hasRate: boolean;
  tenureAwaitingFirstEntry: boolean;
  hasTenureOverride: boolean;
  hasActiveExemption: boolean;
  employmentStatus: "active" | "inactive" | null;
}): PeopleConfigSignals {
  return {
    hasEmploymentType: input.hasEmploymentType,
    hasWorkModel: input.hasWorkModel,
    hasContact: input.hasContact,
    hasRate: input.hasRate,
    tenureAwaitingFirstEntry: input.tenureAwaitingFirstEntry,
    hasTenureOverride: input.hasTenureOverride,
    hasActiveExemption: input.hasActiveExemption,
    employmentStatus: input.employmentStatus,
  };
}
