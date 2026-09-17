import { AlertCircle, CheckCircle } from "lucide-react";
import { Link } from "@/lib/navigation";

import { shellConfirmInClass, shellStaggerItemClass } from "@/features/app-shell/app-shell-ui";
import type { BillingSuccessStatus } from "@/features/billing/hooks/use-billing-success";
import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";

type BillingSuccessViewProps = {
  status: BillingSuccessStatus;
  errorMessage: string;
  onOpenPortal: () => void;
};

export function BillingSuccessView({ status, errorMessage, onOpenPortal }: BillingSuccessViewProps) {
  const isError = status === "error";
  const isActive = status === "active";

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

        <h1 className="mb-2 text-2xl font-bold text-highlighted">
          {isError
            ? "Billing confirmation failed"
            : isActive
              ? "Agency is active"
              : "Confirming billing"}
        </h1>
        <p className="mb-8 text-muted">
          {isError
            ? errorMessage
            : isActive
              ? "This team can use Tracker, projects, money, and people."
              : "Hang on while we apply your checkout to this team."}
        </p>

        {isActive ? (
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
      </div>
    </div>
  );
}
