import { describe, expect, test } from "bun:test";

import {
  resolveShellContextNavItemId,
  resolveShellRailNavItemId,
} from "@/features/app-shell/shell-nav-selection";

describe("resolveShellRailNavItemId", () => {
  test("maps canvas and node routes", () => {
    expect(resolveShellRailNavItemId("/canvas")).toBe("canvas");
    expect(resolveShellRailNavItemId("/node/abc")).toBe("canvas");
  });

  test("maps agency segments and management panes", () => {
    expect(resolveShellRailNavItemId("/agency")).toBe("agency-tracker");
    expect(resolveShellRailNavItemId("/agency/dashboard")).toBe("agency-dashboard");
    expect(resolveShellRailNavItemId("/agency/management/people")).toBe("agency-tenure");
  });
});

describe("resolveShellContextNavItemId", () => {
  test("maps context crumb targets", () => {
    expect(resolveShellContextNavItemId("/canvas")).toBe("context-canvas-title");
    expect(resolveShellContextNavItemId("/agency/reports")).toBe("context-agency-segment");
    expect(resolveShellContextNavItemId("/agency/members/u1")).toBe("context-profile");
  });
});
