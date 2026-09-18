import { useAppShellTeamHub } from "@/features/app-shell/hooks/use-app-shell-team-hub";
import {
  AppShellTeamControlSkeleton,
  AppShellTeamControlView,
} from "@/features/app-shell/views/app-shell-team-control-view";

type AppShellTeamControlProps = {
  className?: string;
  variant?: "compact" | "sidebar";
};

export function AppShellTeamControlContainer({
  className,
  variant = "compact",
}: AppShellTeamControlProps) {
  const viewModel = useAppShellTeamHub();

  if (!viewModel.authEnabled) {
    return null;
  }

  if (viewModel.listPending) {
    return <AppShellTeamControlSkeleton className={className} variant={variant} />;
  }

  return <AppShellTeamControlView viewModel={viewModel} className={className} variant={variant} />;
}
