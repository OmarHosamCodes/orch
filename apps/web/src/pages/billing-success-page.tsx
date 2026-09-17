import { CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "@/lib/navigation";

import { AppShellPage } from "@/features/app-shell/app-shell-page";
import { ShellBootSurface } from "@/features/app-shell/components/shell-boot-surface";
import { useShellBootGate } from "@/features/app-shell/shell/use-shell-boot-gate";
import { useBilling } from "@/features/billing/billing-queries";
import { useTeamStore } from "@/features/team/team-store";
import { orpcClient } from "@/lib/orpc";
import { Button } from "@/ui/button";
import { shellConfirmInClass, shellStaggerItemClass } from "@/features/app-shell/app-shell-ui";
import { cn } from "@/lib/utils";

export function BillingSuccessPage() {
  const [searchParams] = useSearchParams();
  const selectedTeamId = useTeamStore((s) => s.selectedTeamId);
  const { refreshBillingState, billingQuery, openPortal } = useBilling(selectedTeamId);
  const [confirmingCheckout, setConfirmingCheckout] = useState(false);
  const { isBooting } = useShellBootGate(!billingQuery.isPending && !confirmingCheckout);

  const checkoutId = searchParams.get("checkout_id") ?? undefined;

  useEffect(() => {
    refreshBillingState();
  }, [refreshBillingState]);

  useEffect(() => {
    if (!checkoutId || !selectedTeamId) {
      return;
    }

    let cancelled = false;
    setConfirmingCheckout(true);

    void (async () => {
      try {
        await orpcClient.billing.confirmCheckout({
          teamId: selectedTeamId,
          checkoutId,
        });
      } finally {
        if (!cancelled) {
          refreshBillingState();
          setConfirmingCheckout(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [checkoutId, refreshBillingState, selectedTeamId]);

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

            <h1 className="mb-2 text-2xl font-bold text-highlighted">Agency is active</h1>
            <p className="mb-8 text-muted">
              This team can use Tracker, projects, money, and people.
            </p>

            <div className="flex flex-col gap-3">
              <Button asChild size="lg">
                <Link to="/agency">Open Tracker</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className={shellStaggerItemClass}
                style={{ "--stagger-i": 1 } as React.CSSProperties}
                onClick={() => void openPortal()}
              >
                Manage billing
              </Button>
            </div>
          </div>
        </div>
      </ShellBootSurface>
    </AppShellPage>
  );
}
