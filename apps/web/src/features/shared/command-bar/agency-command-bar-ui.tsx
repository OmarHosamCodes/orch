import { agencyPickerFieldTriggerClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

export const agencyCommandBarFilterTriggerClass = cn(
  agencyPickerFieldTriggerClass,
  "min-w-32 max-w-44 overflow-hidden",
);
