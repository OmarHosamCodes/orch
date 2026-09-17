import { CheckCircle } from "lucide-react";
import { useEffect } from "react";
import { Link, useSearchParams } from "@/lib/navigation";

import { AppShellPage } from "@/features/app-shell/app-shell-page";
import { ShellBootSurface } from "@/features/app-shell/components/shell-boot-surface";
import { useShellBootGate } from "@/features/app-shell/shell/use-shell-boot-gate";
import { useBilling } from "@/features/billing/billing-queries";
import { useTeamStore } from "@/features/team/team-store";
import { Button } from "@/ui/button";
import { shellConfirmInClass, shellStaggerItemClass } from "@/features/app-shell/app-shell-ui";
import { cn } from "@/lib/utils";

export function BillingSuccessPage() {
  const [searchParams] = useSearchParams();
  const selectedTeamId = useTeamStore((s) => s.selectedTeamId);
  const { refreshBillingState, billingQuery, openPortal } = useBilling(selectedTeamId);
  const { isBooting } = useShellBootGate(!billingQuery.isPending);

  const checkoutId = searchParams.get("checkout_id") ?? undefined;

  useEffect(() => {
    refreshBillingState();
  }, [refreshBillingState]);

  return (
    <AppShellPage>
      <ShellBootSurface booting={isBooting} label="Confirming billing">
        <div className="flex h-full items-start justify-center overflow-y-auto bg-default px-4 pt-12 sm:px-6 lg:px-8">
          <div className="w-full max-w-md px-6 text-center">
            <div
              className={cn(
                "mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-primary/10",
                shellConfirmInClass,
              )}
            >
              <CheckCircle className="size-8 text-primary" />
            </div>

            <h1 className="mb-2 text-2xl font-bold text-highlighted">Pro is active</h1>
            <p className="mb-8 text-muted">
              Your subscription is active and billing has been updated.
            </p>

            {checkoutId ? (
              <p className="mb-6 text-xs text-muted">
                Checkout ID: <span className="font-mono">{checkoutId}</span>
              </p>
            ) : null}

            <div className="flex flex-col gap-3">
              <Button asChild size="lg">
                <Link to="/canvas">Go to Canvas</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className={shellStaggerItemClass}
                style={{ "--stagger-i": 1 } as React.CSSProperties}
                onClick={() => void openPortal()}
              >
                Manage subscription
              </Button>
            </div>
          </div>
        </div>
      </ShellBootSurface>
    </AppShellPage>
  );
}
