/** Closed Lucide-key catalog for agency projects and tasks. No Lucide import. */

export const AGENCY_ENTITY_ICON_SOURCES = ["auto", "manual"] as const;

export type AgencyEntityIconSource = (typeof AGENCY_ENTITY_ICON_SOURCES)[number];

export const AGENCY_ENTITY_ICON_CATALOG = [
  {
    key: "palette",
    label: "Design",
    keywords: [
      "illustration",
      "graphic",
      "mockup",
      "creative",
      "visual",
      "design",
      "mock",
      "art",
      "ux",
      "ui",
      "تصميم",
    ],
  },
  {
    key: "code",
    label: "Build",
    keywords: [
      "development",
      "engineering",
      "implement",
      "frontend",
      "backend",
      "software",
      "code",
      "api",
      "dev",
      "تطوير",
      "برمجة",
    ],
  },
  {
    key: "megaphone",
    label: "Campaign",
    keywords: [
      "amplification",
      "campaign",
      "marketing",
      "organic",
      "social",
      "content",
      "ads",
      "seo",
      "paid",
      "حملة",
      "إعلان",
      "تسويق",
    ],
  },
  {
    key: "globe",
    label: "Web",
    keywords: ["wordpress", "website", "homepage", "landing", "web", "موقع", "صفحة"],
  },
  {
    key: "smartphone",
    label: "App",
    keywords: ["android", "mobile", "ios", "app", "تطبيق"],
  },
  {
    key: "bar-chart",
    label: "Report",
    keywords: ["analytics", "dashboard", "tracking", "metric", "report", "kpi", "تقرير", "تحليل"],
  },
  {
    key: "bug",
    label: "QA",
    keywords: ["testing", "quality", "test", "beta", "uat", "qa", "اختبار"],
  },
  {
    key: "shield",
    label: "Security",
    keywords: ["compliance", "security", "privacy", "audit", "legal", "أمن"],
  },
  {
    key: "database",
    label: "Data",
    keywords: ["migration", "database", "data", "etl"],
  },
  {
    key: "wallet",
    label: "Money",
    keywords: ["invoice", "billing", "finance", "payment", "budget", "cost", "فاتورة"],
  },
  {
    key: "message",
    label: "Feedback",
    keywords: ["feedback", "comment", "support", "chat", "تعليق"],
  },
  {
    key: "users",
    label: "Meeting",
    keywords: ["stakeholder", "standup", "meeting", "sync", "call", "اجتماع"],
  },
  {
    key: "list-checks",
    label: "Checklist",
    keywords: ["onboarding", "checklist", "backlog", "kickoff"],
  },
  {
    key: "calendar",
    label: "Schedule",
    keywords: ["timeline", "schedule", "deadline", "sprint", "gantt", "موعد"],
  },
  {
    key: "file-search",
    label: "Review",
    keywords: ["deliverable", "review", "polish", "مراجعة", "تدقيق"],
  },
  {
    key: "flag",
    label: "Launch",
    keywords: ["milestone", "go-live", "release", "launch", "ship", "إطلاق"],
  },
  {
    key: "sparkles",
    label: "Brand",
    keywords: ["branding", "identity", "brand", "logo", "هوية"],
  },
  {
    key: "briefcase",
    label: "Account",
    keywords: ["account", "retainer", "am", "إدارة حساب"],
  },
  {
    key: "clapperboard",
    label: "Production",
    keywords: ["production", "animation", "carousel", "blender", "video", "film", "reel", "فيديو"],
  },
  {
    key: "cog",
    label: "Ops",
    keywords: ["automation", "integration", "technical", "plugin", "أتمتة"],
  },
  {
    key: "map",
    label: "Plan",
    keywords: ["roadmap", "planning", "strategy", "research", "استراتيجية"],
  },
  {
    key: "graduation-cap",
    label: "Learning",
    keywords: ["learning", "training", "coaching", "workshop", "course", "تدريب"],
  },
] as const;

export type AgencyEntityIconKey = (typeof AGENCY_ENTITY_ICON_CATALOG)[number]["key"];

