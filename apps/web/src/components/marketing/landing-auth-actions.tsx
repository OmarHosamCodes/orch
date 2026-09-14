import { ArrowRight } from "lucide-react";
import { Link } from "@/lib/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";

type LandingAuthActionsProps = {
  isAuthenticated: boolean;
  className?: string;
  showPricing?: boolean;
};

export function LandingAuthActions({
  isAuthenticated,
  className,
  showPricing = false,
}: LandingAuthActionsProps) {
  if (isAuthenticated) {
    return (
      <div className={cn("flex flex-wrap items-center gap-3", className)}>
        <Button asChild size="lg" className="h-12 px-6 text-base">
          <Link to="/canvas">
            Open workspace
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        {showPricing ? (
          <Button asChild variant="ghost" size="lg" className="h-12 px-6 text-base">
            <a href="#pricing">See pricing</a>
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <Button asChild size="lg" className="h-12 px-6 text-base">
        <Link to="/login">
          Continue
          <ArrowRight className="size-4" />
        </Link>
      </Button>
      <Button asChild variant="ghost" size="lg" className="h-12 px-6 text-base">
        <Link to="/login">Sign in</Link>
      </Button>
      {showPricing ? (
        <a
          href="#pricing"
          className="text-sm text-[var(--marketing-ink-muted)] underline-offset-4 hover:text-[var(--marketing-ink-foreground)] hover:underline"
        >
          See pricing
        </a>
      ) : null}
    </div>
  );
}
