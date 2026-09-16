import { projectHueStyle } from "@/features/shared/project-palette";
import { cn } from "@/lib/utils";

/** Display-only symbol + palette slot per agency currency code. */
const CURRENCY_META: Record<string, { symbol: string; hueId: number }> = {
  USD: { symbol: "$", hueId: 5 },
  EUR: { symbol: "€", hueId: 2 },
  GBP: { symbol: "£", hueId: 11 },
  EGP: { symbol: "E£", hueId: 3 },
  CAD: { symbol: "C$", hueId: 8 },
  SAR: { symbol: "﷼", hueId: 6 },
  AED: { symbol: "د.إ", hueId: 7 },
};

const SLATE_HUE_ID = 12;

export function agencyCurrencyMeta(code: string) {
  return CURRENCY_META[code] ?? { symbol: code, hueId: SLATE_HUE_ID };
}

type AgencyCurrencyGlyphProps = {
  code: string;
  className?: string;
};

export function AgencyCurrencyGlyph({ code, className }: AgencyCurrencyGlyphProps) {
  const meta = agencyCurrencyMeta(code);

  return (
    <span
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-full",
        "bg-[var(--project-hue-soft)] text-[10px] font-bold leading-none text-[var(--project-hue)]",
        "dark:bg-[var(--project-hue-soft-dark)] dark:text-[var(--project-hue-dark)]",
        "transition-[color,transform,opacity] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-out)]",
        "motion-reduce:transition-none",
        className,
      )}
      style={projectHueStyle(code, meta.hueId)}
      aria-hidden
    >
      {meta.symbol}
    </span>
  );
}
