import {
  Bell,
  CalendarClock,
  Loader2,
  MessageSquare,
  Sparkles,
  Timer,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type {
  NotificationPreferenceItem,
  NotificationPreferenceType,
} from "@/features/user-settings/hooks/use-user-settings-modal-actions";
import { AgencySettingsPaneSection } from "@/features/shared/views/agency-settings-pane-section";
import { cn } from "@/lib/utils";
import { Label } from "@/ui/label";
import { SurfaceShimmer } from "@/ui/skeleton";
import { Switch } from "@/ui/switch";

const NOTIFICATION_TYPE_META: Record<
  NotificationPreferenceType,
  { label: string; description: string; icon: LucideIcon }
> = {
  "task.assigned": {
    label: "Task assignments",
    description: "When someone assigns you a task on the team.",
    icon: Bell,
  },
  "task.message": {
    label: "Task messages",
    description: "New messages on tasks you are assigned to.",
    icon: MessageSquare,
  },
  "journey.milestone": {
    label: "Milestones",
    description: "Journey milestones and status changes.",
    icon: Sparkles,
  },
  "timer.activity": {
    label: "Timer activity",
    description: "When teammates start or stop shared timers.",
    icon: Timer,
  },
  "team.digest": {
    label: "Daily digest",
    description: "A once-a-day summary for the agency.",
    icon: CalendarClock,
  },
  "member.alert": {
    label: "Profile alerts",
    description: "HR and pace alerts on member profiles you manage.",
    icon: UserRound,
  },
};

function preferenceMeta(type: NotificationPreferenceType) {
  return NOTIFICATION_TYPE_META[type];
}

type UserSettingsNotificationsPaneViewProps = {
  hasTeam: boolean;
  celebrationEnabled: boolean;
  notificationPreferences: NotificationPreferenceItem[];
  notificationPreferencesLoading: boolean;
  notificationPreferencesSaving: boolean;
  onToggleCelebration: (enabled: boolean) => void;
  onTogglePreferenceChannel: (
    pref: NotificationPreferenceItem,
    channel: "inApp" | "push",
  ) => void;
};

function NotificationChannelHeader() {
  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] items-end gap-x-3 border-b border-border pb-2"
      aria-hidden="true"
    >
      <span />
      <span className="text-center text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        In-app
      </span>
      <span className="text-center text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        Push
      </span>
    </div>
  );
}

function NotificationPreferenceRow({
  pref,
  disabled,
  onToggleChannel,
}: {
  pref: NotificationPreferenceItem;
  disabled: boolean;
  onToggleChannel: (channel: "inApp" | "push") => void;
}) {
  const meta = preferenceMeta(pref.type);
  const Icon = meta.icon;
  const inAppId = `notif-${pref.type}-in-app`;
  const pushId = `notif-${pref.type}-push`;

  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] items-center gap-x-3 border-b border-border py-3.5 last:border-b-0"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground"
          aria-hidden="true"
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{meta.label}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{meta.description}</p>
        </div>
      </div>
      <div className="flex justify-center">
        <Switch
          id={inAppId}
          checked={pref.inApp}
          disabled={disabled}
          aria-label={`${meta.label}, in-app`}
          onCheckedChange={() => onToggleChannel("inApp")}
        />
      </div>
      <div className="flex justify-center">
        <Switch
          id={pushId}
          checked={pref.push}
          disabled={disabled}
          aria-label={`${meta.label}, push`}
          onCheckedChange={() => onToggleChannel("push")}
        />
      </div>
    </div>
  );
}

export function UserSettingsNotificationsPaneView({
  hasTeam,
  celebrationEnabled,
  notificationPreferences,
  notificationPreferencesLoading,
  notificationPreferencesSaving,
  onToggleCelebration,
  onTogglePreferenceChannel,
}: UserSettingsNotificationsPaneViewProps) {
  const saving = notificationPreferencesSaving;

  return (
    <div className="space-y-8">
      <AgencySettingsPaneSection
        title="Tracker"
        description="Small moments on the time surface."
        className="border-t-0 pt-0"
      >
        <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/25 px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <Label htmlFor="tracker-stop-celebration" className="text-sm font-medium text-foreground">
              Celebrate each logged session
            </Label>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              A short burst from the Stop button when you save timer time.
            </p>
          </div>
          <Switch
            id="tracker-stop-celebration"
            checked={celebrationEnabled}
            aria-label="Celebrate each logged session"
            onCheckedChange={(checked) => onToggleCelebration(checked)}
          />
        </div>
      </AgencySettingsPaneSection>

      <AgencySettingsPaneSection
        title="Agency alerts"
        description="Per-channel delivery for the selected agency."
      >
        {!hasTeam ? (
          <p className="text-sm text-muted-foreground">
            Select an agency to manage notification preferences.
          </p>
        ) : notificationPreferencesLoading ? (
          <SurfaceShimmer className="min-h-44" label="Loading notification preferences" />
        ) : notificationPreferences.length === 0 ? (
          <p className="text-sm text-muted-foreground">No preference types available yet.</p>
        ) : (
          <div className={cn(saving && "pointer-events-none opacity-70")}>
            <NotificationChannelHeader />
            {notificationPreferences.map((pref) => (
              <NotificationPreferenceRow
                key={pref.type}
                pref={pref}
                disabled={saving}
                onToggleChannel={(channel) => onTogglePreferenceChannel(pref, channel)}
              />
            ))}
            {saving ? (
              <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                Saving…
              </p>
            ) : null}
          </div>
        )}
      </AgencySettingsPaneSection>
    </div>
  );
}
