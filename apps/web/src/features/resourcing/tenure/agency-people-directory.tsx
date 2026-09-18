import { SlidersHorizontal, Users } from "lucide-react";

import {
  agencyPanelClass,
  agencySectionTitleClass,
  agencyWorkMetaClass,
  agencyWorkMetricClass,
  agencyWorkTitleClass,
} from "@/features/shared/agency-ui";
import { formatHoursMinutes } from "@/features/resourcing/tenure-utils";
import { AgencyFirstRunEmptyView } from "@/features/shared/views/agency-first-run-empty-view";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";

import { AgencyPeopleDirectoryGallery } from "./agency-people-directory-gallery";
import type { PeopleConfigBadge } from "./people-config-completion";

export type PeopleDirectoryCard = {
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string | null;
  subtitle: string;
  detail: string;
  completionPercent: number;
  badge: PeopleConfigBadge;
};

type AgencyPeopleDirectoryProps = {
  policyEnabled: boolean;
  policyEffectiveLabel: string | null;
  quarterlyMinHours: number | null;
  monthlyMinHours: number | null;
  requiredDailyHours: number | null;
  offDayReduceHours: number | null;
  weekStartLabel: string | null;
  departmentCount: number;
  memberCount: number;
  attentionCount: number;
  cards: readonly PeopleDirectoryCard[];
  canReviewDefaults: boolean;
  onReviewDefaults: () => void;
  onSelectMember: (userId: string) => void;
  onOpenProfile: (userId: string) => void;
  canInvitePeople?: boolean;
  onInvitePeople?: () => void;
  isLoadError?: boolean;
  loadErrorMessage?: string | null;
  onRetryLoad?: () => void;
  isStaleLoadError?: boolean;
};

function TeamDefaultsArticle({
  policyEnabled,
  policyEffectiveLabel,
  quarterlyMinHours,
  monthlyMinHours,
  requiredDailyHours,
  offDayReduceHours,
  weekStartLabel,
  departmentCount,
  attentionCount,
  canReviewDefaults,
  onReviewDefaults,
}: Pick<
  AgencyPeopleDirectoryProps,
  | "policyEnabled"
  | "policyEffectiveLabel"
  | "quarterlyMinHours"
  | "monthlyMinHours"
  | "requiredDailyHours"
  | "offDayReduceHours"
  | "weekStartLabel"
  | "departmentCount"
  | "attentionCount"
  | "canReviewDefaults"
  | "onReviewDefaults"
>) {
  const workSchedule =
    requiredDailyHours != null || offDayReduceHours != null || weekStartLabel
      ? [
          requiredDailyHours != null ? `${requiredDailyHours}h/day` : null,
          offDayReduceHours != null ? `${formatHoursMinutes(offDayReduceHours)}/off day` : null,
          weekStartLabel ? `starts ${weekStartLabel}` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : "—";

  return (
    <article className={cn(agencyPanelClass, "overflow-hidden")}>
      <div className="flex flex-col gap-4 p-4 sm:gap-5 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className={cn(agencyWorkTitleClass, "text-base tracking-tight")}>
                Team defaults
              </h2>
              <span className={agencyWorkMetaClass}>
                {policyEffectiveLabel
                  ? `Effective ${policyEffectiveLabel}`
                  : policyEnabled
                    ? "Tenure tracking on"
                    : "Tenure tracking off"}
              </span>
              {attentionCount > 0 ? (
                <span className="text-warning text-xs font-medium">
                  {attentionCount} need attention
                </span>
              ) : (
                <span className="text-success text-xs font-medium">Roster clear</span>
              )}
            </div>
            <p className={cn(agencyWorkMetaClass, "max-w-prose text-pretty")}>
              {policyEnabled
                ? "New members inherit this baseline. Open it when exceptions need a source of truth."
                : "Tenure tracking is off. Turn it on here when the team is ready for quarter minimums."}
            </p>
          </div>
          {canReviewDefaults ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5 self-start"
              onClick={onReviewDefaults}
            >
              <SlidersHorizontal className="size-3.5 opacity-70" aria-hidden />
              Review team defaults
            </Button>
          ) : null}
        </div>

        <div className="bg-muted/35 rounded-2xl px-3 py-3 sm:px-4">
          <dl
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            aria-label="Current team defaults"
          >
            <div className="min-w-0 space-y-0.5">
              <dt className={agencyWorkMetaClass}>Quarter minimum</dt>
              <dd className={cn(agencyWorkMetricClass, "text-base leading-none")}>
                {quarterlyMinHours != null ? `${quarterlyMinHours}h` : "—"}
              </dd>
            </div>
            <div className="min-w-0 space-y-0.5">
              <dt className={agencyWorkMetaClass}>Month minimum</dt>
              <dd className={cn(agencyWorkMetricClass, "text-base leading-none")}>
                {monthlyMinHours != null ? `${monthlyMinHours}h` : "—"}
              </dd>
            </div>
            <div className="min-w-0 space-y-0.5">
              <dt className={agencyWorkMetaClass}>Tracking</dt>
              <dd
                className={cn(
                  agencyWorkMetricClass,
                  "text-base leading-none",
                  policyEnabled ? "text-success" : "text-muted",
                )}
              >
                {policyEnabled ? "On" : "Off"}
              </dd>
            </div>
            <div className="min-w-0 space-y-0.5 sm:col-span-2 lg:col-span-2">
              <dt className={agencyWorkMetaClass}>Work schedule</dt>
              <dd className={cn(agencyWorkMetricClass, "text-sm leading-snug sm:text-base")}>
                {workSchedule}
              </dd>
            </div>
            <div className="min-w-0 space-y-0.5">
              <dt className={agencyWorkMetaClass}>Departments</dt>
              <dd className={cn(agencyWorkMetricClass, "text-base leading-none")}>
                {departmentCount}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </article>
  );
}

