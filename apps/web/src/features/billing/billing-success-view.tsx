import { AlertCircle, CheckCircle } from "lucide-react";
import type { AgencyPlan } from "@orch/workspace/tiers";
import { Link } from "@/lib/navigation";

import { shellConfirmInClass, shellStaggerItemClass } from "@/features/app-shell/app-shell-ui";
import {
  billingCreditsAddedCopy,
  billingSuccessWithoutCheckoutCopy,
} from "@/features/billing/billing-success-copy";
import type { BillingSuccessStatus } from "@/features/billing/billing-success-readiness";
import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";

export type BillingSuccessViewProps = {
  status: BillingSuccessStatus;
  errorMessage: string;
  plan: AgencyPlan;
  creditsPlan?: AgencyPlan;
  onOpenPortal: () => void;
};

export function BillingSuccessView({
  status,
  errorMessage,
  plan,
  creditsPlan,
  onOpenPortal,
}: BillingSuccessViewProps) {
  const isError = status === "error";
  const isAgencyActive = status === "agency_active";
  const isCreditsAdded = status === "credits_added";
  const isIdle = status === "idle";
  const isConfirming = status === "confirming";

  const idleCopy = billingSuccessWithoutCheckoutCopy(plan);
  const creditsCopy = billingCreditsAddedCopy(creditsPlan ?? plan);

  const title = isError
    ? "Billing confirmation failed"
    : isCreditsAdded
      ? creditsCopy.title
      : isAgencyActive
        ? "Agency is active"
        : isIdle
          ? idleCopy.title
          : "Confirming billing";

  const body = isError
    ? errorMessage
    : isCreditsAdded
      ? creditsCopy.body
      : isAgencyActive
        ? "This team can use Tracker, projects, money, and people."
        : isIdle
          ? idleCopy.body
          : isConfirming
            ? "Hang on while we apply your checkout to this team."
            : "";

  const actionCopy = isCreditsAdded ? creditsCopy : isIdle ? idleCopy : null;

  return (
    <div className="flex h-full items-start justify-center overflow-y-auto bg-default px-4 pt-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md px-6 text-center">
        <div
          className={cn(
            "mx-auto mb-6 flex size-16 items-center justify-center rounded-full",
            isError ? "bg-destructive/10" : "bg-primary/10",
            shellConfirmInClass,
          )}
        >
          {isError ? (
            <AlertCircle className="size-8 text-destructive" />
          ) : (
            <CheckCircle className="size-8 text-primary" />
          )}
        </div>

        <h1 className="mb-2 text-2xl font-bold text-highlighted">{title}</h1>
        <p className="mb-8 text-muted">{body}</p>

        {isAgencyActive ? (
          <div className="flex flex-col gap-3">
            <Button asChild size="lg">
              <Link to="/agency">Open Tracker</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className={shellStaggerItemClass}
              style={{ "--stagger-i": 1 } as React.CSSProperties}
              onClick={onOpenPortal}
            >
              Manage billing
            </Button>
          </div>
        ) : null}

        {actionCopy ? (
          <div className="flex flex-col gap-3">
            <Button asChild size="lg">
              <Link to={actionCopy.primaryHref}>{actionCopy.primary}</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className={shellStaggerItemClass}
              style={{ "--stagger-i": 1 } as React.CSSProperties}
              onClick={onOpenPortal}
            >
              {actionCopy.secondary}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
