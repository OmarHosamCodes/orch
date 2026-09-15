/** Corridor Board grouping for the Agency Clients list. */

const CLIENT_BOOK_CORRIDOR_IDS = ["ready", "working", "quiet", "internal", "archived"] as const;

export type ClientBookCorridorId = (typeof CLIENT_BOOK_CORRIDOR_IDS)[number];

const CLIENT_BOOK_NEED_IDS = ["invoice", "outstanding", "rate", "contact"] as const;

export type ClientBookNeedId = (typeof CLIENT_BOOK_NEED_IDS)[number];

export type ClientBookCorridorInput = {
  category: "internal" | "external";
  archivedAt: string | null;
  weekDurationSeconds: number;
  monthUninvoicedDurationSeconds: number;
  canViewBilling: boolean;
};

export type ClientBookNeedInput = {
  category?: "internal" | "external";
  canViewBilling: boolean;
  monthUninvoicedDurationSeconds: number;
  outstandingAmount: number;
  rateMissing: boolean;
  contactIncomplete: boolean;
};

export function clientBookCorridor(input: ClientBookCorridorInput): ClientBookCorridorId {
  if (input.archivedAt) return "archived";
  if (input.category === "internal") return "internal";
  if (input.canViewBilling && input.monthUninvoicedDurationSeconds > 0) return "ready";
  if (input.weekDurationSeconds > 0) return "working";
  return "quiet";
}

export function clientBookCorridorLabel(id: ClientBookCorridorId): string {
  switch (id) {
    case "ready":
      return "Ready to invoice";
    case "working":
      return "Working this week";
    case "quiet":
      return "Quiet";
    case "internal":
      return "Internal";
    case "archived":
      return "Archived";
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function clientBookNeedLabel(id: ClientBookNeedId): string {
  switch (id) {
    case "invoice":
      return "Ready to invoice";
    case "outstanding":
      return "Outstanding";
    case "rate":
      return "Set rate";
    case "contact":
      return "Add contact";
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function clientBookNeeds(input: ClientBookNeedInput): ClientBookNeedId[] {
  const needs: ClientBookNeedId[] = [];
  if (
    input.category !== "internal" &&
    input.canViewBilling &&
    input.monthUninvoicedDurationSeconds > 0
  ) {
    needs.push("invoice");
  }
  if (input.canViewBilling && input.outstandingAmount > 0) needs.push("outstanding");
  if (input.rateMissing) needs.push("rate");
  if (input.contactIncomplete) needs.push("contact");
  return needs;
}

export function groupClientsByCorridor<T extends { corridor: ClientBookCorridorId }>(
  items: T[],
): Array<{ id: ClientBookCorridorId; label: string; items: T[] }> {
  const buckets = new Map<ClientBookCorridorId, T[]>();
  for (const id of CLIENT_BOOK_CORRIDOR_IDS) buckets.set(id, []);
  for (const item of items) {
    buckets.get(item.corridor)?.push(item);
  }
  return CLIENT_BOOK_CORRIDOR_IDS.flatMap((id) => {
    const grouped = buckets.get(id) ?? [];
    if (grouped.length === 0) return [];
    return [{ id, label: clientBookCorridorLabel(id), items: grouped }];
  });
}