export const AGENCY_ENTITY_ICON_KEY_VALUES = [
  AGENCY_ENTITY_ICON_CATALOG[0].key,
  ...AGENCY_ENTITY_ICON_CATALOG.slice(1).map((entry) => entry.key),
] as [AgencyEntityIconKey, ...AgencyEntityIconKey[]];

export type AgencyEntityIcon = {
  iconKey: AgencyEntityIconKey | null;
  iconSource: AgencyEntityIconSource;
};

const ICON_KEY_SET = new Set<string>(AGENCY_ENTITY_ICON_CATALOG.map((entry) => entry.key));

const KEYWORD_INDEX: Array<{ keyword: string; key: AgencyEntityIconKey; arabic: boolean }> =
  AGENCY_ENTITY_ICON_CATALOG.flatMap((entry) =>
    entry.keywords.map((keyword) => ({
      keyword,
      key: entry.key,
      arabic: /[\u0600-\u06FF]/.test(keyword),
    })),
  ).sort((left, right) => right.keyword.length - left.keyword.length);

export function isAgencyEntityIconKey(
  value: string | null | undefined,
): value is AgencyEntityIconKey {
  return typeof value === "string" && ICON_KEY_SET.has(value);
}

export function readStoredEntityIcon(row: {
  iconKey: string | null;
  iconSource: string | null | undefined;
}): AgencyEntityIcon {
  return {
    iconKey: isAgencyEntityIconKey(row.iconKey) ? row.iconKey : null,
    iconSource: row.iconSource === "manual" ? "manual" : "auto",
  };
}

export function parseAgencyEntityIconKey(
  value: string | null | undefined,
): AgencyEntityIconKey | null {
  if (value == null || value === "") return null;
  if (!isAgencyEntityIconKey(value)) {
    throw new Error(`Unknown agency entity icon key: ${value}`);
  }
  return value;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function latinKeywordIndex(normalizedName: string, keyword: string): number {
  const pattern = new RegExp(
    `(?:^|[^\\p{L}\\p{N}])${escapeRegExp(keyword)}(?:$|[^\\p{L}\\p{N}])`,
    "iu",
  );
  const match = pattern.exec(normalizedName);
  return match ? match.index + (match[0].startsWith(keyword) ? 0 : 1) : -1;
}

/** Leftmost keyword wins; longer keywords break ties at the same index. */
export function matchAgencyEntityIconKey(name: string): AgencyEntityIconKey | null {
  const normalized = name.trim().toLocaleLowerCase();
  if (!normalized) return null;

  let best: { index: number; length: number; key: AgencyEntityIconKey } | null = null;

  for (const entry of KEYWORD_INDEX) {
    const index = entry.arabic
      ? normalized.indexOf(entry.keyword)
      : latinKeywordIndex(normalized, entry.keyword);
    if (index < 0) continue;
    if (
      !best ||
      index < best.index ||
      (index === best.index && entry.keyword.length > best.length)
    ) {
      best = { index, length: entry.keyword.length, key: entry.key };
    }
  }

  return best?.key ?? null;
}

export function resolveStoredEntityIcon(input: {
  name: string;
  iconKey: AgencyEntityIconKey | null;
  iconSource: AgencyEntityIconSource;
}): AgencyEntityIcon {
  if (input.iconSource === "manual") {
    return {
      iconKey: input.iconKey && isAgencyEntityIconKey(input.iconKey) ? input.iconKey : null,
      iconSource: "manual",
    };
  }
  return {
    iconKey: matchAgencyEntityIconKey(input.name),
    iconSource: "auto",
  };
}

export function assignEntityIconOnWrite(input: {
  name: string;
  requestedIconKey?: AgencyEntityIconKey | null;
  iconKeyProvided?: boolean;
  existing?: AgencyEntityIcon | null;
}): AgencyEntityIcon {
  if (input.iconKeyProvided) {
    const iconKey = input.requestedIconKey ?? null;
    if (iconKey != null && !isAgencyEntityIconKey(iconKey)) {
      throw new Error(`Unknown agency entity icon key: ${iconKey}`);
    }
    return { iconKey, iconSource: "manual" };
  }
  if (input.existing?.iconSource === "manual") {
    return input.existing;
  }
  return {
    iconKey: matchAgencyEntityIconKey(input.name),
    iconSource: "auto",
  };
}
