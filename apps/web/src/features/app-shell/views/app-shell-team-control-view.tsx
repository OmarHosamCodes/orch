import type { AppShellTeamHubViewModel } from "@/features/app-shell/hooks/use-app-shell-team-hub";
import { AppShellTeamHubView } from "@/features/app-shell/views/app-shell-team-hub-view";
import { Skeleton } from "@/ui/skeleton";
import { cn } from "@/lib/utils";
import { TeamCreateAgencyDialogView } from "@/features/team/views/team-create-agency-dialog-view";
import { TeamSettingsModalView } from "@/features/team/views/team-settings-modal-view";

type AppShellTeamControlViewProps = {
  viewModel: AppShellTeamHubViewModel;
  className?: string;
  variant?: "compact" | "sidebar";
};

export function AppShellTeamControlView({
  viewModel,
  className,
  variant = "compact",
}: AppShellTeamControlViewProps) {
  return (
    <>
      <AppShellTeamHubView viewModel={viewModel} className={className} variant={variant} />

      <TeamCreateAgencyDialogView
        open={viewModel.createOpen}
        step={viewModel.createStep}
        stepDirection={viewModel.createStepDirection}
        name={viewModel.createName}
        pending={viewModel.createTeamPending}
        errorMessage={viewModel.createError}
        presetId={viewModel.createPresetId}
        logoPreviewUrl={viewModel.createLogoPreviewUrl}
        you={viewModel.createYou}
        inviteInputId={viewModel.createInviteInputId}
        invites={viewModel.createInvites}
        inviteEmail={viewModel.createInviteEmail}
        inviteRole={viewModel.createInviteRole}
        currency={viewModel.createCurrency}
        onOpenChange={viewModel.onCreateOpenChange}
        onNameChange={viewModel.onCreateNameChange}
        onStepChange={viewModel.onCreateStepChange}
        onPresetChange={viewModel.onCreatePresetChange}
        onPickLogo={viewModel.onPickCreateLogo}
        onClearLogo={viewModel.onClearCreateLogo}
        onInviteEmailChange={viewModel.onCreateInviteEmailChange}
        onInviteRoleChange={viewModel.onCreateInviteRoleChange}
        onAddInvite={viewModel.onAddCreateInvite}
        onRemoveInvite={viewModel.onRemoveCreateInvite}
        onCurrencyChange={viewModel.onCreateCurrencyChange}
        onSubmit={viewModel.onSubmitCreateAgency}
      />

      <TeamSettingsModalView viewModel={viewModel.teamSettingsViewModel} />
    </>
  );
}

export function AppShellTeamControlSkeleton({
  className,
  variant = "compact",
}: {
  className?: string;
  variant?: "compact" | "sidebar";
}) {
  return variant === "sidebar" ? (
    <Skeleton className={cn("h-[3.625rem] w-full rounded-[0.875rem]", className)} />
  ) : (
    <Skeleton className={cn("size-8 rounded-full", className)} />
  );
}
