import { type ReactNode } from "react";
import { CreditCard, Loader2, LogOut, Settings2 } from "lucide-react";

import { agencyPlanLabel, isPaidAgencyPlan } from "@/features/billing/agency-plan-label";
import { AgencySettingsDialogShell } from "@/features/shared/agency-settings-dialog-shell";
import type {
  NotificationPreferenceItem,
  NotificationPreferenceType,
  UserSettingsModalViewModel,
} from "@/features/user-settings/hooks/use-user-settings-modal-actions";
import type { UserSettingsPane } from "@/features/user-settings/hooks/use-user-settings-modal-state";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Label } from "@/ui/label";
import { SurfaceShimmer } from "@/ui/skeleton";

type UserSettingsModalViewProps = {
  viewModel: UserSettingsModalViewModel;
};

type NavItem = {
  id: UserSettingsPane;
  label: string;
  icon: typeof Settings2;
};

const NOTIFICATION_TYPE_LABELS: Record<NotificationPreferenceType, string> = {
  "task.assigned": "Task assignments",
  "task.message": "Task messages",
  "journey.milestone": "Milestones",
  "timer.activity": "Timer activity",
  "team.digest": "Daily digest",
  "member.alert": "Profile alerts",
};

function SettingsRow({
  label,
  children,
  htmlFor,
  description,
}: {
  label: string;
  children: ReactNode;
  htmlFor?: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-4 last:border-b-0">
      <div className="min-w-0 shrink-0">
        <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
          {label}
        </Label>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">{children}</div>
    </div>
  );
}

const navItems: NavItem[] = [
  { id: "preferences", label: "Preferences", icon: Settings2 },
  { id: "billing", label: "Billing", icon: CreditCard },
];

function preferenceLabel(type: NotificationPreferenceType) {
  return NOTIFICATION_TYPE_LABELS[type];
}

export function UserSettingsModalView({ viewModel }: UserSettingsModalViewProps) {
  const {
    open,
    userId,
    pane,
    signingOut,
    plan,
    hasTeam,
    notificationPreferences,
    notificationPreferencesLoading,
    notificationPreferencesSaving,
    onOpenChange,
    onPaneChange,
    onBillingAction,
    onSignOut,
    onTogglePreferenceChannel,
  } = viewModel;

  if (!userId) return null;

  const activePane = navItems.some((item) => item.id === pane) ? pane : "preferences";

  const paneTitle = activePane === "preferences" ? "Preferences" : "Billing";

  return (
    <AgencySettingsDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Settings"
      description="Manage your preferences and billing."
      pane={activePane}
      onPaneChange={onPaneChange}
      navItems={navItems}
      paneTitle={paneTitle}
      navFooter={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={signingOut}
          onClick={onSignOut}
        >
          {signingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
          Sign out
        </Button>
      }
    >
      {activePane === "preferences" ? (
        <div className="mt-6 flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Choose which alerts you receive for the selected team.
              </p>
            </div>

            {!hasTeam ? (
              <p className="text-sm text-muted-foreground">
                Select a team to manage notification preferences.
              </p>
            ) : notificationPreferencesLoading ? (
              <SurfaceShimmer className="min-h-44" label="Loading notification preferences" />
            ) : notificationPreferences.length === 0 ? (
              <p className="text-sm text-muted-foreground">No preference types available yet.</p>
            ) : (
              notificationPreferences.map((pref: NotificationPreferenceItem) => (
                <div
                  key={pref.type}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {preferenceLabel(pref.type)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      In-app {pref.inApp ? "on" : "off"} · Push {pref.push ? "on" : "off"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={pref.inApp ? "secondary" : "ghost"}
                      className="h-7 rounded-full px-2 text-[11px]"
                      disabled={notificationPreferencesSaving}
                      onClick={() => onTogglePreferenceChannel(pref, "inApp")}
                    >
                      In-app
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={pref.push ? "secondary" : "ghost"}
                      className="h-7 rounded-full px-2 text-[11px]"
                      disabled={notificationPreferencesSaving}
                      onClick={() => onTogglePreferenceChannel(pref, "push")}
                    >
                      Push
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      {activePane === "billing" ? (
        <div className="mt-6 flex flex-col">
          <SettingsRow label="Plan">
            <Badge variant={isPaidAgencyPlan(plan) ? "default" : "secondary"}>
              {agencyPlanLabel(plan)}
            </Badge>
          </SettingsRow>

          <SettingsRow
            label="Subscription"
            description={
              isPaidAgencyPlan(plan)
                ? "Manage billing, invoices, and seats."
                : "Subscribe to keep Tracker, projects, money, and people for this agency."
            }
          >
            <Button type="button" size="sm" onClick={onBillingAction}>
              <CreditCard className="size-4" />
              {isPaidAgencyPlan(plan) ? "Manage billing" : "Subscribe — 1 seat"}
            </Button>
          </SettingsRow>
        </div>
      ) : null}
    </AgencySettingsDialogShell>
  );
}
