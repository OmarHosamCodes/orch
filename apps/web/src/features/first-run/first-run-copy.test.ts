import { describe, expect, test } from "bun:test";

import {
  FIRST_RUN_PRIMER_CARDS,
  firstRunContinueLabel,
  firstRunCreateCopy,
  firstRunJoinCopy,
  firstRunProgressLabel,
  firstRunProgressRatio,
} from "./first-run-copy";

describe("first-run copy", () => {
  test("keeps four primer cards in Canvas / Agency / Orch order after welcome", () => {
    expect(FIRST_RUN_PRIMER_CARDS.map((card) => card.frame)).toEqual([
      "welcome",
      "canvas",
      "agency",
      "orch",
    ]);
  });

  test("opens with a welcome, not a slogan", () => {
    expect(FIRST_RUN_PRIMER_CARDS[0]?.title).toBe("Welcome to Orch");
    expect(firstRunContinueLabel(0)).toBe("Get started");
    expect(firstRunContinueLabel(1)).toBe("Continue");
  });

  test("endows the first step with account created", () => {
    expect(firstRunProgressLabel(0)).toBe("Account created · 1 of 4");
    expect(firstRunProgressLabel(3)).toBe("4 of 4");
    expect(firstRunProgressRatio(0, false)).toBe(0.2);
    expect(firstRunProgressRatio(3, true)).toBe(1);
  });

  test("names the create and join actions", () => {
    expect(firstRunCreateCopy("Ada's agency").submitLabel).toBe("Create agency");
    expect(firstRunCreateCopy("Ada's agency").title).toBe("Pick your agency mark");
    expect(firstRunJoinCopy("Northwind").submitLabel).toBe("Open Northwind");
  });
});
