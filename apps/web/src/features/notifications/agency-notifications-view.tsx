import { ArrowRight, Bell, Loader2, Settings2, X } from "lucide-react";
import type { NotificationRecord } from "@orch/api/schemas/notifications";

import type { AgencyNotificationsViewModel } from "@/features/notifications/hooks/use-agency-notifications";
import {
  featuredNotificationBody,
  featuredNotificationCta,
  featuredNotificationTitle,
  isNeedsActionNotification,
} from "@/features/notifications/notification-presentation";
import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { SurfaceShimmer } from "@/ui/skeleton";
import { ShellLiquidBadge } from "@/features/app-shell/shell-liquid-badge";
import { cn } from "@/lib/utils";

type AgencyNotificationsViewProps = {
  view: AgencyNotificationsViewModel;
};

function NotificationSentence({
  parts,
}: {
  parts: ReturnType<AgencyNotificationsViewModel["notificationSentenceParts"]>;
}) {
  switch (parts.kind) {
    case "assigned":
      return (
        <>
          <span className="font-semibold text-foreground">{parts.actor}</span> assigned you{" "}
          <span className="font-semibold text-foreground">{parts.taskTitle}</span>
        </>
      );
    case "message":
      if (parts.count > 1) {
        return (
          <>
            <span className="font-semibold text-foreground">{parts.actor}</span> sent {parts.count}{" "}
            messages in <span className="font-semibold text-foreground">{parts.taskTitle}</span>
          </>
        );
      }
      return (
        <>
          <span className="font-semibold text-foreground">{parts.actor}</span> replied in{" "}
          <span className="font-semibold text-foreground">{parts.taskTitle}</span>
        </>
      );
    case "milestone":
      return (
        <>
          <span className="font-semibold text-foreground">{parts.stepLabel}</span> completed on{" "}
          {parts.projectName}
        </>
      );
    case "timer":
      return parts.timerAction === "stopped" ? (
        <>
          <span className="font-semibold text-foreground">{parts.actor}</span> stopped tracking on{" "}
          {parts.projectName}
        </>
      ) : (
        <>
          <span className="font-semibold text-foreground">{parts.actor}</span> started tracking
          {parts.taskTitle ? (
            <>
              {" "}
              on <span className="font-semibold text-foreground">{parts.taskTitle}</span>
            </>
          ) : (
            <> on {parts.projectName}</>
          )}
        </>
      );
    case "digest":
      return (
        <>
          Your team logged <span className="font-semibold text-foreground">{parts.hoursLabel}</span>{" "}
          yesterday, {parts.tasksCompleted} task{parts.tasksCompleted === 1 ? "" : "s"} completed
        </>
      );
    case "memberAlert":
      return (
        <>
          <span className="font-semibold text-foreground">{parts.actor}</span> sent{" "}
          <span className="font-semibold text-foreground">{parts.alertTitle}</span>
          {parts.notePreview ? (
            <>
              : <span className="text-muted-foreground">{parts.notePreview}</span>
            </>
          ) : null}
        </>
      );
    default: {
      const _exhaustive: never = parts;
      return _exhaustive;
    }
  }
}

function InboxNotificationRow({
  notification,
  view,
}: {
  notification: NotificationRecord;
  view: AgencyNotificationsViewModel;
}) {
  const unread = !notification.readAt;
  const needsAction = isNeedsActionNotification(notification);
  const title = featuredNotificationTitle(notification);
  const body = featuredNotificationBody(notification);
  const cta = featuredNotificationCta(notification);
  const pending = view.pendingActionId === notification.id;
  const parts = view.notificationSentenceParts(notification);

  return (
    <li>
      <article
        className={cn(
          "rounded-surface border border-transparent px-2.5 py-2.5 transition-colors",
          needsAction && unread && "border-border/60 bg-card",
          !needsAction && unread && "bg-muted/40",
          !unread && "opacity-70",
        )}
      >
        <div className="flex items-start gap-2">
          <AgencyMemberAvatar
            name={notification.actorName ?? "Team"}
            avatarUrl={notification.actorAvatar}
            size="sm"
            className="mt-0.5"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-1">
              <div className="min-w-0 flex-1">
                {needsAction ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      {unread ? (
                        <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                      ) : null}
                      <p className="truncate text-sm font-semibold leading-snug text-foreground">
                        {title}
                      </p>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">
                      {body}
                    </p>
                  </>
                ) : (
                  <p className="text-sm leading-snug text-foreground">
                    <NotificationSentence parts={parts} />
                  </p>
                )}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {view.formatRelativeTime(notification.createdAt)}
                </p>
              </div>
              {needsAction && unread ? (
                <button
                  type="button"
                  className={cn(
                    "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors",
                    "hover:bg-muted hover:text-foreground",
                    "disabled:pointer-events-none disabled:opacity-50",
                  )}
                  aria-label="Dismiss notification"
                  disabled={pending}
                  onClick={() => view.onDismissNotification(notification)}
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              ) : null}
            </div>

            {needsAction ? (
              <Button
                type="button"
                size="sm"
                className="mt-2.5 h-8 w-full rounded-full text-xs font-semibold"
                disabled={pending}
                onClick={() => view.onPrimaryAction(notification)}
              >
                {pending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <>
                    {cta.label}
                    <ArrowRight className="size-3.5" aria-hidden />
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="mt-2 h-7 rounded-full px-2.5 text-xs"
                disabled={pending}
                onClick={() => view.onPrimaryAction(notification)}
              >
                Open
                <ArrowRight className="size-3.5" aria-hidden />
              </Button>
            )}
          </div>
        </div>
      </article>
    </li>
  );
}

