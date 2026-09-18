import { Link } from "@/lib/navigation";
import { Button } from "@/ui/button";

import type { AgencyPaywallCopy } from "./agency-paywall-copy";

type AgencyPaywallViewProps = {
  copy: AgencyPaywallCopy;
  isSubmitting: boolean;
  checkoutError: string;
  onSubscribe: () => void;
};

export function AgencyPaywallView({
  copy,
  isSubmitting,
  checkoutError,
  onSubscribe,
}: AgencyPaywallViewProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center py-16">
      <div className="w-full max-w-lg px-4 text-center sm:text-left">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
          {copy.eyebrow}
        </p>
        <h2 className="mt-2 text-xl font-bold text-highlighted">{copy.title}</h2>
        <p className="mt-3 text-sm text-muted">{copy.body}</p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          <Button disabled={isSubmitting} onClick={onSubscribe}>
            {copy.primary}
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/canvas">{copy.secondary}</Link>
          </Button>
        </div>

        {checkoutError ? (
          <p className="mt-3 text-[11px] text-error" role="alert">
            {checkoutError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
