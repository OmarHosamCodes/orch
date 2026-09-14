import type { MemberProfileAlertsViewModel } from "@/features/member-profile/hooks/use-member-profile-alerts";
import { AlertPlateGlyph } from "@/features/member-profile/member-profile-alert-glyphs";
import type { AlertPlateTone } from "@/features/member-profile/member-profile-alert-plate";
import {
  instrumentPlateInkClass,
  type InstrumentPlateTone,
} from "@/features/member-profile/member-profile-instrument-plate";
import {
  agencyFocusRingClass,
  agencyFormFieldClass,
  agencyFormLabelClass,
  agencyWorkCountBadgeClass,
  agencyWorkMetaClass,
  agencyWorkTitleClass,
} from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { SurfaceShimmer } from "@/ui/skeleton";
import { Textarea } from "@/ui/textarea";

const profilePanelClass = "rounded-surface border border-border bg-card";

type AlertItem = MemberProfileAlertsViewModel["items"][number];

type Props = {
  alerts: MemberProfileAlertsViewModel;
};

function alertToneToInstrument(tone: AlertPlateTone): InstrumentPlateTone {
  return tone;
}

function AlertStripRow({ alert, onOpen }: { alert: AlertItem; onOpen: () => void }) {
  const { plate } = alert;
  const ink = instrumentPlateInkClass(alertToneToInstrument(plate.tone));

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full items-center gap-3 px-0 py-3 text-start",
        "border-b border-border last:border-b-0",
        "transition-colors duration-150 ease-out hover:bg-muted/30",
        agencyFocusRingClass,
        "motion-reduce:transition-none",
      )}
      aria-label={`${alert.title}. ${alert.body}`}
    >
      <div className={cn("h-7 w-14 shrink-0", ink)}>
        <AlertPlateGlyph kind={alert.kind} ratio={plate.chartRatio} className="h-full w-full" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-pretty text-foreground">{alert.title}</p>
        <p className={cn(agencyWorkMetaClass, "mt-0.5 line-clamp-2 text-pretty tabular-nums")}>
          {alert.body}
        </p>
        <p className={cn(agencyWorkMetaClass, "mt-1 text-foreground/60")}>
          {alert.kindLabel}
          <span aria-hidden> · </span>
          {alert.sourceLabel}
        </p>
      </div>

      <div className="shrink-0 text-end leading-none text-foreground">
        <span
          className={cn(
            "block font-mono font-semibold tracking-tight tabular-nums",
            plate.metric.length > 8 ? "text-lg" : plate.metric.length > 6 ? "text-xl" : "text-2xl",
          )}
        >
          {plate.metric}
        </span>
        <span className="mt-1 block max-w-[5.5rem] text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {plate.shortLabel}
        </span>
      </div>
    </button>
  );
}

