import { cn } from "@/lib/utils";

function getProsConsWeightButtonClass(list: "pros" | "cons", currentWeight: number, value: number) {
  const isActive = value <= currentWeight;

  if (list === "pros") {
    return isActive
      ? "border-success bg-success text-primary-foreground"
      : "border-muted bg-background text-toned hover:border-success hover:text-success";
  }

  return isActive
    ? "border-destructive bg-destructive text-destructive-foreground"
    : "border-muted bg-background text-toned hover:border-destructive hover:text-destructive";
}

type ProsConsWeightButtonsProps = {
  list: "pros" | "cons";
  currentWeight: number;
  onWeightChange: (weight: number) => void;
};

export function ProsConsWeightButtons({
  list,
  currentWeight,
  onWeightChange,
}: ProsConsWeightButtonsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {[1, 2, 3, 4, 5].map((weight) => (
        <button
          key={weight}
          type="button"
          className={cn(
            "min-w-8 rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors",
            getProsConsWeightButtonClass(list, currentWeight, weight),
          )}
          aria-label={`Set ${list === "pros" ? "pro" : "con"} weight to ${weight}`}
          onClick={() => onWeightChange(weight)}
        >
          {weight}
        </button>
      ))}
    </div>
  );
}

type ProsConsBalanceBarProps = {
  prosWeight: number;
  consWeight: number;
};

export function ProsConsBalanceBar({ prosWeight, consWeight }: ProsConsBalanceBarProps) {
  const totalWeight = Math.max(prosWeight + consWeight, 1);

  return (
    <div className="relative h-2 overflow-hidden rounded-full bg-muted">
      <div
        className="absolute inset-y-0 left-0 bg-success transition-all duration-500"
        style={{ width: `${(prosWeight / totalWeight) * 100}%` }}
      />
      <div
        className="absolute inset-y-0 right-0 bg-destructive transition-all duration-500"
        style={{ width: `${(consWeight / totalWeight) * 100}%` }}
      />
    </div>
  );
}
