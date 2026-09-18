import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { useNavigate } from "@/lib/navigation";

import {
  useAgencyNotificationPreferencesQuery,
  useSetNotificationPreferencesMutation,
  type NotificationPreferenceItem,
  type NotificationPreferenceType,
} from "@/features/notifications/notifications-queries";
import { useTeamStore } from "@/features/team/team-store";
import { useTrackerStopCelebration } from "@/features/time-tracking/tracker-stop-celebration";
import { resetAuthenticatedClientState } from "@/lib/authenticated-client-reset";
import { authClient } from "@/lib/auth-client";
import { getErrorMessage } from "@/lib/utils/get-error-message";

import { useUserSettingsModalState } from "./use-user-settings-modal-state";

export type { NotificationPreferenceItem, NotificationPreferenceType };

export type UserSettingsModalInput = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function useUserSettingsModalActions(input: UserSettingsModalInput) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const router = useRouter();
  const session = authClient.useSession();
  const teamId = useTeamStore((s) => s.selectedTeamId) ?? "";
  const preferencesQuery = useAgencyNotificationPreferencesQuery(
    teamId,
    input.open && Boolean(teamId),
  );
  const setPreferencesMutation = useSetNotificationPreferencesMutation(teamId);
  const { celebrationEnabled, setCelebrationEnabled } = useTrackerStopCelebration();
  const state = useUserSettingsModalState();

  const user = session.data?.user;

  async function signOut() {
    state.setSigningOut(true);
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            resetAuthenticatedClientState({ queryClient, router });
            toast.success("Signed out successfully");
            input.onOpenChange(false);
            navigate("/", { replace: true });
          },
          onError: (error) => {
            toast.error("Sign out failed", {
              description: error.error?.message ?? "Unknown error",
            });
          },
        },
      });
    } catch (error) {
      toast.error("An unexpected error occurred during sign out", {
        description: getErrorMessage(error, "Please try again."),
      });
    } finally {
      state.setSigningOut(false);
    }
  }

  function togglePreferenceChannel(pref: NotificationPreferenceItem, channel: "inApp" | "push") {
    if (!teamId || setPreferencesMutation.isPending) return;
    void setPreferencesMutation.mutateAsync([{ ...pref, [channel]: !pref[channel] }]);
  }

  return {
    open: input.open,
    userId: user?.id ?? null,
    signingOut: state.signingOut,
    hasTeam: Boolean(teamId),
    notificationPreferences: (preferencesQuery.data?.items ?? []) as NotificationPreferenceItem[],
    notificationPreferencesLoading: preferencesQuery.isPending && !preferencesQuery.data,
    notificationPreferencesSaving: setPreferencesMutation.isPending,
    celebrationEnabled,
    onToggleCelebration: setCelebrationEnabled,
    onOpenChange: input.onOpenChange,
    onSignOut: () => void signOut(),
    onTogglePreferenceChannel: togglePreferenceChannel,
  };
}

export type UserSettingsModalViewModel = ReturnType<typeof useUserSettingsModalActions>;
