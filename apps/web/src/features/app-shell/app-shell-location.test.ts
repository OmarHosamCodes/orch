import { describe, expect, test } from "bun:test";

import {
  isShellLocationDestinationSelected,
  nextLocationIndex,
  resolveShellLocation,
  shellEntityIdAfter,
  shellLocationGroupLabel,
} from "./app-shell-location";

describe("nextLocationIndex", () => {
  const lastIndex = 10;

  test("ArrowDown wraps from the last row to the first", () => {
    expect(nextLocationIndex(lastIndex, "ArrowDown", lastIndex)).toBe(0);
  });

  test("ArrowDown advances within bounds", () => {
    expect(nextLocationIndex(2, "ArrowDown", lastIndex)).toBe(3);
  });

  test("ArrowUp wraps from the first row to the last", () => {
    expect(nextLocationIndex(0, "ArrowUp", lastIndex)).toBe(lastIndex);
  });

  test("ArrowUp retreats within bounds", () => {
    expect(nextLocationIndex(3, "ArrowUp", lastIndex)).toBe(2);
  });

  test("Home jumps to the first row", () => {
    expect(nextLocationIndex(4, "Home", lastIndex)).toBe(0);
  });

  test("End jumps to the last row", () => {
    expect(nextLocationIndex(1, "End", lastIndex)).toBe(lastIndex);
  });

  test("returns null for unrelated keys", () => {
    expect(nextLocationIndex(2, "Enter", lastIndex)).toBeNull();
  });
});

describe("shellEntityIdAfter", () => {
  test("returns the nested id and ignores the collection itself", () => {
    expect(shellEntityIdAfter("/agency/projects", "/agency/projects")).toBeNull();
    expect(shellEntityIdAfter("/agency/projects/abc", "/agency/projects")).toBe("abc");
    expect(shellEntityIdAfter("/agency/projects/abc/extra", "/agency/projects")).toBe("abc");
  });
});

describe("resolveShellLocation", () => {
  test("uses the segment name on Agency list pages", () => {
    expect(resolveShellLocation("/agency/dashboard", "").title).toBe("Dashboard");
    expect(resolveShellLocation("/agency/dashboard", "").parent).toBeNull();
    expect(resolveShellLocation("/agency", "").title).toBe("Tracker");
  });

  test("uses the Management pane name, not a nested trail", () => {
    const people = resolveShellLocation("/agency/management/people", "");
    expect(people.title).toBe("People");
    expect(people.parent).toBeNull();
  });

  test("names a member from overlay cache and backs to People", () => {
    const location = resolveShellLocation("/agency/members/u1", "", { memberName: "Omar" });
    expect(location.title).toBe("Omar");
    expect(location.parent).toEqual({ href: "/agency/management/people", label: "People" });
  });

  test("falls back to Profile when the member name is not cached", () => {
    expect(resolveShellLocation("/agency/members/u1", "").title).toBe("Profile");
  });

  test("uses the session name on /agency/me", () => {
    expect(resolveShellLocation("/agency/me", "", { sessionName: "Lina" }).title).toBe("Lina");
  });

  test("names a project from overlay cache, including Arabic", () => {
    const location = resolveShellLocation("/agency/projects/p1", "", {
      projectName: "مهمة الرياضة",
    });
    expect(location.title).toBe("مهمة الرياضة");
    expect(location.parent).toEqual({ href: "/agency/projects", label: "Projects" });
  });

  test("falls back to Project, Client, Report, and Node", () => {
    expect(resolveShellLocation("/agency/projects/p1", "").title).toBe("Project");
    expect(resolveShellLocation("/agency/clients/c1", "").title).toBe("Client");
    expect(resolveShellLocation("/agency/reports/r1", "").title).toBe("Report");
    expect(resolveShellLocation("/node/n1", "").title).toBe("Node");
  });

  test("names a canvas node from overlay cache and backs to Canvas", () => {
    const location = resolveShellLocation("/node/n1", "", { nodeTitle: "Brief lock" });
    expect(location.title).toBe("Brief lock");
    expect(location.parent).toEqual({ href: "/canvas", label: "Canvas" });
  });

  test("keeps Canvas as the title on the CNS home", () => {
    expect(resolveShellLocation("/canvas", "").title).toBe("Canvas");
    expect(resolveShellLocation("/canvas", "").parent).toBeNull();
  });

  test("nests a named brain under Canvas", () => {
    const location = resolveShellLocation("/canvas/cws-1", "", {
      canvasWorkspaceTitle: "Client X",
    });
    expect(location.title).toBe("Client X");
    expect(location.parent).toEqual({ href: "/canvas", label: "Canvas" });
    expect(resolveShellLocation("/canvas/cws-1", "").title).toBe("Brain");
  });

  test("treats a tracker task overlay as nested under Tracker", () => {
    const location = resolveShellLocation("/agency", "?task=t1");
    expect(location.title).toBe("Task");
    expect(location.parent).toEqual({ href: "/agency", label: "Tracker" });
  });

  test("does not steal a project page when a task search is present", () => {
    expect(resolveShellLocation("/agency/projects/p1", "?task=t1").title).toBe("Project");
  });

  test("groups Products, Agency, and Management destinations", () => {
    const { destinations } = resolveShellLocation(
      "/agency/dashboard",
      "",
      {},
      { lastManagementPane: "money" },
    );
    expect(destinations).toHaveLength(11);
    expect(shellLocationGroupLabel("product")).toBe("Products");
    expect(destinations.find((item) => item.id === "segment-management")?.href).toBe(
      "/agency/management/money",
    );
  });

  test("marks the product and the leaf, not a stacked trail", () => {
    const member = resolveShellLocation("/agency/members/u1", "", { memberName: "Omar" });
    const canvas = member.destinations.find((item) => item.id === "product-canvas");
    const agency = member.destinations.find((item) => item.id === "product-agency");
    const management = member.destinations.find((item) => item.id === "segment-management");
    const people = member.destinations.find((item) => item.id === "pane-tenure");
    const dashboard = member.destinations.find((item) => item.id === "segment-dashboard");
    if (!canvas || !agency || !management || !people || !dashboard) {
      throw new Error("expected destination rows");
    }
    expect(isShellLocationDestinationSelected(canvas, "/agency/members/u1", member.title)).toBe(
      false,
    );
    expect(isShellLocationDestinationSelected(agency, "/agency/members/u1", member.title)).toBe(
      true,
    );
    expect(isShellLocationDestinationSelected(management, "/agency/members/u1", member.title)).toBe(
      false,
    );
    expect(isShellLocationDestinationSelected(people, "/agency/members/u1", member.title)).toBe(
      false,
    );
    expect(isShellLocationDestinationSelected(canvas, "/node/n1", "Brief lock")).toBe(true);

    const peoplePage = resolveShellLocation("/agency/management/people", "");
    const peoplePane = peoplePage.destinations.find((item) => item.id === "pane-tenure");
    const managementSeg = peoplePage.destinations.find((item) => item.id === "segment-management");
    if (!peoplePane || !managementSeg) throw new Error("expected pane rows");
    expect(
      isShellLocationDestinationSelected(peoplePane, "/agency/management/people", peoplePage.title),
    ).toBe(true);
    expect(
      isShellLocationDestinationSelected(
        managementSeg,
        "/agency/management/people",
        peoplePage.title,
      ),
    ).toBe(false);
    expect(isShellLocationDestinationSelected(dashboard, "/agency/dashboard", "Dashboard")).toBe(
      true,
    );
  });
});
