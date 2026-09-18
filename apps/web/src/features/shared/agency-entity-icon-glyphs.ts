import {
  BarChart3,
  Briefcase,
  Bug,
  Calendar,
  Clapperboard,
  Code,
  Cog,
  Database,
  FileSearch,
  Flag,
  Globe,
  GraduationCap,
  ListChecks,
  Map,
  Megaphone,
  MessageSquare,
  Palette,
  Shield,
  Smartphone,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { AgencyEntityIconKey } from "@orch/api/routers/agency-ops/shared/entity-icon-catalog";

export const AGENCY_ENTITY_ICON_GLYPHS: Record<AgencyEntityIconKey, LucideIcon> = {
  palette: Palette,
  code: Code,
  megaphone: Megaphone,
  globe: Globe,
  smartphone: Smartphone,
  "bar-chart": BarChart3,
  bug: Bug,
  shield: Shield,
  database: Database,
  wallet: Wallet,
  message: MessageSquare,
  users: Users,
  "list-checks": ListChecks,
  calendar: Calendar,
  "file-search": FileSearch,
  flag: Flag,
  sparkles: Sparkles,
  briefcase: Briefcase,
  clapperboard: Clapperboard,
  cog: Cog,
  map: Map,
  "graduation-cap": GraduationCap,
};

export function agencyEntityGlyph(iconKey: string | null | undefined): LucideIcon | null {
  if (!iconKey) return null;
  return iconKey in AGENCY_ENTITY_ICON_GLYPHS
    ? AGENCY_ENTITY_ICON_GLYPHS[iconKey as AgencyEntityIconKey]
    : null;
}

export function agencyEntityIconLetter(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segment = new Intl.Segmenter(undefined, { granularity: "grapheme" })
      .segment(trimmed)
      [Symbol.iterator]()
      .next().value;
    return segment?.segment.toLocaleUpperCase() ?? "?";
  }
  return (Array.from(trimmed)[0] ?? "?").toLocaleUpperCase();
}
