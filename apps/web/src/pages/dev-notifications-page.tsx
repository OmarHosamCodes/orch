import { useEffect, useState, useMemo, type ReactNode } from "react";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock,
  Flame,
  Layers,
  MessageSquare,
  UserCheck,
} from "lucide-react";
import type { NotificationRecord } from "@orch/api/schemas/notifications";

import { FeaturedRailCardStackView } from "@/features/notifications/featured-rail-card-stack-view";
import type { FeaturedRailCardStackViewModel } from "@/features/notifications/hooks/use-featured-rail-card-stack";
import type { FeaturedRailCard } from "@/features/notifications/featured-rail-card-stack-types";
import { FeaturedRailAlertsView } from "@/features/notifications/featured-rail-alerts-view";
import type { FeaturedRailAlertsViewModel } from "@/features/notifications/hooks/use-featured-rail-alerts";
import { FeaturedRailNotificationView } from "@/features/notifications/featured-rail-notification-view";
import type { FeaturedRailNotificationViewModel } from "@/features/notifications/hooks/use-featured-rail-notification";
import { AgencyNotificationsView } from "@/features/notifications/agency-notifications-view";
import type { AgencyNotificationsViewModel } from "@/features/notifications/hooks/use-agency-notifications";
import { FeaturedRailAlertsContainer } from "@/features/notifications/containers/featured-rail-alerts-container";
import { FeaturedRailNotificationContainer } from "@/features/notifications/containers/featured-rail-notification-container";
import { AgencyNotificationsContainer } from "@/features/notifications/containers/agency-notifications-container";
import { AlertPlateGlyph } from "@/features/member-profile/member-profile-alert-glyphs";
import {
  buildAlertPlate,
  type AlertPlateKind,
  type AlertPlateTone,
} from "@/features/member-profile/member-profile-alert-plate";
import { instrumentPlateInkClass } from "@/features/member-profile/member-profile-instrument-plate";
import {
  useAgencyNotificationsQuery,
  useAgencyNotificationUnreadCountQuery,
} from "@/features/notifications/notifications-queries";
import { orpc } from "@/lib/orpc";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/ui/tabs";
import { useTeamStore } from "@/features/team/team-store";
import { DevRealModeNotice, DevRealTeamPicker, useDevRealTeams } from "@/pages/dev-dialogs-real";
import { cn } from "@/lib/utils";

