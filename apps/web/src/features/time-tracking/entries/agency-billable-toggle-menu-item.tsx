import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";

type AgencyBillableToggleMenuItemProps = {
  isBillable: boolean;
  disabled?: boolean;
  onToggle: () => void;
};

export function AgencyBillableToggleMenuItem({
  isBillable,
  disabled = false,
  onToggle,
}: AgencyBillableToggleMenuItemProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start"
      disabled={disabled}
      onClick={onToggle}
    >
      <span className={cn("size-3.5 text-center text-xs font-semibold", isBillable && "text-info")}>
        $
      </span>
      {isBillable ? "Billable" : "Non-billable"}
    </Button>
  );
}
