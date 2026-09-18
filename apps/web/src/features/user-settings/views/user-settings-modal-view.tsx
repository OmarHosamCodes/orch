import { Loader2, LogOut } from "lucide-react";

import { AgencySettingsDialogShell } from "@/features/shared/agency-settings-dialog-shell";
import type {
  NotificationPreferenceItem,
  NotificationPreferenceType,
  UserSettingsModalViewModel,
} from "@/features/user-settings/hooks/use-user-settings-modal-actions";
import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";
import { Label } from "@/ui/label";
import { SurfaceShimmer } from "@/ui/skeleton";

type UserSettingsModalViewProps = {
  viewModel: UserSettingsModalViewModel;
};

const NOTIFICATION_TYPE_LABELS: Record<NotificationPreferenceType, string> = {
  "task.assigned": "Task assignments",
  "task.message": "Task messages",
  "journey.milestone": "Milestones",
  "timer.activity": "Timer activity",
  "team.digest": "Daily digest",
  "member.alert": "Profile alerts",
};

function preferenceLabel(type: NotificationPreferenceType) {
  return NOTIFICATION_TYPE_LABELS[type];
}

export function UserSettingsModalView({ viewModel }: UserSettingsModalViewProps) {
  const {
    open,
    userId,
    signingOut,
    hasTeam,
    notificationPreferences,
    notificationPreferencesLoading,
    notificationPreferencesSaving,
    celebrationEnabled,
    onToggleCelebration,
    onOpenChange,
    onSignOut,
    onTogglePreferenceChannel,
  } = viewModel;

  if (!userId) return null;

  return (
    <AgencySettingsDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Settings"
      description="Notification preferences for the selected agency."
      pane="preferences"
      onPaneChange={() => {}}
      navItems={[]}
      paneTitle="Notifications"
      hideNav
      maxWidthClassName="sm:max-w-lg"
    >
      <div className="mt-6 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-3">
          <div className="min-w-0">
            <Label htmlFor="tracker-stop-celebration" className="text-sm font-medium text-foreground">
              Celebrate each logged session
            </Label>
            <p className="text-xs text-muted-foreground">
              A short burst from the Stop button when you save timer time.
            </p>
          </div>
          <Checkbox
            id="tracker-stop-celebration"
            checked={celebrationEnabled}
            onCheckedChange={(checked) => onToggleCelebration(checked === true)}
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Choose which alerts you receive for the selected agency.
          </p>
        </div>

        {!hasTeam ? (
          <p className="text-sm text-muted-foreground">
            Select an agency to manage notification preferences.
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
                <p className="text-sm font-medium text-foreground">{preferenceLabel(pref.type)}</p>
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

        <div className="mt-8 border-t border-border pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={signingOut}
            onClick={onSignOut}
          >
            {signingOut ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}
            Sign out
          </Button>
        </div>
      </div>
    </AgencySettingsDialogShell>
  );
}
