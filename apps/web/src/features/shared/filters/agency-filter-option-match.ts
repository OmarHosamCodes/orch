import { tokenizeAgencySearchQuery } from "@/features/shared/agency-list-search";

type AgencyFilterOptionAvatar = {
  userId: string;
  name: string;
  avatarUrl?: string | null;
};

export type AgencyFilterOption = {
  value: string;
  label: string;
  searchText?: string;
  secondary?: string;
  avatar?: AgencyFilterOptionAvatar;
};

type AgencyFilterOptionSection = {
  sectionLabel: string;
  options: AgencyFilterOption[];
};

export type AgencyFilterOptionGroup = {
  groupLabel: string;
  options?: AgencyFilterOption[];
  sections?: AgencyFilterOptionSection[];
};

export type AgencyFilterOptionPath = {
  groupLabel?: string;
  sectionLabel?: string;
};

export function agencyFilterOptionMatches(
  option: Pick<AgencyFilterOption, "label" | "searchText" | "secondary">,
  tokens: string[],
  path: AgencyFilterOptionPath = {},
): boolean {
  if (tokens.length === 0) return true;
  const fields = [
    option.label,
    option.secondary ?? "",
    option.searchText ?? "",
    path.groupLabel ?? "",
    path.sectionLabel ?? "",
  ];
  return tokens.every((token) => fields.some((field) => field.toLowerCase().includes(token)));
}

export function flattenFilterOptions(groups: AgencyFilterOptionGroup[]): AgencyFilterOption[] {
  return groups.flatMap((group) => [
    ...(group.options ?? []),
    ...(group.sections?.flatMap((section) => section.options) ?? []),
  ]);
}

export function flattenMatchingFilterOptions(
  groups: AgencyFilterOptionGroup[],
  tokens: string[],
): AgencyFilterOption[] {
  const matched: AgencyFilterOption[] = [];
  for (const group of groups) {
    if (group.sections) {
      for (const section of group.sections) {
        for (const option of section.options) {
          if (
            agencyFilterOptionMatches(option, tokens, {
              groupLabel: group.groupLabel,
              sectionLabel: section.sectionLabel,
            })
          ) {
            matched.push(option);
          }
        }
      }
      continue;
    }
    for (const option of group.options ?? []) {
      if (agencyFilterOptionMatches(option, tokens, { groupLabel: group.groupLabel })) {
        matched.push(option);
      }
    }
  }
  return matched;
}

export function filterFlatFilterOptions(
  options: AgencyFilterOption[],
  tokens: string[],
): AgencyFilterOption[] {
  return options.filter((option) => agencyFilterOptionMatches(option, tokens));
}

export function filterGroupedFilterOptions(
  groups: AgencyFilterOptionGroup[],
  tokens: string[],
): AgencyFilterOptionGroup[] {
  if (tokens.length === 0) return groups;

  const next: AgencyFilterOptionGroup[] = [];
  for (const group of groups) {
    if (group.sections) {
      const sections = group.sections.flatMap((section) => {
        const options = section.options.filter((option) =>
          agencyFilterOptionMatches(option, tokens, {
            groupLabel: group.groupLabel,
            sectionLabel: section.sectionLabel,
          }),
        );
        return options.length > 0 ? [{ ...section, options }] : [];
      });
      if (sections.length > 0) next.push({ ...group, sections });
      continue;
    }

    const options = (group.options ?? []).filter((option) =>
      agencyFilterOptionMatches(option, tokens, { groupLabel: group.groupLabel }),
    );
    if (options.length > 0) next.push({ ...group, options });
  }
  return next;
}

export function sortFilterOptionsByRecents(
  options: AgencyFilterOption[],
  recentIds: string[],
): AgencyFilterOption[] {
  const rank = new Map(recentIds.map((id, index) => [id, index]));
  return [...options].sort((left, right) => {
    const leftRank = rank.get(left.value) ?? Number.POSITIVE_INFINITY;
    const rightRank = rank.get(right.value) ?? Number.POSITIVE_INFINITY;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return left.label.localeCompare(right.label);
  });
}

export function agencyFilterTriggerLabel(
  emptyLabel: string,
  selected: Array<{ label: string }>,
): string {
  if (selected.length === 0) return emptyLabel;
  if (selected.length === 1) return selected[0]!.label;
  return `${selected[0]!.label} +${selected.length - 1}`;
}

export function agencyFilterOptionAccessibleName(
  option: Pick<AgencyFilterOption, "label" | "secondary">,
): string {
  return option.secondary ? `${option.label}, ${option.secondary}` : option.label;
}

export function agencyFilterTriggerAccessibleName(
  emptyLabel: string,
  selected: Array<{ label: string }>,
): string {
  if (selected.length === 0) return emptyLabel;
  if (selected.length === 1) return `${emptyLabel}: ${selected[0]!.label}`;
  return `${emptyLabel}: ${selected[0]!.label} and ${selected.length - 1} more`;
}

export function agencyFilterMatchingNoun(label: string): string {
  if (label.trim().toLowerCase() === "team") return "people";
  const stripped = label
    .replace(/^all\s+/i, "")
    .trim()
    .toLowerCase();
  return stripped || "options";
}

export function parseAgencyFilterSearchTokens(query: string): string[] {
  return tokenizeAgencySearchQuery(query);
}