export function AgencyPeopleDirectory({
  policyEnabled,
  policyEffectiveLabel,
  quarterlyMinHours,
  monthlyMinHours,
  requiredDailyHours,
  offDayReduceHours,
  weekStartLabel,
  departmentCount,
  memberCount,
  attentionCount,
  cards,
  canReviewDefaults,
  onReviewDefaults,
  onSelectMember,
  onOpenProfile,
  canInvitePeople = false,
  onInvitePeople,
  isLoadError = false,
  loadErrorMessage = null,
  onRetryLoad,
  isStaleLoadError = false,
}: AgencyPeopleDirectoryProps) {
  return (
    <section className="space-y-6" data-testid="people-directory">
      <header className="space-y-1">
        <h1 className={cn(agencySectionTitleClass, "text-balance")}>People</h1>
        <p className={cn(agencyWorkMetaClass, "max-w-prose text-pretty")}>
          Configure team defaults and each member’s employment, off days, rates, tenure, and access.
        </p>
      </header>

      {isStaleLoadError && loadErrorMessage ? (
        <div
          className="border-warning/40 bg-warning/5 text-foreground flex flex-wrap items-center gap-3 rounded-xl border px-3.5 py-3"
          role="status"
        >
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-semibold">Showing cached people data.</span> {loadErrorMessage}
          </p>
          {onRetryLoad ? (
            <Button type="button" variant="outline" size="sm" onClick={onRetryLoad}>
              Retry
            </Button>
          ) : null}
        </div>
      ) : null}

      {isLoadError ? (
        <div
          className="border-destructive/40 bg-destructive/5 text-foreground flex flex-wrap items-center gap-3 rounded-xl border px-3.5 py-3"
          role="alert"
        >
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-semibold">Couldn&apos;t load people.</span>{" "}
            {loadErrorMessage ?? "Try again."}
          </p>
          {onRetryLoad ? (
            <Button type="button" variant="outline" size="sm" onClick={onRetryLoad}>
              Retry
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <TeamDefaultsArticle
            policyEnabled={policyEnabled}
            policyEffectiveLabel={policyEffectiveLabel}
            quarterlyMinHours={quarterlyMinHours}
            monthlyMinHours={monthlyMinHours}
            requiredDailyHours={requiredDailyHours}
            offDayReduceHours={offDayReduceHours}
            weekStartLabel={weekStartLabel}
            departmentCount={departmentCount}
            attentionCount={attentionCount}
            canReviewDefaults={canReviewDefaults}
            onReviewDefaults={onReviewDefaults}
          />

          <div className="space-y-3">
            <header className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-highlighted">Directory</h2>
                <p className={agencyWorkMetaClass}>Open a member to finish their setup.</p>
              </div>
              <p className="text-muted font-mono text-xs tabular-nums">
                {memberCount} {memberCount === 1 ? "member" : "members"}
                {attentionCount > 0 ? ` · ${attentionCount} need attention` : null}
              </p>
            </header>

            {cards.length === 0 ? (
              <AgencyFirstRunEmptyView
                icon={Users}
                title="No members yet"
                body="Invite teammates, then finish their People record here."
                primaryLabel={canInvitePeople && onInvitePeople ? "Invite people" : undefined}
                onPrimary={canInvitePeople ? onInvitePeople : undefined}
              />
            ) : (
              <AgencyPeopleDirectoryGallery
                cards={cards}
                onSelectMember={onSelectMember}
                onOpenProfile={onOpenProfile}
              />
            )}
          </div>
        </>
      )}
    </section>
  );
}
