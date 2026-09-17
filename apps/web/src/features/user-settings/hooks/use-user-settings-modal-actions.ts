import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@/lib/navigation";
import { toast } from "sonner";

import { useBilling } from "@/features/billing/billing-queries";
import {
  useAgencyNotificationPreferencesQuery,
  useSetNotificationPreferencesMutation,
  type NotificationPreferenceItem,
  type NotificationPreferenceType,
} from "@/features/notifications/notifications-queries";
import { useTeamStore } from "@/features/team/team-store";
import { resetAuthenticatedClientState } from "@/lib/authenticated-client-reset";
import { authClient } from "@/lib/auth-client";
import { getServerUrl } from "@/lib/env";
import { getUserAvatarPublicUrl } from "@/lib/user-avatar-url";
import { getErrorMessage } from "@/lib/utils/get-error-message";

import { useUserSettingsModalState, type UserSettingsPane } from "./use-user-settings-modal-state";

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
  const { tier, isPro, checkout, openPortal } = useBilling(teamId);
  const preferencesQuery = useAgencyNotificationPreferencesQuery(
    teamId,
    input.open && Boolean(teamId),
  );
  const setPreferencesMutation = useSetNotificationPreferencesMutation(teamId);
  const state = useUserSettingsModalState();

  const user = session.data?.user;
  const userName = user?.name?.trim() || "Workspace";
  const userEmail = user?.email?.trim() ?? "";
  const serverUrl = getServerUrl();
  const avatarUrl =
    user?.image && user.id && serverUrl
      ? getUserAvatarPublicUrl({
          baseUrl: serverUrl,
          userId: user.id,
          storageKey: user.image,
        })
      : null;

  useEffect(() => {
    if (input.open && user) {
      state.setNameDraft(user.name?.trim() || "");
      state.setNameDirty(false);
    }
    // Sync draft when the modal opens; ignore setter identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open/user sync
  }, [input.open, user?.id, user?.name]);

  async function saveName() {
    if (!user || !state.nameDraft.trim() || !state.nameDirty) return;
    state.setSavingName(true);
    try {
      await authClient.updateUser({ name: state.nameDraft.trim() });
      state.setNameDirty(false);
      toast.success("Name updated");
    } catch (error) {
      toast.error("Couldn't update name", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      state.setSavingName(false);
    }
  }

  async function uploadImage(file: File) {
    if (!user) return;

    state.setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${serverUrl}/uploads/user-avatar`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const err = (await response.json().catch(() => ({ error: "Upload failed" }))) as {
          error?: string;
        };
        toast.error("Couldn't update avatar", {
          description: err.error ?? "Try again.",
        });
        return;
      }

      const { storageKey } = (await response.json()) as { storageKey: string };
      await authClient.updateUser({ image: storageKey });
      toast.success("Avatar updated");
    } catch (error) {
      toast.error("Couldn't update avatar", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      state.setUploadingImage(false);
    }
  }

  function pickImage() {
    if (!user) return;
    const inputEl = document.createElement("input");
    inputEl.type = "file";
    inputEl.accept = "image/*";
    inputEl.addEventListener("change", () => {
      const file = inputEl.files?.[0];
      if (file) void uploadImage(file);
    });
    inputEl.click();
  }

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

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      state.setPane("preferences");
      state.setNameDraft("");
      state.setNameDirty(false);
    }
    input.onOpenChange(nextOpen);
  }

  function handleNameDraftChange(value: string) {
    state.setNameDraft(value);
    state.setNameDirty(value !== (user?.name?.trim() || ""));
  }

  function handlePaneChange(pane: UserSettingsPane) {
    state.setPane(pane);
  }

  function handleBillingAction() {
    void (isPro ? openPortal() : checkout());
  }

  function togglePreferenceChannel(pref: NotificationPreferenceItem, channel: "inApp" | "push") {
    if (!teamId || setPreferencesMutation.isPending) return;
    void setPreferencesMutation.mutateAsync([{ ...pref, [channel]: !pref[channel] }]);
  }

  return {
    open: input.open,
    userId: user?.id ?? null,
    userName,
    userEmail,
    avatarUrl,
    pane: state.pane,
    nameDraft: state.nameDraft,
    nameDirty: state.nameDirty,
    savingName: state.savingName,
    uploadingImage: state.uploadingImage,
    signingOut: state.signingOut,
    tier,
    isPro,
    hasTeam: Boolean(teamId),
    notificationPreferences: (preferencesQuery.data?.items ?? []) as NotificationPreferenceItem[],
    notificationPreferencesLoading: preferencesQuery.isPending && !preferencesQuery.data,
    notificationPreferencesSaving: setPreferencesMutation.isPending,
    onOpenChange: handleOpenChange,
    onPaneChange: handlePaneChange,
    onNameDraftChange: handleNameDraftChange,
    onSaveName: () => void saveName(),
    onPickImage: pickImage,
    onBillingAction: handleBillingAction,
    onSignOut: () => void signOut(),
    onTogglePreferenceChannel: togglePreferenceChannel,
  };
}

export type UserSettingsModalViewModel = ReturnType<typeof useUserSettingsModalActions>;
