import {
  instrumentPlateInkClass,
  instrumentPlateSurfaceClass,
} from "@/features/member-profile/member-profile-instrument-plate";
import { agencyMetricClass } from "@/features/shared/agency-ui";
import { formatDuration } from "@/lib/utils/format-duration";
import { cn } from "@/lib/utils";

import { DashboardHoursPlateGlyph } from "./dashboard-hours-plate-glyphs";
import { dashboardHoursPlateMeta } from "./dashboard-hours-plate-meta";
import type { DashboardHoursPlateViewModel } from "./dashboard-hours-plate-signal";

const plateTitleClass = "text-sm font-semibold tracking-tight text-foreground";
const plateHintClass =
  "shrink-0 font-mono text-[0.625rem] font-medium tracking-[0.04em] text-muted-foreground";
const metricLabelClass = "min-w-0 truncate text-[10px] leading-snug text-muted-foreground";
const metricValueClass = cn(
  agencyMetricClass,
  "text-xs font-semibold tracking-tight tabular-nums leading-none sm:text-sm",
);

function DashboardHoursPlate({
  plate,
  staggerIndex = 0,
}: {
  plate: DashboardHoursPlateViewModel;
  staggerIndex?: number;
}) {
  const { shortTitle, destinationHint, metricLabel } = dashboardHoursPlateMeta(plate.id);
  const ink = instrumentPlateInkClass(plate.tone);
  const value = formatDuration(plate.seconds);

  return (
    <article
      className={cn(
        instrumentPlateSurfaceClass(),
        "flex min-h-[15.5rem] flex-col gap-2 rounded-surface border px-surface py-3.5 transition-colors",
        "animate-in fade-in fill-mode-both duration-300 motion-reduce:animate-none",
      )}
      style={{ animationDelay: `${staggerIndex * 40}ms` }}
      aria-label={`${plate.ariaLabel} ${value}`}
    >
      <header className="flex shrink-0 items-start justify-between gap-3">
        <h2 className={plateTitleClass}>{shortTitle}</h2>
        <span className={plateHintClass}>{destinationHint}</span>
      </header>

      <div className="flex min-h-[5.5rem] flex-1 flex-col justify-center rounded-surface bg-card px-3 py-surface">
        <div className={cn("h-14 w-full shrink-0 transition-colors duration-300 sm:h-16", ink)}>
          <DashboardHoursPlateGlyph glyph={plate.glyph} className="h-full w-full" />
        </div>
      </div>

      <div className="shrink-0 border-t border-border pt-2.5">
        <div className="flex w-full min-w-0 flex-col gap-0.5 px-1.5 py-1.5">
          <span className={metricLabelClass}>{metricLabel}</span>
          <span className={metricValueClass}>{value}</span>
        </div>
      </div>
    </article>
  );
}

export function DashboardHoursPlates({ plates }: { plates: DashboardHoursPlateViewModel[] }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Hour quality">
      {plates.map((plate, index) => (
        <DashboardHoursPlate key={plate.id} plate={plate} staggerIndex={index} />
      ))}
    </section>
  );
}
