import { AppShellPage } from "@/features/app-shell/app-shell-page";
import { ShellBootSurface } from "@/features/app-shell/components/shell-boot-surface";
import { useShellBootGate } from "@/features/app-shell/shell/use-shell-boot-gate";
import { useBillingSuccess } from "@/features/billing/hooks/use-billing-success";
import { BillingSuccessView } from "@/features/billing/views/billing-success-view";
import { useTeamStore } from "@/features/team/team-store";
import { useSearchParams } from "@/lib/navigation";

export function BillingSuccessPage() {
  const [searchParams] = useSearchParams();
  const selectedTeamId = useTeamStore((s) => s.selectedTeamId);
  const checkoutId = searchParams.get("checkout_id") ?? undefined;
  const { status, errorMessage, openPortal } = useBillingSuccess(selectedTeamId, checkoutId);
  const { isBooting } = useShellBootGate(status === "confirming");

  return (
    <AppShellPage>
      <ShellBootSurface booting={isBooting} label="Confirming billing">
        <BillingSuccessView
          status={status}
          errorMessage={errorMessage}
          onOpenPortal={() => void openPortal()}
        />
      </ShellBootSurface>
    </AppShellPage>
  );
}
