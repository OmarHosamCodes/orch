import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { agencyFormFieldClass, agencyInputPlaceholderClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/collapsible";
import { Textarea } from "@/ui/textarea";

type AgencyNoteFieldProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
};

export function AgencyNoteField({
  id,
  value,
  onChange,
  placeholder = "Anything to remember…",
  disabled = false,
  label = "Note",
}: AgencyNoteFieldProps) {
  const [open, setOpen] = useState(value.trim().length > 0);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={agencyFormFieldClass}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="group h-7 w-fit gap-1.5 px-1.5 text-muted hover:text-highlighted"
        >
          <ChevronRight
            className="size-3.5 transition-transform duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-out)] group-data-[state=open]:rotate-90 motion-reduce:transition-none"
            aria-hidden
          />
          {label}
          {value.trim() && !open ? (
            <span className="max-w-[12rem] truncate font-normal text-muted-foreground">
              {value.trim()}
            </span>
          ) : (
            <span className="font-normal text-muted-foreground">(optional)</span>
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={3}
          className={cn(
            "mt-1.5 min-h-20 rounded-xl border-default bg-default text-sm",
            agencyInputPlaceholderClass,
          )}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}
