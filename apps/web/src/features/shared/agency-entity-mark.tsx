import {
  agencyEntityGlyph,
  agencyEntityIconLetter,
} from "@/features/shared/agency-entity-icon-glyphs";
import { projectHueStyle } from "@/features/shared/project-palette";
import { cn } from "@/lib/utils";

type AgencyEntityMarkSize = "row" | "header";

type AgencyEntityMarkProps = {
  name: string;
  projectId: string;
  iconKey?: string | null;
  colorHueId?: number | null;
  size?: AgencyEntityMarkSize;
  className?: string;
};

const SIZE_CLASS: Record<AgencyEntityMarkSize, string> = {
  row: "size-4 rounded-sm",
  header: "size-6 rounded-md",
};

const GLYPH_CLASS: Record<AgencyEntityMarkSize, string> = {
  row: "size-2.5",
  header: "size-3.5",
};

const LETTER_CLASS: Record<AgencyEntityMarkSize, string> = {
  row: "text-[9px] font-bold leading-none",
  header: "text-[11px] font-bold leading-none",
};

export function AgencyEntityMark({
  name,
  projectId,
  iconKey,
  colorHueId,
  size = "row",
  className,
}: AgencyEntityMarkProps) {
  const Glyph = agencyEntityGlyph(iconKey);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center text-[var(--project-hue)] dark:text-[var(--project-hue-dark)]",
        SIZE_CLASS[size],
        className,
      )}
      style={projectHueStyle(projectId, colorHueId)}
      aria-hidden
    >
      {Glyph ? (
        <Glyph className={GLYPH_CLASS[size]} strokeWidth={2.25} />
      ) : (
        <span className={LETTER_CLASS[size]}>{agencyEntityIconLetter(name)}</span>
      )}
    </span>
  );
}
