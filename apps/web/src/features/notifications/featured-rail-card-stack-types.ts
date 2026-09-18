export type FeaturedRailCardKind = "app-update" | "notification" | "alert" | "invite";

export type FeaturedRailCardTone = "update" | "action" | "alert";

export type FeaturedRailCard = {
  id: string;
  kind: FeaturedRailCardKind;
  sectionLabel: string;
  title: string;
  body: string;
  ctaLabel: string;
  tone: FeaturedRailCardTone;
  dismissible: boolean;
  actorName?: string | null;
  actorAvatar?: string | null;
};