/** Simulated dark sidebar rail frame matching Orch's shell rail footer */
function RailCardFrame({
  label,
  children,
  className,
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="flex w-[240px] max-w-full min-w-0 flex-col gap-2">
      {label ? (
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
        </div>
      ) : null}
      <div
        className={cn(
          "w-full rounded-xl border border-sidebar-border bg-sidebar p-2 text-sidebar-foreground",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

function DevSectionCard({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 border-t border-border pt-6 sm:pt-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-balance text-foreground">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
        {badge ? (
          <code className="max-w-full break-all text-xs text-muted-foreground">{badge}</code>
        ) : null}
      </header>
      {children}
    </section>
  );
}

const SAMPLE_STACK_CARDS: FeaturedRailCard[] = [
  {
    id: "notification:dev-1",
    kind: "notification",
    sectionLabel: "Needs action",
    title: "Assigned task",
    body: "Sarah assigned you Website QA. Review edge-case viewport tests and sign off.",
    ctaLabel: "Read",
    tone: "action",
    dismissible: true,
    actorName: "Sarah Chen",
    actorAvatar: null,
  },
  {
    id: "alert:dev-1",
    kind: "alert",
    sectionLabel: "Alerts",
    title: "Behind monthly pace",
    body: "Paced at 48h vs 85h milestone expected by mid-month.",
    ctaLabel: "View",
    tone: "alert",
    dismissible: false,
  },
  {
    id: "notification:dev-2",
    kind: "notification",
    sectionLabel: "Needs action",
    title: "New reply",
    body: "Omar replied in API Contract Specs with feedback on auth endpoints.",
    ctaLabel: "Read",
    tone: "action",
    dismissible: true,
    actorName: "Omar Hosam",
    actorAvatar: null,
  },
  {
    id: "app-update",
    kind: "app-update",
    sectionLabel: "Update",
    title: "App update",
    body: "A newer version of Orch is ready.",
    ctaLabel: "Update now",
    tone: "update",
    dismissible: false,
  },
];

function FeaturedRailCardStackSection() {
  const [order, setOrder] = useState(SAMPLE_STACK_CARDS.map((card) => card.id));
  const [isHovered, setIsHovered] = useState(false);
  const [swap, setSwap] = useState<{ cardId: string; phase: "lift" | "land" } | null>(null);
  const [actionLog, setActionLog] = useState("Ready — hover to fan, click a strip to promote");

  const cards = order
    .map((id) => SAMPLE_STACK_CARDS.find((card) => card.id === id))
    .filter((card): card is FeaturedRailCard => !!card)
    .slice(0, 3);

  useEffect(() => {
    if (swap?.phase !== "lift") return;
    const timer = window.setTimeout(() => {
      setSwap((current) => (current ? { ...current, phase: "land" } : null));
    }, 170);
    return () => window.clearTimeout(timer);
  }, [swap]);

  useEffect(() => {
    if (swap?.phase !== "land") return;
    const timer = window.setTimeout(() => setSwap(null), 420);
    return () => window.clearTimeout(timer);
  }, [swap]);

  const mockView: FeaturedRailCardStackViewModel = {
    teamId: "dev-team",
    userId: "dev-user",
    listPending: false,
    cards,
    overflowCount: Math.max(0, SAMPLE_STACK_CARDS.length - cards.length),
    actionPendingId: null,
    swappingCardId: swap?.cardId ?? null,
    swapPhase: swap?.phase ?? null,
    isHovered,
    reducedMotion: false,
    onHoverChange: setIsHovered,
    onPromoteCard: (cardId) => {
      if (swap) return;
      setOrder((current) => [cardId, ...current.filter((id) => id !== cardId)]);
      setSwap({ cardId, phase: "lift" });
      setActionLog(`Promoted ${cardId}`);
    },
    onCardCta: (cardId) => {
      setActionLog(`CTA on ${cardId}`);
    },
    onDismissCard: (cardId) => {
      setOrder((current) => current.filter((id) => id !== cardId));
      setActionLog(`Dismissed ${cardId}`);
    },
  };

  return (
    <div className="flex flex-wrap items-start gap-6">
      <RailCardFrame label="Sidebar Rail Preview (w: 240px)">
        <FeaturedRailCardStackView view={mockView} />
      </RailCardFrame>
      <div className="max-w-[260px] rounded-lg border border-border/60 bg-card p-2.5 text-[11px] text-muted-foreground">
        <span className="font-semibold text-foreground">Action event:</span> {actionLog}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Featured Rail Alerts Section (Sample Mode)
// --------------------------------------------------------------------------

const DEFAULT_ALERT_PRESETS: Record<
  AlertPlateKind,
  { title: string; body: string; ratio: number; tone: AlertPlateTone; metric: string }
> = {
  abnormal_day: {
    title: "Abnormal day: 11.2h logged",
    body: "Daily hours exceed 130% of scheduled threshold for Tuesday.",
    ratio: 0.85,
    tone: "danger",
    metric: "11.2h",
  },
  month_pace: {
    title: "Behind monthly pace",
    body: "Paced at 48h vs 85h milestone expected by mid-month.",
    ratio: 0.35,
    tone: "warning",
    metric: "48h / 85h",
  },
  quarter_pace: {
    title: "Quarter pace warning",
    body: "Quarterly trajectory tracking 18% below agency target.",
    ratio: 0.55,
    tone: "warning",
    metric: "55%",
  },
  waste_spike: {
    title: "Waste spike detected",
    body: "Internal overhead & unbilled hours surged to 38% this week.",
    ratio: 0.42,
    tone: "danger",
    metric: "38%",
  },
  custom: {
    title: "Manager note",
    body: "Please confirm timesheets for the Acme sprint before 5 PM.",
    ratio: 0.5,
    tone: "info",
    metric: "Notice",
  },
};

function FeaturedRailAlertsSection() {
  const [kind, setKind] = useState<AlertPlateKind>("abnormal_day");
  const [tone, setTone] = useState<AlertPlateTone>("danger");
  const [title, setTitle] = useState(DEFAULT_ALERT_PRESETS.abnormal_day.title);
  const [body, setBody] = useState(DEFAULT_ALERT_PRESETS.abnormal_day.body);
  const [ratio, setRatio] = useState(0.85);
  const [count, setCount] = useState(3);
  const [listPending, setListPending] = useState(false);
  const [actionLog, setActionLog] = useState<string>("Ready — click any button");

  function handleKindSelect(nextKind: AlertPlateKind) {
    setKind(nextKind);
    const preset = DEFAULT_ALERT_PRESETS[nextKind];
    setTone(preset.tone);
    setTitle(preset.title);
    setBody(preset.body);
    setRatio(preset.ratio);
  }

  const moreCount = Math.max(0, count - 1);
  const moreLabel =
    moreCount === 1 ? "1 more alert" : moreCount > 1 ? `${moreCount} more alerts` : null;

  const mockPlate = {
    ...buildAlertPlate(kind, {}),
    metric: DEFAULT_ALERT_PRESETS[kind].metric,
    tone,
    chartRatio: ratio,
  };

  const mockViewModel: FeaturedRailAlertsViewModel = {
    userId: "dev-user",
    teamId: "dev-team",
    listPending,
    count,
    featured: {
      id: "alert-dev-1",
      kind,
      source: "system",
      status: "open",
      fingerprint: "dev-fp-1",
      title,
      body,
      note: null,
      context: {},
      sentAt: new Date().toISOString(),
      snoozedUntil: null,
      createdAt: new Date().toISOString(),
      ephemeral: false,
    },
    plate: mockPlate,
    title,
    body,
    moreLabel,
    onPrimaryCta: () => setActionLog(`Primary CTA clicked: View alert (${title})`),
    onOpenAll: () => setActionLog(`Secondary link clicked: Open all alerts (${moreLabel})`),
  };

  return (
    <div className="space-y-6">
      {/* Interactive Workbench */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="min-w-0 space-y-4 lg:col-span-7">
          <h3 className="text-sm font-medium text-foreground">Customize alert</h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="alert-kind" className="text-xs">
                Alert type
              </Label>
              <Select value={kind} onValueChange={(val) => handleKindSelect(val as AlertPlateKind)}>
                <SelectTrigger id="alert-kind" className="h-8 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="abnormal_day">abnormal_day (Day hours)</SelectItem>
                  <SelectItem value="month_pace">month_pace (Month pace)</SelectItem>
                  <SelectItem value="quarter_pace">quarter_pace (Quarter pace)</SelectItem>
                  <SelectItem value="waste_spike">waste_spike (Waste share)</SelectItem>
                  <SelectItem value="custom">custom (Manager note)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="alert-tone" className="text-xs">
                Tone
              </Label>
              <Select value={tone} onValueChange={(val) => setTone(val as AlertPlateTone)}>
                <SelectTrigger id="alert-tone" className="h-8 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="danger">danger (destructive)</SelectItem>
                  <SelectItem value="warning">warning (amber)</SelectItem>
                  <SelectItem value="info">info (blue)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="alert-title" className="text-xs">
              Title
            </Label>
            <Input
              id="alert-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="alert-body" className="text-xs">
              Body
            </Label>
            <Input
              id="alert-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="alert-ratio" className="text-xs">
                Chart ratio ({Math.round(ratio * 100)}%)
              </Label>
              <input
                id="alert-ratio"
                type="range"
                min="0.05"
                max="1"
                step="0.05"
                value={ratio}
                onChange={(e) => setRatio(parseFloat(e.target.value))}
                className="h-2 w-full cursor-pointer accent-primary"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Alerts</Label>
              <div
                className="flex flex-wrap items-center gap-1.5"
                role="group"
                aria-label="Total alerts"
              >
                {[0, 1, 2, 4].map((c) => (
                  <Button
                    key={c}
                    type="button"
                    aria-pressed={count === c}
                    variant={count === c ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => setCount(c)}
                  >
                    {c} {c === 1 ? "alert" : "alerts"}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border/50 pt-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="alert-loading-switch"
                checked={listPending}
                onCheckedChange={(checked) => setListPending(checked === true)}
              />
              <Label htmlFor="alert-loading-switch" className="cursor-pointer text-xs font-normal">
                Loading shimmer
              </Label>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleKindSelect(kind)}
            >
              Reset preset
            </Button>
          </div>
        </div>

        {/* Real Sidebar Rail Container Preview */}
        <div className="flex min-w-0 flex-col items-center justify-start gap-4 border-t border-border pt-6 lg:col-span-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
          <RailCardFrame label="Sidebar Rail Preview (w: 240px)">
            <FeaturedRailAlertsView view={mockViewModel} />
            {count === 0 && !listPending ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                (Component returns null when count === 0)
              </div>
            ) : null}
          </RailCardFrame>

          <div className="mt-4 w-full max-w-[260px] rounded-lg border border-border/60 bg-card p-2.5 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">Action event:</span> {actionLog}
          </div>
        </div>
      </div>

      {/* Presets Gallery */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          All Alert Kinds & States Gallery
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {/* Abnormal Day */}
          <RailCardFrame label="Abnormal Day (Danger)">
            <FeaturedRailAlertsView
              view={{
                userId: "u1",
                teamId: "t1",
                listPending: false,
                count: 1,
                featured: {
                  id: "a1",
                  kind: "abnormal_day",
                  source: "system",
                  status: "open",
                  fingerprint: "fp1",
                  title: DEFAULT_ALERT_PRESETS.abnormal_day.title,
                  body: DEFAULT_ALERT_PRESETS.abnormal_day.body,
                  note: null,
                  context: {},
                  sentAt: null,
                  snoozedUntil: null,
                  createdAt: new Date().toISOString(),
                  ephemeral: false,
                },
                plate: {
                  shortLabel: "Day hours",
                  metric: "11.2h",
                  tone: "danger",
                  chartRatio: 0.85,
                },
                title: DEFAULT_ALERT_PRESETS.abnormal_day.title,
                body: DEFAULT_ALERT_PRESETS.abnormal_day.body,
                moreLabel: null,
                onPrimaryCta: () => {},
                onOpenAll: () => {},
              }}
            />
          </RailCardFrame>

          {/* Month Pace */}
          <RailCardFrame label="Month Pace (Warning)">
            <FeaturedRailAlertsView
              view={{
                userId: "u1",
                teamId: "t1",
                listPending: false,
                count: 1,
                featured: {
                  id: "a2",
                  kind: "month_pace",
                  source: "system",
                  status: "open",
                  fingerprint: "fp2",
                  title: DEFAULT_ALERT_PRESETS.month_pace.title,
                  body: DEFAULT_ALERT_PRESETS.month_pace.body,
                  note: null,
                  context: {},
                  sentAt: null,
                  snoozedUntil: null,
                  createdAt: new Date().toISOString(),
                  ephemeral: false,
                },
                plate: {
                  shortLabel: "Month pace",
                  metric: "48h / 85h",
                  tone: "warning",
                  chartRatio: 0.35,
                },
                title: DEFAULT_ALERT_PRESETS.month_pace.title,
                body: DEFAULT_ALERT_PRESETS.month_pace.body,
                moreLabel: null,
                onPrimaryCta: () => {},
                onOpenAll: () => {},
              }}
            />
          </RailCardFrame>

          {/* Quarter Pace */}
          <RailCardFrame label="Quarter Pace (Warning)">
            <FeaturedRailAlertsView
              view={{
                userId: "u1",
                teamId: "t1",
                listPending: false,
                count: 1,
                featured: {
                  id: "a3",
                  kind: "quarter_pace",
                  source: "system",
                  status: "open",
                  fingerprint: "fp3",
                  title: DEFAULT_ALERT_PRESETS.quarter_pace.title,
                  body: DEFAULT_ALERT_PRESETS.quarter_pace.body,
                  note: null,
                  context: {},
                  sentAt: null,
                  snoozedUntil: null,
                  createdAt: new Date().toISOString(),
                  ephemeral: false,
                },
                plate: {
                  shortLabel: "Quarter pace",
                  metric: "55%",
                  tone: "warning",
                  chartRatio: 0.55,
                },
                title: DEFAULT_ALERT_PRESETS.quarter_pace.title,
                body: DEFAULT_ALERT_PRESETS.quarter_pace.body,
                moreLabel: null,
                onPrimaryCta: () => {},
                onOpenAll: () => {},
              }}
            />
          </RailCardFrame>

          {/* Waste Spike */}
          <RailCardFrame label="Waste Spike (Danger)">
            <FeaturedRailAlertsView
              view={{
                userId: "u1",
                teamId: "t1",
                listPending: false,
                count: 1,
                featured: {
                  id: "a4",
                  kind: "waste_spike",
                  source: "system",
                  status: "open",
                  fingerprint: "fp4",
                  title: DEFAULT_ALERT_PRESETS.waste_spike.title,
                  body: DEFAULT_ALERT_PRESETS.waste_spike.body,
                  note: null,
                  context: {},
                  sentAt: null,
                  snoozedUntil: null,
                  createdAt: new Date().toISOString(),
                  ephemeral: false,
                },
                plate: {
                  shortLabel: "Waste share",
                  metric: "38%",
                  tone: "danger",
                  chartRatio: 0.42,
                },
                title: DEFAULT_ALERT_PRESETS.waste_spike.title,
                body: DEFAULT_ALERT_PRESETS.waste_spike.body,
                moreLabel: null,
                onPrimaryCta: () => {},
                onOpenAll: () => {},
              }}
            />
          </RailCardFrame>

          {/* Custom Manager Note */}
          <RailCardFrame label="Custom Note (Info)">
            <FeaturedRailAlertsView
              view={{
                userId: "u1",
                teamId: "t1",
                listPending: false,
                count: 1,
                featured: {
                  id: "a5",
                  kind: "custom",
                  source: "custom",
                  status: "open",
                  fingerprint: "fp5",
                  title: DEFAULT_ALERT_PRESETS.custom.title,
                  body: DEFAULT_ALERT_PRESETS.custom.body,
                  note: null,
                  context: {},
                  sentAt: null,
                  snoozedUntil: null,
                  createdAt: new Date().toISOString(),
                  ephemeral: false,
                },
                plate: {
                  shortLabel: "Manager note",
                  metric: "Notice",
                  tone: "info",
                  chartRatio: 0.5,
                },
                title: DEFAULT_ALERT_PRESETS.custom.title,
                body: DEFAULT_ALERT_PRESETS.custom.body,
                moreLabel: null,
                onPrimaryCta: () => {},
                onOpenAll: () => {},
              }}
            />
          </RailCardFrame>

          {/* Multiple Alerts with Overflow */}
          <RailCardFrame label="Multiple Alerts (Overflow link)">
            <FeaturedRailAlertsView
              view={{
                userId: "u1",
                teamId: "t1",
                listPending: false,
                count: 4,
                featured: {
                  id: "a6",
                  kind: "abnormal_day",
                  source: "system",
                  status: "open",
                  fingerprint: "fp6",
                  title: "Multiple team alerts pending",
                  body: "Capacity limit reached across 2 active projects.",
                  note: null,
                  context: {},
                  sentAt: null,
                  snoozedUntil: null,
                  createdAt: new Date().toISOString(),
                  ephemeral: false,
                },
                plate: {
                  shortLabel: "Day hours",
                  metric: "12h",
                  tone: "danger",
                  chartRatio: 0.95,
                },
                title: "Multiple team alerts pending",
                body: "Capacity limit reached across 2 active projects.",
                moreLabel: "3 more alerts",
                onPrimaryCta: () => {},
                onOpenAll: () => {},
              }}
            />
          </RailCardFrame>

          {/* Loading Shimmer State */}
          <RailCardFrame label="Loading State (Shimmer)">
            <FeaturedRailAlertsView
              view={{
                userId: "u1",
                teamId: "t1",
                listPending: true,
                count: 0,
                featured: null,
                plate: null,
                title: "",
                body: "",
                moreLabel: null,
                onPrimaryCta: () => {},
                onOpenAll: () => {},
              }}
            />
          </RailCardFrame>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Featured Rail Notification Section (Sample Mode)
// --------------------------------------------------------------------------

function FeaturedRailNotificationSection() {
  const [isAppUpdate, setIsAppUpdate] = useState(false);
  const [actorName, setActorName] = useState("Sarah Chen");
  const [title, setTitle] = useState("Sarah assigned you 'Website QA'");
  const [body, setBody] = useState("Review edge-case viewport tests and sign off on milestone.");
  const [ctaLabel, setCtaLabel] = useState("Review task");
  const [overflowCount, setOverflowCount] = useState(1);
  const [actionPending, setActionPending] = useState(false);
  const [listPending, setListPending] = useState(false);
  const [actionLog, setActionLog] = useState("Ready");

  const moreLabel =
    overflowCount === 1 ? "1 more" : overflowCount > 1 ? `${overflowCount} more` : null;

  const mockViewModel: FeaturedRailNotificationViewModel = {
    teamId: "dev-team",
    listPending,
    count: overflowCount + 1,
    moreCount: overflowCount,
    featured: isAppUpdate
      ? null
      : ({
          id: "dev-notif-1",
          teamId: "dev-team",
          recipientUserId: "dev-user",
          actorUserId: "dev-actor",
          actorName,
          actorAvatar: null,
          type: "task.assigned",
          deliveryClass: "interrupt",
          payload: { taskTitle: "Website QA" },
          readAt: null,
          seenAt: null,
          createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
          updatedAt: new Date().toISOString(),
        } as NotificationRecord),
    isAppUpdate,
    actorName,
    actorAvatar: null,
    relativeTime: "12m",
    title: isAppUpdate ? "App update" : title,
    body: isAppUpdate ? "A newer version of Orch is ready." : body,
    ctaLabel: isAppUpdate ? "Update now" : ctaLabel,
    moreLabel,
    actionPending,
    onDismiss: () => {
      setActionLog("Notification dismissed (X)");
    },
    onPrimaryCta: () => {
      setActionLog(`Primary CTA clicked: ${isAppUpdate ? "Update now" : ctaLabel}`);
    },
    onAdvanceFeatured: () => {
      setActionLog(`Advance featured clicked: ${moreLabel}`);
    },
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="min-w-0 space-y-4 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              Interactive Notification Customizer
            </h3>
            <span className="font-mono text-[11px] text-muted-foreground">
              FeaturedRailNotificationView
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="is-update-switch"
                checked={isAppUpdate}
                onCheckedChange={(checked) => setIsAppUpdate(checked === true)}
              />
              <Label htmlFor="is-update-switch" className="cursor-pointer text-xs font-medium">
                App Update Variant
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="notif-action-pending"
                checked={actionPending}
                onCheckedChange={(checked) => setActionPending(checked === true)}
              />
              <Label htmlFor="notif-action-pending" className="cursor-pointer text-xs font-normal">
                Action Spinning
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="notif-loading"
                checked={listPending}
                onCheckedChange={(checked) => setListPending(checked === true)}
              />
              <Label htmlFor="notif-loading" className="cursor-pointer text-xs font-normal">
                Loading Shimmer
              </Label>
            </div>
          </div>

          {!isAppUpdate ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Actor Name</Label>
                  <Input
                    value={actorName}
                    onChange={(e) => setActorName(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">CTA Label</Label>
                  <Input
                    value={ctaLabel}
                    onChange={(e) => setCtaLabel(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Body</Label>
                <Input
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </>
          ) : null}

          <div className="space-y-1.5 pt-1">
            <Label className="text-xs">Overflow Count: {overflowCount}</Label>
            <div className="flex items-center gap-1.5">
              {[0, 1, 3, 5].map((c) => (
                <Button
                  key={c}
                  type="button"
                  variant={overflowCount === c ? "default" : "outline"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setOverflowCount(c)}
                >
                  {c === 0 ? "None" : `${c} more`}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col items-center justify-start gap-4 border-t border-border pt-6 lg:col-span-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
          <RailCardFrame label="Sidebar Rail Preview (w: 240px)">
            <FeaturedRailNotificationView view={mockViewModel} />
          </RailCardFrame>

          <div className="mt-4 w-full max-w-[260px] rounded-lg border border-border/60 bg-card p-2.5 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">Action event:</span> {actionLog}
          </div>
        </div>
      </div>

      {/* Notification Card Presets */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Notification Card Gallery
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {/* Task Assigned */}
          <RailCardFrame label="Task Assigned">
            <FeaturedRailNotificationView
              view={{
                teamId: "t1",
                listPending: false,
                count: 1,
                moreCount: 0,
                featured: {
                  id: "notif-task",
                  teamId: "t1",
                  recipientUserId: "u1",
                  actorUserId: "u2",
                  actorName: "Sarah Chen",
                  actorAvatar: null,
                  type: "task.assigned",
                  deliveryClass: "interrupt",
                  payload: { taskTitle: "Redesign auth flow" },
                  readAt: null,
                  seenAt: null,
                  createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
                  updatedAt: new Date().toISOString(),
                } as NotificationRecord,
                isAppUpdate: false,
                actorName: "Sarah Chen",
                actorAvatar: null,
                relativeTime: "5m",
                title: "Sarah Chen assigned you a task",
                body: "Redesign auth flow in Acme Project.",
                ctaLabel: "Review task",
                moreLabel: null,
                actionPending: false,
                onDismiss: () => {},
                onPrimaryCta: () => {},
                onAdvanceFeatured: () => {},
              }}
            />
          </RailCardFrame>

          {/* New Messages */}
          <RailCardFrame label="Discussion Reply">
            <FeaturedRailNotificationView
              view={{
                teamId: "t1",
                listPending: false,
                count: 3,
                moreCount: 2,
                featured: {
                  id: "notif-msg",
                  teamId: "t1",
                  recipientUserId: "u1",
                  actorUserId: "u3",
                  actorName: "Omar Hosam",
                  actorAvatar: null,
                  type: "task.message",
                  deliveryClass: "breakpoint",
                  payload: { taskTitle: "API Contract Specs", messageCount: 4 },
                  readAt: null,
                  seenAt: null,
                  createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
                  updatedAt: new Date().toISOString(),
                } as NotificationRecord,
                isAppUpdate: false,
                actorName: "Omar Hosam",
                actorAvatar: null,
                relativeTime: "25m",
                title: "Omar sent 4 messages",
                body: "Replied in 'API Contract Specs' with feedback on auth endpoints.",
                ctaLabel: "Reply",
                moreLabel: "2 more",
                actionPending: false,
                onDismiss: () => {},
                onPrimaryCta: () => {},
                onAdvanceFeatured: () => {},
              }}
            />
          </RailCardFrame>

          {/* Member Profile Alert */}
          <RailCardFrame label="Member Profile Alert">
            <FeaturedRailNotificationView
              view={{
                teamId: "t1",
                listPending: false,
                count: 1,
                moreCount: 0,
                featured: {
                  id: "notif-alert",
                  teamId: "t1",
                  recipientUserId: "u1",
                  actorUserId: "u4",
                  actorName: "Alex Morgan",
                  actorAvatar: null,
                  type: "member.alert",
                  deliveryClass: "interrupt",
                  payload: {
                    alertTitle: "Low efficiency drift",
                    notePreview: "Non-billable ratio reached 45% during sprint.",
                  },
                  readAt: null,
                  seenAt: null,
                  createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
                  updatedAt: new Date().toISOString(),
                } as NotificationRecord,
                isAppUpdate: false,
                actorName: "Alex Morgan",
                actorAvatar: null,
                relativeTime: "1h",
                title: "Alex Morgan sent Low efficiency drift",
                body: "Non-billable ratio reached 45% during sprint.",
                ctaLabel: "View profile",
                moreLabel: null,
                actionPending: false,
                onDismiss: () => {},
                onPrimaryCta: () => {},
                onAdvanceFeatured: () => {},
              }}
            />
          </RailCardFrame>

          {/* App Update Ready */}
          <RailCardFrame label="App Update Ready">
            <FeaturedRailNotificationView
              view={{
                teamId: "t1",
                listPending: false,
                count: 1,
                moreCount: 0,
                featured: null,
                isAppUpdate: true,
                actorName: "",
                actorAvatar: null,
                relativeTime: "",
                title: "App update",
                body: "A newer version of Orch is ready.",
                ctaLabel: "Update now",
                moreLabel: null,
                actionPending: false,
                onDismiss: () => {},
                onPrimaryCta: () => {},
                onAdvanceFeatured: () => {},
              }}
            />
          </RailCardFrame>

          {/* Action Pending / Spinning */}
          <RailCardFrame label="Action Pending (Spinning)">
            <FeaturedRailNotificationView
              view={{
                teamId: "t1",
                listPending: false,
                count: 1,
                moreCount: 0,
                featured: {
                  id: "notif-spin",
                  teamId: "t1",
                  recipientUserId: "u1",
                  actorUserId: "u2",
                  actorName: "Sarah Chen",
                  actorAvatar: null,
                  type: "task.assigned",
                  deliveryClass: "interrupt",
                  payload: {},
                  readAt: null,
                  seenAt: null,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                } as NotificationRecord,
                isAppUpdate: false,
                actorName: "Sarah Chen",
                actorAvatar: null,
                relativeTime: "just now",
                title: "Updating task status...",
                body: "Syncing task details with server.",
                ctaLabel: "Updating",
                moreLabel: null,
                actionPending: true,
                onDismiss: () => {},
                onPrimaryCta: () => {},
                onAdvanceFeatured: () => {},
              }}
            />
          </RailCardFrame>

          {/* Loading Shimmer */}
          <RailCardFrame label="Loading State (Shimmer)">
            <FeaturedRailNotificationView
              view={{
                teamId: "t1",
                listPending: true,
                count: 0,
                moreCount: 0,
                featured: null,
                isAppUpdate: false,
                actorName: "",
                actorAvatar: null,
                relativeTime: "",
                title: "",
                body: "",
                ctaLabel: "Open",
                moreLabel: null,
                actionPending: false,
                onDismiss: () => {},
                onPrimaryCta: () => {},
                onAdvanceFeatured: () => {},
              }}
            />
          </RailCardFrame>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Agency Notifications Inbox Section (Sample Mode)
// --------------------------------------------------------------------------

function NotificationsInboxSection() {
  const [badgeCount, setBadgeCount] = useState(3);
  const [showSettings, setShowSettings] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [actionLog, setActionLog] = useState("Ready");

  // Sample notifications representing all kinds
  const sampleNotifications: NotificationRecord[] = useMemo(
    () => [
      {
        id: "inbox-1",
        teamId: "dev-team",
        recipientUserId: "dev-user",
        actorUserId: "dev-actor-1",
        actorName: "Sarah Chen",
        actorAvatar: null,
        type: "task.assigned",
        deliveryClass: "interrupt",
        payload: { taskId: "task-1", taskTitle: "Review client pitch deck" },
        readAt: null,
        seenAt: null,
        createdAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "inbox-2",
        teamId: "dev-team",
        recipientUserId: "dev-user",
        actorUserId: "dev-actor-2",
        actorName: "Alex Rivera",
        actorAvatar: null,
        type: "task.message",
        deliveryClass: "breakpoint",
        payload: { taskId: "task-2", taskTitle: "Design System Tokens", messageCount: 3 },
        readAt: null,
        seenAt: null,
        createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "inbox-3",
        teamId: "dev-team",
        recipientUserId: "dev-user",
        actorUserId: "dev-actor-3",
        actorName: "Elena Rostova",
        actorAvatar: null,
        type: "member.alert",
        deliveryClass: "interrupt",
        payload: {
          alertTitle: "Capacity stretch warning",
          notePreview: "Workload exceeded 45 planned hours this week.",
        },
        readAt: null,
        seenAt: null,
        createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "inbox-4",
        teamId: "dev-team",
        recipientUserId: "dev-user",
        actorUserId: "dev-actor-1",
        actorName: "Sarah Chen",
        actorAvatar: null,
        type: "journey.milestone",
        deliveryClass: "center",
        payload: {
          projectId: "proj-1",
          projectName: "Acme Rebrand",
          journeyStepLabel: "Design Phase Complete",
        },
        readAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        seenAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "inbox-5",
        teamId: "dev-team",
        recipientUserId: "dev-user",
        actorUserId: "dev-actor-2",
        actorName: "Alex Rivera",
        actorAvatar: null,
        type: "timer.activity",
        deliveryClass: "center",
        payload: {
          projectName: "Acme Rebrand",
          taskTitle: "Hero 3D Illustration",
          timerAction: "started",
        },
        readAt: new Date().toISOString(),
        seenAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "inbox-6",
        teamId: "dev-team",
        recipientUserId: "dev-user",
        actorUserId: null,
        actorName: "Team",
        actorAvatar: null,
        type: "team.digest",
        deliveryClass: "digest",
        payload: {
          digestHoursSeconds: 28800,
          digestTasksCompleted: 8,
        },
        readAt: new Date().toISOString(),
        seenAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 720).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    [],
  );

  const mockInboxView: AgencyNotificationsViewModel = {
    teamId: "dev-team",
    open: popoverOpen,
    setOpen: setPopoverOpen,
    showSettings,
    setShowSettings,
    pushBusy: false,
    showPushPrompt: false,
    unreadCount: 3,
    actionCount: 3,
    badgeCount,
    badgeLabel: badgeCount > 9 ? "9+" : String(badgeCount),
    items: sampleNotifications,
    sections: [
      {
        label: "Needs action",
        items: sampleNotifications.slice(0, 3),
      },
      {
        label: "Updates",
        items: sampleNotifications.slice(3),
      },
    ],
    hasUnread: true,
    listPending: false,
    preferencesPending: false,
    preferences: [
      { type: "task.assigned", inApp: true, push: true },
      { type: "task.message", inApp: true, push: true },
      { type: "journey.milestone", inApp: true, push: false },
      { type: "timer.activity", inApp: true, push: false },
      { type: "team.digest", inApp: true, push: false },
      { type: "member.alert", inApp: true, push: true },
    ],
    delivery: {
      timezone: "America/New_York",
      quietHoursStart: "22:00",
      quietHoursEnd: "08:00",
      focusUntil: null,
      focusMode: false,
    },
    timezoneDraft: "America/New_York",
    preferencesSaving: false,
    markAllReadPending: false,
    pendingActionId: null,
    formatRelativeTime: (iso) => {
      const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
      if (mins < 60) return `${mins}m ago`;
      return `${Math.round(mins / 60)}h ago`;
    },
    notificationSentenceParts: (n) => {
      const actor = n.actorName ?? "Someone";
      switch (n.type) {
        case "task.assigned":
          return { kind: "assigned" as const, actor, taskTitle: n.payload.taskTitle ?? "task" };
        case "task.message":
          return {
            kind: "message" as const,
            actor,
            count: n.payload.messageCount ?? 1,
            taskTitle: n.payload.taskTitle ?? "task",
          };
        case "journey.milestone":
          return {
            kind: "milestone" as const,
            stepLabel: n.payload.journeyStepLabel ?? "Milestone",
            projectName: n.payload.projectName ?? "Project",
          };
        case "timer.activity":
          return {
            kind: "timer" as const,
            actor,
            timerAction: n.payload.timerAction ?? "started",
            taskTitle: n.payload.taskTitle ?? null,
            projectName: n.payload.projectName ?? "Project",
          };
        case "team.digest":
          return {
            kind: "digest" as const,
            hoursLabel: "8h",
            tasksCompleted: n.payload.digestTasksCompleted ?? 8,
          };
        case "member.alert":
          return {
            kind: "memberAlert" as const,
            actor,
            alertTitle: n.payload.alertTitle ?? "Alert",
            notePreview: n.payload.notePreview ?? null,
          };
      }
    },
    notificationPreferenceLabel: (t) => {
      switch (t) {
        case "task.assigned":
          return "Task assignments";
        case "task.message":
          return "Task messages";
        case "journey.milestone":
          return "Milestones";
        case "timer.activity":
          return "Timer activity";
        case "team.digest":
          return "Daily digest";
        case "member.alert":
          return "Profile alerts";
      }
    },
    onMarkAllRead: () => {
      setActionLog("Marked all notifications as read");
    },
    onOpenNotification: (n) => {
      setActionLog(`Opened notification "${n.type}" (id: ${n.id})`);
    },
    onPrimaryAction: (n) => {
      setActionLog(`Primary action on "${n.type}" (id: ${n.id})`);
    },
    onDismissNotification: (n) => {
      setActionLog(`Dismissed notification (id: ${n.id})`);
    },
    onStartTimer: (n) => {
      setActionLog(`Started timer on "${n.payload.projectName}"`);
    },
    onEnablePush: () => {
      setActionLog("Enabled push notifications");
    },
    onDismissPushPrompt: () => {
      setActionLog("Dismissed push prompt");
    },
    onTogglePreferenceChannel: (pref, channel) => {
      setActionLog(`Toggled ${pref.type} channel ${channel}`);
    },
    onSetFocusMode: (active) => {
      setActionLog(`Focus mode set to ${active}`);
    },
    onSetQuietHours: (start, end) => {
      setActionLog(`Quiet hours set to ${start} - ${end}`);
    },
    onTimezoneDraftChange: () => {},
    onTimezoneCommit: () => {},
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card/60 p-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Agency Notifications Popover</h3>
          <p className="text-xs text-muted-foreground">
            Click the bell button to test the popover inbox modal with live actions and settings.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Badge count:</Label>
            <div className="flex items-center gap-1">
              {[0, 1, 3, 12].map((num) => (
                <Button
                  key={num}
                  type="button"
                  variant={badgeCount === num ? "default" : "outline"}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setBadgeCount(num)}
                >
                  {num}
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-full border border-sidebar-border bg-sidebar p-1">
            <AgencyNotificationsView view={mockInboxView} />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Action event:</span> {actionLog}
      </div>

      {/* Row Types Preview */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          All Notification Sentence Types
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <UserCheck className="size-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Task Assigned</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Sarah Chen</span> assigned you{" "}
                <span className="font-medium text-foreground">Mobile Nav Polish</span>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <MessageSquare className="size-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Discussion Messages</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Alex Rivera</span> sent 3 messages in{" "}
                <span className="font-medium text-foreground">Design Tokens</span>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <CheckCircle2 className="size-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Milestone Completed</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Sprint 3 Kickoff</span> completed on{" "}
                Acme Rebrand
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Clock className="size-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Timer Activity</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Elena</span> started tracking on{" "}
                <span className="font-medium text-foreground">Hero Illustration</span>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Layers className="size-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Team Daily Digest</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Your team logged <span className="font-medium text-foreground">36.5h</span>{" "}
                yesterday, 12 tasks completed
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-3">
            <div className="rounded-lg bg-destructive/10 p-2 text-destructive">
              <Flame className="size-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Member Capacity Alert</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Lead</span> sent{" "}
                <span className="font-medium text-foreground">Pace drift</span>: Daily pace below
                target
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Alert Plate Glyphs Matrix Section
// --------------------------------------------------------------------------

function AlertPlateGlyphsSection() {
  const kinds: AlertPlateKind[] = [
    "abnormal_day",
    "month_pace",
    "quarter_pace",
    "waste_spike",
    "custom",
  ];
  const ratios = [0.2, 0.5, 0.85];

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Visual glyphs rendered inside warning/danger instrument plates. Each glyph visualizes metric
        severity and ratios.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kinds.map((k) => (
          <div
            key={k}
            className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card/70 p-4 text-center"
          >
            <span className="font-mono text-xs font-semibold text-foreground">{k}</span>

            <div className="flex flex-col gap-2.5">
              {ratios.map((r) => (
                <div key={r} className="flex items-center gap-3">
                  <span className="w-9 text-right font-mono text-[10px] text-muted-foreground">
                    {Math.round(r * 100)}%
                  </span>
                  <div
                    className={cn(
                      "inline-flex h-8 w-14 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar p-1",
                      instrumentPlateInkClass(
                        k === "abnormal_day" || k === "waste_spike" ? "danger" : "warning",
                      ),
                    )}
                  >
                    <AlertPlateGlyph kind={k} ratio={r} className="h-full w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Real Data Mode
// --------------------------------------------------------------------------

function DevNotificationsRealGallery({ teamId }: { teamId: string }) {
  const { user } = useDevRealTeams();
  const utcOffsetMinutes = new Date().getTimezoneOffset();

  const alertsQuery = useQuery({
    ...orpc.agencyOps.memberProfile.alerts.list.queryOptions({
      input: { teamId, userId: user?.id ?? "", utcOffsetMinutes },
    }),
    enabled: Boolean(teamId && user?.id),
  });

  const notificationsQuery = useAgencyNotificationsQuery(teamId, Boolean(teamId));
  const unreadQuery = useAgencyNotificationUnreadCountQuery(teamId);

  const alertItems = alertsQuery.data?.items ?? [];
  const notifItems = notificationsQuery.data?.items ?? [];

  return (
    <div className="space-y-8">
      {/* Live Containers in Realistic Sidebar Rail */}
      <DevSectionCard
        title="Live Sidebar Rail Containers"
        subtitle="Connected directly to your backend ORPC queries for the active team."
        badge="LIVE ORPC"
      >
        <div className="flex flex-wrap items-start gap-6">
          <RailCardFrame label="FeaturedRailAlertsContainer">
            <FeaturedRailAlertsContainer />
            {alertItems.length === 0 && !alertsQuery.isPending ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No active alerts on team.
              </div>
            ) : null}
          </RailCardFrame>

          <RailCardFrame label="FeaturedRailNotificationContainer">
            <FeaturedRailNotificationContainer />
            {notifItems.length === 0 && !notificationsQuery.isPending ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No active notifications on team.
              </div>
            ) : null}
          </RailCardFrame>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">
              AgencyNotificationsContainer (Bell)
            </span>
            <div className="rounded-full border border-sidebar-border bg-sidebar p-1">
              <AgencyNotificationsContainer teamId={teamId} />
            </div>
          </div>
        </div>
      </DevSectionCard>

      {/* Raw ORPC Backend Queries Inspector */}
      <DevSectionCard
        title="Active ORPC Query Responses"
        subtitle="Inspect live data returned by notifications and alerts endpoints."
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Alerts query */}
          <div className="space-y-2 rounded-xl border border-border bg-background/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground">
                memberProfile.alerts.list
              </span>
              <span className="rounded-full bg-muted/30 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                {alertItems.length} alerts
              </span>
            </div>
            <pre className="max-h-60 overflow-auto rounded-lg bg-sidebar p-3 font-mono text-[11px] text-sidebar-foreground">
              {alertsQuery.isPending
                ? "Loading alerts query..."
                : JSON.stringify(alertItems, null, 2)}
            </pre>
          </div>

          {/* Notifications query */}
          <div className="space-y-2 rounded-xl border border-border bg-background/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground">
                notifications.list & unreadCount
              </span>
              <span className="rounded-full bg-muted/30 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                {notifItems.length} items (unread: {unreadQuery.data?.count ?? 0})
              </span>
            </div>
            <pre className="max-h-60 overflow-auto rounded-lg bg-sidebar p-3 font-mono text-[11px] text-sidebar-foreground">
              {notificationsQuery.isPending
                ? "Loading notifications query..."
                : JSON.stringify(
                    {
                      unreadCount: unreadQuery.data?.count ?? 0,
                      actionCount: unreadQuery.data?.actionCount ?? 0,
                      items: notifItems,
                    },
                    null,
                    2,
                  )}
            </pre>
          </div>
        </div>
      </DevSectionCard>
    </div>
  );
}

// --------------------------------------------------------------------------
// Main Page Component
// --------------------------------------------------------------------------

export function DevNotificationsPage() {
  const [mode, setMode] = useState<"sample" | "real">("sample");
  const { teams } = useDevRealTeams();
  const selectedTeamId = useTeamStore((s) => s.selectedTeamId);
  const setSelectedTeamId = useTeamStore((s) => s.setSelectedTeamId);
  const teamId = selectedTeamId || teams[0]?.id || "";

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      {/* Top Header & Dev Navigation Switcher */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary uppercase">
              DEV BENCHMARK
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Notifications & Alerts
            </h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Developer workbench for testing sidebar rail alerts (
            <code className="font-mono text-xs text-foreground">FeaturedRailAlertsView</code>
            ), featured rail notification cards (
            <code className="font-mono text-xs text-foreground">FeaturedRailNotificationView</code>
            ), and the agency inbox popover (
            <code className="font-mono text-xs text-foreground">AgencyNotificationsView</code>
            ).
          </p>
        </div>

        {/* Quick Links between dev pages & app */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
            <a href="/dev/dialogs">
              <Layers className="mr-1.5 size-3.5" />
              Dialogs
            </a>
          </Button>
          <Button variant="default" size="sm" className="h-8 text-xs" asChild>
            <a href="/dev/notifications">
              <Bell className="mr-1.5 size-3.5" />
              Notifications
            </a>
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
            <a href="/agency">
              Tracker
              <ArrowRight className="ml-1.5 size-3.5" />
            </a>
          </Button>
        </div>
      </div>

      {/* Mode Switcher & Team Controls */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={mode} onValueChange={(value) => setMode(value as "sample" | "real")}>
          <TabsList>
            <TabsTrigger value="sample">Sample mode</TabsTrigger>
            <TabsTrigger value="real">Real data mode</TabsTrigger>
          </TabsList>
        </Tabs>

        {mode === "real" ? (
          <DevRealTeamPicker teamId={teamId} onTeamChange={setSelectedTeamId} />
        ) : null}
      </div>

      {mode === "real" ? <DevRealModeNotice /> : null}

      {/* Body Content */}
      <div className="mt-8 space-y-10">
        {mode === "sample" ? (
          <>
            <DevSectionCard
              title="Featured Rail Card Stack"
              subtitle="Wallet-peek rest, Revolut front card, corner-fan on hover. Click a strip to promote it."
              badge="FeaturedRailCardStackView"
            >
              <FeaturedRailCardStackSection />
            </DevSectionCard>

            <DevSectionCard
              title="Featured Rail Alerts"
              subtitle="Displayed in the app shell rail footer. Highlights abnormal hours, monthly/quarterly pace warnings, waste spikes, or manager notes."
              badge="FeaturedRailAlertsView"
            >
              <FeaturedRailAlertsSection />
            </DevSectionCard>

            <DevSectionCard
              title="Featured Rail Notification Cards"
              subtitle="Displayed alongside rail alerts. Surfaces action-required tasks, message discussions, profile alerts, or available app updates."
              badge="FeaturedRailNotificationView"
            >
              <FeaturedRailNotificationSection />
            </DevSectionCard>

            <DevSectionCard
              title="Agency Notifications Inbox & Row Types"
              subtitle="Full-feature notifications inbox popover with liquid badge counter, category grouping, and user delivery preferences."
              badge="AgencyNotificationsView"
            >
              <NotificationsInboxSection />
            </DevSectionCard>

            <DevSectionCard
              title="Alert Plate Glyphs & Visual Ratios"
              subtitle="Vector glyphs visualizing metric ratios across warning, danger, and info colorways."
              badge="AlertPlateGlyph"
            >
              <AlertPlateGlyphsSection />
            </DevSectionCard>
          </>
        ) : (
          <DevNotificationsRealGallery teamId={teamId} />
        )}
      </div>
    </main>
  );
}
