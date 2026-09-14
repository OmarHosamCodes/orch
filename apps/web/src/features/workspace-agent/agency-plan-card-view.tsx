import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";

type AgencyPlanCardViewModel = {
  planId: string;
  title: string;
  summary: string;
  steps: Array<{ label: string }>;
};

type AgencyPlanCardViewProps = {
  plan: AgencyPlanCardViewModel;
  confirming: boolean;
  onConfirm: () => void;
  className?: string;
  embedded?: boolean;
};

/** Confirm-plan card with a real step list. */
export function AgencyPlanCardView({
  plan,
  confirming,
  onConfirm,
  className,
  embedded = false,
}: AgencyPlanCardViewProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-3 text-card-foreground",
        embedded
          ? "rounded-none border-0 bg-transparent p-0"
          : "max-w-[min(100%,36rem)] rounded-surface bg-card p-surface",
        className,
      )}
    >
      <div>
        <p className="text-sm font-semibold tracking-tight text-foreground">{plan.title}</p>
        {plan.summary.trim() ? (
          <p className="mt-1 max-w-[65ch] text-xs leading-relaxed text-muted-foreground">
            {plan.summary.trim()}
          </p>
        ) : null}
      </div>

      {plan.steps.length > 0 ? (
        <ol className="flex list-decimal flex-col gap-1.5 ps-4 text-xs text-foreground">
          {plan.steps.map((step, index) => (
            <li key={`${plan.planId}-${index}`} className="leading-snug">
              {step.label}
            </li>
          ))}
        </ol>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          className="h-8 min-w-24 rounded-full px-4"
          disabled={confirming}
          onClick={onConfirm}
        >
          {confirming ? "Confirming…" : "Confirm"}
        </Button>
      </div>
    </div>
  );
}
