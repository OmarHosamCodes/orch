import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { cn } from "@/lib/utils";

const EMPTY_SELECT_VALUE = "__empty";

type BlockSelectOption = {
  label: string;
  value: string;
};

type BlockSelectProps = {
  value: string;
  options: BlockSelectOption[];
  onValueChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
};

function toSelectValue(value: string) {
  return value === "" ? EMPTY_SELECT_VALUE : value;
}

function fromSelectValue(value: string) {
  return value === EMPTY_SELECT_VALUE ? "" : value;
}

export function BlockSelect({
  value,
  options,
  onValueChange,
  className,
  disabled,
  id,
  "aria-label": ariaLabel,
}: BlockSelectProps) {
  return (
    <Select
      value={toSelectValue(value)}
      disabled={disabled}
      onValueChange={(next) => onValueChange(fromSelectValue(next))}
    >
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        className={cn("h-8 w-full rounded-2xl", className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="start" className="w-(--radix-select-trigger-width)">
        {options.map((option) => {
          const optionValue = toSelectValue(option.value);
          return (
            <SelectItem key={optionValue} value={optionValue}>
              {option.label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
