export const FIRST_RUN_PRIMER_COUNT = 4;
export const FIRST_RUN_SCREEN_TITLE = "Orch";

export type FirstRunPrimerFrame = "welcome" | "canvas" | "agency" | "orch";

export type FirstRunPrimerCard = {
  frame: FirstRunPrimerFrame;
  title: string;
  body: string;
};

export const FIRST_RUN_PRIMER_CARDS: readonly FirstRunPrimerCard[] = [
  {
    frame: "welcome",
    title: "Welcome to Orch",
    body: "A quiet place for the work, the agency, and the agent — you're already in.",
  },
  {
    frame: "canvas",
    title: "See the work",
    body: "Boards, nodes, and knowledge live on one spatial canvas.",
  },
  {
    frame: "agency",
    title: "Run the agency",
    body: "Track time, clients, and money without leaving the room.",
  },
  {
    frame: "orch",
    title: "Ask, then approve",
    body: "Orch proposes on Canvas and Agency. You stay in control.",
  },
];

export function firstRunPrimerAt(stepIndex: number): FirstRunPrimerCard {
  const index = Math.min(Math.max(stepIndex, 0), FIRST_RUN_PRIMER_CARDS.length - 1);
  const card = FIRST_RUN_PRIMER_CARDS[index];
  if (!card) {
    return FIRST_RUN_PRIMER_CARDS[0]!;
  }
  return card;
}

export function firstRunProgressLabel(stepIndex: number): string {
  if (stepIndex <= 0) {
    return `Account created · 1 of ${FIRST_RUN_PRIMER_COUNT}`;
  }
  const clamped = Math.min(Math.max(stepIndex, 0), FIRST_RUN_PRIMER_COUNT - 1) + 1;
  return `${clamped} of ${FIRST_RUN_PRIMER_COUNT}`;
}

export function firstRunProgressRatio(stepIndex: number, onAction: boolean): number {
  const total = FIRST_RUN_PRIMER_COUNT + 1;
  if (onAction) return 1;
  return (Math.min(Math.max(stepIndex, 0), FIRST_RUN_PRIMER_COUNT - 1) + 1) / total;
}

export function firstRunContinueLabel(stepIndex: number): string {
  return stepIndex <= 0 ? "Get started" : "Continue";
}

export function firstRunCreateCopy(defaultName: string) {
  return {
    title: "Pick your agency mark",
    body: "Choose a mark, then name your agency to continue. Both stay editable.",
    nameLabel: "Agency name",
    submitLabel: "Create agency",
    skipLabel: "Skip for now",
    pendingLabel: "Opening your agency",
    defaultName,
  };
}

export function firstRunJoinCopy(teamName: string) {
  return {
    title: `${teamName} is ready for you`,
    body: "You already have a seat. Come in whenever you're ready.",
    submitLabel: `Open ${teamName}`,
    pendingLabel: "Opening your agency",
  };
}
