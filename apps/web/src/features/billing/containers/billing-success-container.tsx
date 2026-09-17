import { AppShellPage } from "@/features/app-shell/app-shell-page";
import { ShellBootSurface } from "@/features/app-shell/components/shell-boot-surface";
import { BillingSuccessView } from "@/features/billing/billing-success-view";
import { useBillingSuccess } from "@/features/billing/hooks/use-billing-success";

export function BillingSuccessContainer() {
  const { status, errorMessage, openPortal, isBooting } = useBillingSuccess();

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
