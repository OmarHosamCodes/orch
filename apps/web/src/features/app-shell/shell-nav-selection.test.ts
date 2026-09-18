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
  test("unifies the traveling blob on the Current Title", () => {
    expect(resolveShellContextNavItemId("/canvas")).toBe("context-location-title");
    expect(resolveShellContextNavItemId("/agency/reports")).toBe("context-location-title");
    expect(resolveShellContextNavItemId("/agency/members/u1")).toBe("context-location-title");
    expect(resolveShellContextNavItemId("/node/abc")).toBe("context-location-title");
  });
});
