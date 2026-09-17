import { useState } from "react";
import { Link } from "@/lib/navigation";

import { Button } from "@/ui/button";
import { useBilling } from "@/features/billing/billing-queries";
import { useTeamStore } from "@/features/team/team-store";

export function AgencyProUpsell() {
  const selectedTeamId = useTeamStore((s) => s.selectedTeamId);
  const { checkout } = useBilling(selectedTeamId);
  const [isLoading, setIsLoading] = useState(false);
  const [upgradeError, setUpgradeError] = useState("");

  async function handleUpgrade() {
    setIsLoading(true);
    setUpgradeError("");
    try {
      await checkout("pro");
    } catch {
      setUpgradeError("Something went wrong. Try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center py-16">
      <div className="w-full max-w-lg px-4 text-center sm:text-left">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Pro plan</p>
        <h2 className="mt-2 text-xl font-bold text-highlighted">Agency tools</h2>
        <p className="mt-3 text-sm text-muted">
          Track time, manage projects and clients, run reports, and handle billing for your team.
          Available on Pro.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          <Button disabled={isLoading} onClick={handleUpgrade}>
            {isLoading ? "Loading…" : "Upgrade to Pro"}
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/#pricing">View pricing</Link>
          </Button>
        </div>

        {upgradeError ? (
          <p className="mt-3 text-[11px] text-error" role="alert">
            {upgradeError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
