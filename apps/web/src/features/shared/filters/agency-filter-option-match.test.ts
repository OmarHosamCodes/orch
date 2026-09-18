import { describe, expect, test } from "bun:test";

import {
  agencyFilterMatchingNoun,
  agencyFilterOptionAccessibleName,
  agencyFilterOptionMatches,
  agencyFilterTriggerAccessibleName,
  agencyFilterTriggerLabel,
  flattenMatchingFilterOptions,
  parseAgencyFilterSearchTokens,
  sortFilterOptionsByRecents,
  type AgencyFilterOptionGroup,
} from "@/features/shared/filters/agency-filter-option-match";

describe("agencyFilterOptionMatches", () => {
  test("empty tokens match every option", () => {
    expect(agencyFilterOptionMatches({ label: "SAAS" }, [])).toBe(true);
  });

  test("ANDs tokens across label, secondary, searchText, and path", () => {
    expect(
      agencyFilterOptionMatches(
        { label: "SAAS", secondary: "School Of Marketing", searchText: "School Of Marketing" },
        ["school", "saas"],
      ),
    ).toBe(true);
    expect(
      agencyFilterOptionMatches({ label: "SAAS" }, ["school", "saas"], {
        groupLabel: "School Of Marketing",
      }),
    ).toBe(true);
    expect(
      agencyFilterOptionMatches({ label: "Website", secondary: "School Of Marketing" }, [
        "school",
        "saas",
      ]),
    ).toBe(false);
  });

  test("matches a task when tokens split across title, project, and client", () => {
    expect(
      agencyFilterOptionMatches(
        {
          label: "UX",
          secondary: "SAAS · School Of Marketing",
          searchText: "SAAS School Of Marketing",
        },
        ["school", "saas", "ux"],
      ),
    ).toBe(true);
  });
});

describe("flattenMatchingFilterOptions", () => {
  const groups: AgencyFilterOptionGroup[] = [
    {
      groupLabel: "School Of Marketing",
      options: [
        { value: "saas", label: "SAAS", secondary: "School Of Marketing" },
        { value: "web", label: "Website", secondary: "School Of Marketing" },
      ],
    },
    {
      groupLabel: "Saif Personal Brand",
      options: [{ value: "adapt", label: "Adaptation Engine", secondary: "Saif Personal Brand" }],
    },
  ];

  test("flattens only path-matching rows so a client token does not dump the whole group", () => {
    const tokens = parseAgencyFilterSearchTokens("School SAAS");
    expect(flattenMatchingFilterOptions(groups, tokens).map((option) => option.value)).toEqual([
      "saas",
    ]);
  });
});

describe("sortFilterOptionsByRecents", () => {
  test("promotes in-session recents ahead of alphabetical order", () => {
    const sorted = sortFilterOptionsByRecents(
      [
        { value: "a", label: "Alpha" },
        { value: "b", label: "Beta" },
        { value: "c", label: "Gamma" },
      ],
      ["c", "a"],
    );
    expect(sorted.map((option) => option.value)).toEqual(["c", "a", "b"]);
  });
});

describe("agencyFilterTriggerLabel", () => {
  test("uses the empty label, a single name, or first name plus remainder", () => {
    expect(agencyFilterTriggerLabel("All Clients", [])).toBe("All Clients");
    expect(agencyFilterTriggerLabel("All Clients", [{ label: "Athletic Mission" }])).toBe(
      "Athletic Mission",
    );
    expect(
      agencyFilterTriggerLabel("All Clients", [
        { label: "Athletic Mission" },
        { label: "Charity Hours" },
        { label: "Coaching" },
      ]),
    ).toBe("Athletic Mission +2");
  });
});

describe("agencyFilterMatchingNoun", () => {
  test("strips All and maps Team to people", () => {
    expect(agencyFilterMatchingNoun("All Clients")).toBe("clients");
    expect(agencyFilterMatchingNoun("Team")).toBe("people");
    expect(agencyFilterMatchingNoun("All Tasks")).toBe("tasks");
  });
});

describe("agencyFilterOptionAccessibleName", () => {
  test("joins secondary with a comma so name and client stay distinct", () => {
    expect(agencyFilterOptionAccessibleName({ label: "1 bet card" })).toBe("1 bet card");
    expect(
      agencyFilterOptionAccessibleName({ label: "1 bet card", secondary: "Athletic Mission" }),
    ).toBe("1 bet card, Athletic Mission");
  });
});

describe("agencyFilterTriggerAccessibleName", () => {
  test("keeps the filter noun when the visible label is a name plus remainder", () => {
    expect(agencyFilterTriggerAccessibleName("All Projects", [])).toBe("All Projects");
    expect(agencyFilterTriggerAccessibleName("All Projects", [{ label: "SAAS" }])).toBe(
      "All Projects: SAAS",
    );
    expect(
      agencyFilterTriggerAccessibleName("All Projects", [{ label: "SAAS" }, { label: "Website" }]),
    ).toBe("All Projects: SAAS and 1 more");
  });
});
