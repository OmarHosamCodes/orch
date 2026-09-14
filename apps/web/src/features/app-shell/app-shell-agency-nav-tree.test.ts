import { describe, expect, test } from "bun:test";

import {
  agencyShellCrumbLabel,
  agencyShellNavItemCount,
  agencyShellNavItems,
  managementGroupHref,
} from "./app-shell-agency-nav-tree";

describe("agencyShellNavItems", () => {
  test("includes primary segments and management panes", () => {
    const items = agencyShellNavItems();
    expect(items).toHaveLength(agencyShellNavItemCount());
    expect(items.some((item) => item.kind === "segment" && item.id === "work")).toBe(true);
    expect(items.some((item) => item.kind === "management-pane" && item.id === "tenure")).toBe(true);
    expect(items.some((item) => item.kind === "segment" && item.id === "management")).toBe(false);
  });
});

describe("agencyShellCrumbLabel", () => {
  test("uses pane label on management routes", () => {
    expect(agencyShellCrumbLabel("management", "tenure")).toBe("People");
  });

  test("uses segment label elsewhere", () => {
    expect(agencyShellCrumbLabel("work", null)).toBe("Tracker");
  });
});

describe("managementGroupHref", () => {
  test("routes to the last visited pane", () => {
    expect(managementGroupHref("money")).toBe("/agency/management/money");
  });
});
