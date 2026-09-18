import { AppShellPage } from "@/features/app-shell/app-shell-page";
import { ShellBootSurface } from "@/features/app-shell/components/shell-boot-surface";
import { BillingSuccessView } from "@/features/billing/billing-success-view";
import { useBillingSuccess } from "@/features/billing/hooks/use-billing-success";

export function BillingSuccessContainer() {
  const { status, errorMessage, openPortal, isBooting, plan, creditsPlan } = useBillingSuccess();

  return (
    <AppShellPage>
      <ShellBootSurface booting={isBooting} label="Confirming billing">
        <BillingSuccessView
          status={status}
          errorMessage={errorMessage}
          plan={plan}
          creditsPlan={creditsPlan}
          onOpenPortal={() => void openPortal()}
        />
      </ShellBootSurface>
    </AppShellPage>
  );
}
