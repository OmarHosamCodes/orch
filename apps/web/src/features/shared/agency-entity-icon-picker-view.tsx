import { AGENCY_ENTITY_ICON_CATALOG } from "@orch/api/routers/agency-ops/shared/entity-icon-catalog";
import type { AgencyEntityIconKey } from "@orch/api/routers/agency-ops/shared/entity-icon-catalog";

import {
  AGENCY_ENTITY_ICON_GLYPHS,
  agencyEntityIconLetter,
} from "@/features/shared/agency-entity-icon-glyphs";
import { AgencyEntityMark } from "@/features/shared/agency-entity-mark";
import { PROJECT_PALETTE, projectHueStyle } from "@/features/shared/project-palette";
import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";

type AgencyEntityIconPickerViewProps = {
  name: string;
  value: AgencyEntityIconKey | null;
  onChange: (iconKey: AgencyEntityIconKey | null) => void;
  disabled?: boolean;
  labelledBy?: string;
  projectId?: string;
  colorHueId?: number | null;
  onColorHueChange?: (hueId: number) => void;
};

const PICKER_CELL_CLASS =
  "flex size-8 items-center justify-center rounded-md border border-default bg-[var(--project-hue-soft)] text-[var(--project-hue)] dark:bg-[var(--project-hue-soft-dark)] dark:text-[var(--project-hue-dark)] transition-[color,transform,background-color] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-out)] motion-reduce:transition-none";

export function AgencyEntityIconPickerView({
  name,
  value,
  onChange,
  disabled = false,
  labelledBy,
  projectId = "draft",
  colorHueId,
  onColorHueChange,
}: AgencyEntityIconPickerViewProps) {
  const letter = agencyEntityIconLetter(name);
  const hueStyle = projectHueStyle(projectId, colorHueId);

  return (
    <div className="flex flex-col gap-2.5">
      {onColorHueChange ? (
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Color">
          {PROJECT_PALETTE.map((hue) => (
            <button
              key={hue.id}
              type="button"
              role="radio"
              aria-checked={colorHueId === hue.id}
              aria-label={hue.label}
              disabled={disabled}
              className={cn(
                "size-5 rounded-sm border border-transparent",
                "transition-[transform,box-shadow] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-out)]",
                agencyFocusRingClass,
                colorHueId === hue.id && "ring-2 ring-ring ring-offset-2 ring-offset-background",
                "motion-reduce:transition-none",
              )}
              style={{ backgroundColor: hue.dark }}
              onClick={() => onColorHueChange(hue.id)}
            />
          ))}
        </div>
      ) : null}
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
          style={hueStyle}
          className={cn(
            PICKER_CELL_CLASS,
            "text-[11px] font-bold",
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
              style={hueStyle}
              className={cn(
                PICKER_CELL_CLASS,
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
  onColorHueChange?: (hueId: number) => void;
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
  onColorHueChange,
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
          projectId={projectId}
          colorHueId={colorHueId}
          onColorHueChange={onColorHueChange}
        />
      </PopoverContent>
    </Popover>
  );
}
