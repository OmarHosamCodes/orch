import { expect, test } from "bun:test";

import { shouldBlockTrackerChrome } from "./tracker-chrome-ready";

test("does not block chrome while projects and tasks are pending", () => {
  expect(
    shouldBlockTrackerChrome({
      hasTeam: true,
      projectsPending: true,
      tasksPending: true,
      taskCount: 0,
    }),
  ).toBe(false);
});

test("blocks chrome without a team", () => {
  expect(
    shouldBlockTrackerChrome({
      hasTeam: false,
      projectsPending: false,
      tasksPending: false,
      taskCount: 0,
    }),
  ).toBe(true);
});

test("does not block chrome after catalog hydrates", () => {
  expect(
    shouldBlockTrackerChrome({
      hasTeam: true,
      projectsPending: false,
      tasksPending: false,
      taskCount: 40,
    }),
  ).toBe(false);
});