export function MemberProfileAlertsPanel({ alerts }: Props) {
  const detail = alerts.detailAlert;

  return (
    <>
      <section
        className={cn(profilePanelClass, "p-4")}
        aria-labelledby="member-profile-alerts"
        aria-busy={alerts.loading || alerts.refreshing || undefined}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h2 id="member-profile-alerts" className={agencyWorkTitleClass}>
              Alerts
            </h2>
            {alerts.countLabel ? (
              <span className={agencyWorkCountBadgeClass} aria-label="Open alert count">
                {alerts.countLabel}
              </span>
            ) : null}
            {alerts.refreshing ? (
              <span className={cn(agencyWorkMetaClass, "hidden sm:inline")}>Refreshing…</span>
            ) : null}
          </div>
          {alerts.canManage ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn(agencyFocusRingClass, "shrink-0")}
              disabled={alerts.pending}
              onClick={() => alerts.setDialogOpen(true)}
            >
              Add alert
            </Button>
          ) : null}
        </div>

        {alerts.error ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <p className="text-sm text-destructive">{alerts.error}</p>
            <Button type="button" size="sm" variant="outline" onClick={alerts.retry}>
              Retry
            </Button>
          </div>
        ) : alerts.loading ? (
          <SurfaceShimmer className="mt-3 min-h-[10rem]" label="Loading alerts" />
        ) : alerts.items.length === 0 ? (
          <div className="mt-3 space-y-1 py-2">
            <p className="text-sm font-medium text-foreground">No open alerts</p>
            <p className={agencyWorkMetaClass}>
              {alerts.canManage
                ? "Pace and hours look fine for this member. Add an alert when something needs a follow-up."
                : "Nothing needs your attention on this profile right now."}
            </p>
          </div>
        ) : (
          <ul className="mt-1 flex list-none flex-col p-0">
            {alerts.items.map((alert) => (
              <li key={alert.id} className="min-w-0">
                <AlertStripRow alert={alert} onOpen={() => alerts.openDetail(alert.id)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog
        open={detail !== null}
        onOpenChange={(open) => {
          if (!open) alerts.closeDetail();
        }}
      >
        <DialogContent className="sm:max-w-md">
          {detail ? (
            <>
              <DialogHeader>
                <DialogTitle>{detail.title}</DialogTitle>
                <DialogDescription className="text-pretty tabular-nums">
                  {detail.body}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                {detail.canOpenPeriod ? (
                  <Button
                    type="button"
                    variant="outline"
                    className={cn("w-full", agencyFocusRingClass)}
                    onClick={() => {
                      alerts.openPeriod(detail.id);
                      alerts.closeDetail();
                    }}
                  >
                    View time entries for this period
                  </Button>
                ) : null}

                {alerts.canManage ? (
                  <div className="space-y-2 border-t border-border pt-3">
                    {detail.sentLabel ? (
                      <p className={agencyWorkMetaClass}>{detail.sentLabel}</p>
                    ) : null}
                    <div className={agencyFormFieldClass}>
                      <Label htmlFor="member-alert-detail-note" className={agencyFormLabelClass}>
                        Message to member
                      </Label>
                      <Textarea
                        id="member-alert-detail-note"
                        value={detail.note}
                        placeholder="Explain what they should change or follow up on."
                        rows={2}
                        className="min-h-16 resize-none"
                        disabled={alerts.pending}
                        onChange={(event) => alerts.setNoteDraft(detail.id, event.target.value)}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        className={agencyFocusRingClass}
                        disabled={alerts.pending || !detail.note.trim()}
                        onClick={() => void alerts.send(detail.id)}
                      >
                        {alerts.pendingLabel === "Sending…" ? "Sending…" : "Send notification"}
                      </Button>
                      {detail.canSnooze ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className={agencyFocusRingClass}
                          disabled={alerts.pending}
                          onClick={() => void alerts.snooze(detail.id)}
                        >
                          {alerts.pendingLabel === "Snoozing…"
                            ? "Snoozing…"
                            : "Snooze for this period"}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className={agencyFocusRingClass}
                        disabled={alerts.pending}
                        onClick={() => void alerts.remove(detail.id)}
                      >
                        {alerts.pendingLabel === "Dismissing…" ? "Dismissing…" : "Dismiss alert"}
                      </Button>
                    </div>
                  </div>
                ) : detail.note.trim() ? (
                  <p className={cn(agencyWorkMetaClass, "text-pretty")}>
                    Manager note: {detail.note}
                  </p>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={alerts.dialogOpen} onOpenChange={alerts.setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add alert</DialogTitle>
            <DialogDescription>
              Record a follow-up for this member. You can send them a notification after you save
              it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className={agencyFormFieldClass}>
              <Label htmlFor="member-alert-title" className={agencyFormLabelClass}>
                Alert title
              </Label>
              <Input
                id="member-alert-title"
                value={alerts.draft.title}
                disabled={alerts.pending}
                onChange={(e) => alerts.setDraft({ title: e.target.value })}
                placeholder="Follow up on month pace"
                autoFocus
              />
            </div>
            <div className={agencyFormFieldClass}>
              <Label htmlFor="member-alert-note" className={agencyFormLabelClass}>
                Note (optional)
              </Label>
              <Textarea
                id="member-alert-note"
                value={alerts.draft.note}
                disabled={alerts.pending}
                onChange={(e) => alerts.setDraft({ note: e.target.value })}
                rows={3}
                placeholder="Add context for your team or the member."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => alerts.setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={alerts.pending || !alerts.draft.title.trim()}
              onClick={() => void alerts.submit()}
            >
              {alerts.pendingLabel === "Saving…" ? "Saving…" : "Save alert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