export function AgencyNotificationsView({ view }: AgencyNotificationsViewProps) {
  if (!view.teamId) return null;

  return (
    <Popover
      open={view.open}
      onOpenChange={(nextOpen) => {
        view.setOpen(nextOpen);
        if (!nextOpen) view.setShowSettings(false);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative size-8 shrink-0 rounded-full text-muted hover:bg-sidebar-accent hover:text-highlighted"
          aria-label={
            view.badgeCount > 0
              ? `Notifications, ${view.badgeCount} needing attention`
              : "Notifications"
          }
        >
          <Bell className="size-4" aria-hidden />
          <ShellLiquidBadge visible={view.badgeCount > 0}>{view.badgeLabel}</ShellLiquidBadge>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" side="bottom" className="w-[380px] p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Inbox</p>
              {view.actionCount > 0 && !view.showSettings ? (
                <p className="text-[11px] text-muted-foreground">
                  {view.actionCount} needing action
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 rounded-full"
              aria-label="Notification settings"
              aria-pressed={view.showSettings}
              onClick={() => view.setShowSettings(!view.showSettings)}
            >
              <Settings2 className="size-3.5" aria-hidden />
            </Button>
          </div>
          {!view.showSettings ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 rounded-full px-2 text-xs"
              disabled={!view.hasUnread || view.markAllReadPending}
              onClick={view.onMarkAllRead}
            >
              Mark all read
            </Button>
          ) : null}
        </div>

        {view.showSettings ? (
          view.preferencesPending ? (
            <div className="space-y-2 px-3 py-3">
              <SurfaceShimmer className="min-h-44" label="Loading notification settings" />
            </div>
          ) : (
            <div className="max-h-[420px] space-y-3 overflow-y-auto px-3 py-3">
              <div className="space-y-2 rounded-xl border border-border/50 px-3 py-2.5">
                <p className="text-sm font-medium text-foreground">Focus & quiet hours</p>
                <p className="text-xs text-muted-foreground">
                  Push pauses while you focus or during quiet hours. The inbox still fills.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    id="notification-focus-mode"
                    checked={view.delivery.focusMode}
                    disabled={view.preferencesSaving}
                    onCheckedChange={(checked) => view.onSetFocusMode(checked === true)}
                  />
                  <Label htmlFor="notification-focus-mode" className="text-xs font-normal">
                    Focus mode
                  </Label>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="space-y-1">
                    <Label htmlFor="quiet-start" className="text-[11px] text-muted-foreground">
                      Quiet start
                    </Label>
                    <Input
                      id="quiet-start"
                      type="time"
                      className="h-8"
                      value={view.delivery.quietHoursStart ?? ""}
                      disabled={view.preferencesSaving}
                      onChange={(event) =>
                        view.onSetQuietHours(
                          event.target.value || null,
                          view.delivery.quietHoursEnd,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="quiet-end" className="text-[11px] text-muted-foreground">
                      Quiet end
                    </Label>
                    <Input
                      id="quiet-end"
                      type="time"
                      className="h-8"
                      value={view.delivery.quietHoursEnd ?? ""}
                      disabled={view.preferencesSaving}
                      onChange={(event) =>
                        view.onSetQuietHours(
                          view.delivery.quietHoursStart,
                          event.target.value || null,
                        )
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1 pt-1">
                  <Label
                    htmlFor="notification-timezone"
                    className="text-[11px] text-muted-foreground"
                  >
                    Timezone
                  </Label>
                  <Input
                    id="notification-timezone"
                    className="h-8"
                    value={view.timezoneDraft}
                    disabled={view.preferencesSaving}
                    onBlur={view.onTimezoneCommit}
                    onChange={(event) => view.onTimezoneDraftChange(event.target.value)}
                  />
                </div>
              </div>

              {view.preferences.map((pref) => (
                <div
                  key={pref.type}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/50 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {view.notificationPreferenceLabel(pref.type)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      In-app {pref.inApp ? "on" : "off"} · Push {pref.push ? "on" : "off"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={pref.inApp ? "secondary" : "ghost"}
                      className="h-7 rounded-full px-2 text-[11px]"
                      disabled={view.preferencesSaving}
                      onClick={() => view.onTogglePreferenceChannel(pref, "inApp")}
                    >
                      In-app
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={pref.push ? "secondary" : "ghost"}
                      className="h-7 rounded-full px-2 text-[11px]"
                      disabled={view.preferencesSaving}
                      onClick={() => view.onTogglePreferenceChannel(pref, "push")}
                    >
                      Push
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : view.listPending ? (
          <div className="px-3 py-3">
            <SurfaceShimmer className="min-h-44" label="Loading notifications" />
          </div>
        ) : view.items.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm font-semibold text-foreground">You&apos;re all caught up</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Personal action items land here first. Milestones and digests stay in Updates.
            </p>
          </div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto">
            {view.sections.map((section) => (
              <div key={section.label}>
                <p className="px-3 pb-1.5 pt-3 text-[11px] font-medium text-muted-foreground">
                  {section.label}
                </p>
                <ul className="space-y-1 px-2 pb-2">
                  {section.items.map((notification) => (
                    <InboxNotificationRow
                      key={notification.id}
                      notification={notification}
                      view={view}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {view.showPushPrompt ? (
          <div className="border-t border-border/60 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">
              Enable push only when something needs you — assignments and replies, not every update.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                className="h-8 rounded-full px-3 text-xs"
                disabled={view.pushBusy}
                onClick={view.onEnablePush}
              >
                Enable
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 rounded-full px-3 text-xs"
                onClick={view.onDismissPushPrompt}
              >
                Not now
              </Button>
            </div>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
