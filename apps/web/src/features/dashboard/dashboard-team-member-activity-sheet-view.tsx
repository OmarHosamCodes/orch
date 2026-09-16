import { type CSSProperties } from "react";

import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import { agencyLabelClass, agencyMetricClass } from "@/features/shared/agency-ui";
import { formatRelativeTime } from "@/features/notifications/notification-presentation";
import { projectHueFor } from "@/features/shared/project-palette";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Separator } from "@/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import { formatDuration } from "@/lib/utils/format-duration";
import { cn } from "@/lib/utils";

import { type DashboardTeamMemberSheetMember } from "./dashboard-team-member-types";

export type { DashboardTeamMemberSheetMember };

function ProjectHueSwatch({
  projectId,
  isDark,
  className,
  style,
}: {
  projectId: string;
  isDark: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const hue = projectHueFor(projectId);
  return (
    <span
      className={cn("block size-2.5 shrink-0 rounded-sm", className)}
      style={{ ...style, backgroundColor: isDark ? hue.dark : hue.light }}
      aria-hidden
    />
  );
}

function relShare(seconds: number, totalSeconds: number): number {
  if (totalSeconds <= 0) return 0;
  return (seconds / totalSeconds) * 100;
}

export type DashboardTeamMemberActivitySheetViewProps = {
  member: DashboardTeamMemberSheetMember | null;
  isDark: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenProfile?: (userId: string) => void;
};

export function DashboardTeamMemberActivitySheetView({
  member,
  isDark,
  open,
  onOpenChange,
  onOpenProfile,
}: DashboardTeamMemberActivitySheetViewProps) {
  const activity = member?.activity ?? null;
  const meta = activity
    ? activity.clientName
      ? `${activity.projectName} · ${activity.clientName}`
      : activity.projectName
    : null;
  const startedRelative =
    activity?.startedAt && activity.startedAt.length > 0
      ? formatRelativeTime(activity.startedAt)
      : null;
  const startedLabel = startedRelative
    ? startedRelative === "just now"
      ? "Started just now"
      : `Started ${startedRelative} ago`
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        {member ? (
          <>
            <SheetHeader className="border-b border-default px-6 py-5 pr-14">
              <div className="flex items-start gap-3">
                <AgencyMemberAvatar
                  name={member.userName}
                  userId={member.userId}
                  avatarUrl={member.avatar}
                  size="md"
                  alt={member.userName}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <SheetTitle className="truncate">{member.userName}</SheetTitle>
                    <Badge variant={member.isTracking ? "default" : "secondary"}>
                      {member.isTracking ? "In progress" : "Idle"}
                    </Badge>
                  </div>
                  <SheetDescription className="truncate">{member.userEmail}</SheetDescription>
                </div>
              </div>
              <div className="flex items-baseline justify-between gap-3 pt-3">
                <span className={agencyLabelClass}>Total tracked</span>
                <span className={cn(agencyMetricClass, "text-lg tabular-nums")}>
                  {formatDuration(member.totalSeconds)}
                </span>
              </div>
            </SheetHeader>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <section className="space-y-2">
                <p className={agencyLabelClass}>Current activity</p>
                {activity ? (
                  <div className="space-y-1.5">
                    <p className="text-sm font-semibold text-balance text-highlighted">
                      {activity.description || "(no description)"}
                    </p>
                    <p className="text-xs text-muted">{meta}</p>
                    {startedLabel ? <p className="text-[11px] text-muted">{startedLabel}</p> : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted">No activity in this range.</p>
                )}
              </section>

              <Separator className="my-5" />

              <section className="space-y-3">
                <p className={agencyLabelClass}>Project allocation</p>
                {member.projectBreakdown.length === 0 ? (
                  <p className="text-sm text-muted">No project hours in this range.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8" />
                        <TableHead>Project</TableHead>
                        <TableHead className="text-right">Time</TableHead>
                        <TableHead className="text-right">Share</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {member.projectBreakdown.map((project) => {
                        const share = relShare(project.seconds, member.totalSeconds);
                        return (
                          <TableRow key={project.projectId}>
                            <TableCell className="w-8 py-2">
                              <ProjectHueSwatch projectId={project.projectId} isDark={isDark} />
                            </TableCell>
                            <TableCell className="max-w-[10rem] py-2">
                              <p className="truncate font-medium text-highlighted">
                                {project.projectName}
                              </p>
                              <p className="truncate text-[11px] text-muted">
                                {project.clientName || "General"}
                              </p>
                            </TableCell>
                            <TableCell
                              className={cn("py-2 text-right tabular-nums", agencyMetricClass)}
                            >
                              {formatDuration(project.seconds)}
                            </TableCell>
                            <TableCell className="py-2 text-right tabular-nums text-muted">
                              {share.toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </section>
            </div>

            <SheetFooter className="border-t border-default px-6 py-4">
              <Button
                className="w-full"
                onClick={() => {
                  onOpenChange(false);
                  onOpenProfile?.(member.userId);
                }}
              >
                Open profile
              </Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
