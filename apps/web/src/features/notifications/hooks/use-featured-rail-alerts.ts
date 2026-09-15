import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useNavigate } from "@/lib/navigation";

import { buildAlertPlate } from "@/features/member-profile/member-profile-alert-plate";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import { useTeamStore } from "@/features/team/team-store";

type AlertKind = "abnormal_day" | "month_pace" | "quarter_pace" | "waste_spike" | "custom";

function alertSeverityRank(kind: AlertKind): number {
  switch (kind) {
    case "abnormal_day":
    case "waste_spike":
      return 0;
    case "month_pace":
    case "quarter_pace":
      return 1;
    case "custom":
      return 2;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function useFeaturedRailAlerts() {
  const session = authClient.useSession();
  const teamId = useTeamStore((s) => s.selectedTeamId) ?? "";
  const userId = session.data?.user?.id ?? "";
  const navigate = useNavigate();
  const utcOffsetMinutes = new Date().getTimezoneOffset();

  const alertsQuery = useQuery({
    ...orpc.agencyOps.memberProfile.alerts.list.queryOptions({
      input: { teamId, userId, utcOffsetMinutes },
    }),
    enabled: Boolean(teamId && userId && session.data?.user),
  });

  const items = alertsQuery.data?.items ?? [];
  const featured = useMemo(() => {
    if (items.length === 0) return null;
    return items
      .slice()
      .sort(
        (a, b) =>
          alertSeverityRank(a.kind) - alertSeverityRank(b.kind) ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0];
  }, [items]);

  const count = items.length;
  const moreCount = Math.max(0, count - 1);
  const moreLabel =
    moreCount === 1 ? "1 more alert" : moreCount > 1 ? `${moreCount} more alerts` : null;

  const plate = featured
    ? buildAlertPlate(featured.kind, featured.context ?? {}, { title: featured.title })
    : null;

  function profileAlertsHref(alertId?: string) {
    const params = new URLSearchParams({ focus: "alerts" });
    if (alertId) params.set("alertId", alertId);
    const dateKey = featured?.context?.dateKey;
    const periodKey = featured?.context?.periodKey;
    if (dateKey && /^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      params.set("day", dateKey);
    } else if (
      periodKey &&
      (/^\d{4}-\d{2}$/.test(periodKey) ||
        /^tm:\d{4}-\d{2}-\d{2}$/.test(periodKey) ||
        /^\d{4}-Q[1-4]$/.test(periodKey))
    ) {
      params.set("period", periodKey);
    }
    return `/agency/me?${params.toString()}`;
  }

  function onPrimaryCta() {
    if (!featured) return;
    navigate(profileAlertsHref(featured.id));
  }

  function onOpenAll() {
    navigate(profileAlertsHref());
  }

  return {
    teamId,
    userId,
    listPending: alertsQuery.isPending && !alertsQuery.data,
    count,
    featured,
    plate,
    title: featured?.title ?? "",
    body: featured?.body ?? "",
    moreLabel,
    onPrimaryCta,
    onOpenAll,
  };
}

export type FeaturedRailAlertsViewModel = ReturnType<typeof useFeaturedRailAlerts>;
