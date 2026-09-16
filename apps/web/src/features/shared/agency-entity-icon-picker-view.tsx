import { AGENCY_ENTITY_ICON_CATALOG } from "@orch/api/routers/agency-ops/shared/entity-icon-catalog";
import type { AgencyEntityIconKey } from "@orch/api/routers/agency-ops/shared/entity-icon-catalog";

import {
  AGENCY_ENTITY_ICON_GLYPHS,
  agencyEntityIconLetter,
} from "@/features/shared/agency-entity-icon-glyphs";
import { AgencyEntityMark } from "@/features/shared/agency-entity-mark";
import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";

type AgencyEntityIconPickerViewProps = {
  name: string;
  value: AgencyEntityIconKey | null;
  onChange: (iconKey: AgencyEntityIconKey | null) => void;
  disabled?: boolean;
  labelledBy?: string;
};

export function AgencyEntityIconPickerView({
  name,
  value,
  onChange,
  disabled = false,
  labelledBy,
}: AgencyEntityIconPickerViewProps) {
  const letter = agencyEntityIconLetter(name);

  return (
    <div
      className="grid grid-cols-6 gap-1.5 sm:grid-cols-8"
      role="radiogroup"
      aria-labelledby={labelledBy}
    >
      <button
        type="button"
        role="radio"
        aria-checked={value == null}
        aria-label="Letter mark"
        disabled={disabled}
        className={cn(
          "flex size-8 items-center justify-center rounded-md border border-default text-[11px] font-bold text-highlighted",
          agencyFocusRingClass,
          value == null && "ring-2 ring-ring ring-offset-2 ring-offset-background",
        )}
        onClick={() => onChange(null)}
      >
        {letter}
      </button>
      {AGENCY_ENTITY_ICON_CATALOG.map((entry) => {
        const Glyph = AGENCY_ENTITY_ICON_GLYPHS[entry.key];
        const selected = value === entry.key;
        return (
          <button
            key={entry.key}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={entry.label}
            disabled={disabled}
            className={cn(
              "flex size-8 items-center justify-center rounded-md border border-default text-highlighted",
              agencyFocusRingClass,
              selected && "ring-2 ring-ring ring-offset-2 ring-offset-background",
            )}
            onClick={() => onChange(entry.key)}
          >
            <Glyph className="size-3.5" strokeWidth={2.25} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}

type AgencyEntityIconMarkPickerViewProps = {
  name: string;
  projectId: string;
  iconKey?: string | null;
  colorHueId?: number | null;
  size?: "row" | "header";
  disabled?: boolean;
  ariaLabel?: string;
  onChange: (iconKey: AgencyEntityIconKey | null) => void;
};

export function AgencyEntityIconMarkPickerView({
  name,
  projectId,
  iconKey,
  colorHueId,
  size = "header",
  disabled = false,
  ariaLabel = "Change icon",
  onChange,
}: AgencyEntityIconMarkPickerViewProps) {
  const mark = (
    <AgencyEntityMark
      name={name}
      projectId={projectId}
      iconKey={iconKey}
      colorHueId={colorHueId}
      size={size}
    />
  );

  if (disabled) return mark;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={cn(
            "inline-flex shrink-0 rounded-md",
            agencyFocusRingClass,
            "hover:bg-muted/60",
          )}
          onClick={(event) => event.stopPropagation()}
        >
          {mark}
        </button>
      </PopoverTrigger>
      <PopoverContent
        size="form"
        align="start"
        className="p-3"
        onClick={(event) => event.stopPropagation()}
      >
        <AgencyEntityIconPickerView
          name={name}
          value={
            iconKey && iconKey in AGENCY_ENTITY_ICON_GLYPHS
              ? (iconKey as AgencyEntityIconKey)
              : null
          }
          onChange={onChange}
        />
      </PopoverContent>
    </Popover>
  );
}
