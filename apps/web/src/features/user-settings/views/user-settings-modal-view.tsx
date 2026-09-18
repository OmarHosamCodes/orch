import { Loader2, LogOut } from "lucide-react";

import { AgencySettingsDialogShell } from "@/features/shared/agency-settings-dialog-shell";
import type { UserSettingsModalViewModel } from "@/features/user-settings/hooks/use-user-settings-modal-actions";
import { UserSettingsNotificationsPaneView } from "@/features/user-settings/views/user-settings-notifications-pane-view";
import { Button } from "@/ui/button";

type UserSettingsModalViewProps = {
  viewModel: UserSettingsModalViewModel;
};

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
      paneDescription="Control in-app and push alerts for this agency, plus tracker feedback."
      hideNav
      maxWidthClassName="sm:max-w-xl"
    >
      <UserSettingsNotificationsPaneView
        hasTeam={hasTeam}
        celebrationEnabled={celebrationEnabled}
        notificationPreferences={notificationPreferences}
        notificationPreferencesLoading={notificationPreferencesLoading}
        notificationPreferencesSaving={notificationPreferencesSaving}
        onToggleCelebration={onToggleCelebration}
        onTogglePreferenceChannel={onTogglePreferenceChannel}
      />

      <div className="mt-10 border-t border-border pt-5">
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
    </AgencySettingsDialogShell>
  );
}
