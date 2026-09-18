import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import {
  DEFAULT_WORK_SCHEDULE,
  startOfWeekUtc as startOfWeekUtcShared,
} from "@orch/api/routers/agency-ops/resourcing/work-schedule";

import { agencyTimeRangeCanReset } from "@/features/shared/command-bar/agency-time-range-can-reset";
import type { RangePreset } from "@/features/shared/command-bar/range-preset-chooser";
import type { AgencyFilterOptionGroup } from "@/features/shared/filters/agency-multi-select-filter";
import {
  allAgencyReportFieldIds,
  areSameReportFieldSets,
  type AgencyReportFieldId,
} from "@/features/reports/agency-report-fields";
import {
  areSameShowWaste,
  DEFAULT_AGENCY_REPORT_SHOW_WASTE,
  type AgencyReportShowWaste,
} from "@/features/reports/agency-report-show-waste";
import { DEFAULT_AGENCY_REPORT_MERGE_SAME_TASK_NAMES } from "@/features/reports/agency-report-merge-tasks";
import { fetchAllReportEntries } from "@/features/reports/fetch-report-entries";
import { orpc } from "@/lib/orpc";
import { useAgencyClientsQuery } from "@/features/shared/agency-queries";
import {
  getCurrentTenurePeriodRange,
  getCurrentTenureQuarterMonths,
  resolveDefaultDashboardRangePreset,
  resolveDefaultTenureMonthIndexes,
} from "@/features/resourcing/tenure-utils";

export function startOfWeekUtc(
  weekStartsOn: number = DEFAULT_WORK_SCHEDULE.weekStartsOn,
  now = new Date(),
): Date {
  return startOfWeekUtcShared(now, weekStartsOn);
}

export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function dateInputToIso(value: string, endOfDay = false): string {
  if (!value) return new Date().toISOString();
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  if (endOfDay) date.setUTCHours(23, 59, 59, 999);
  return date.toISOString();
}

export type AgencyTimeRangeFilters = {
  range: { from: string; to: string };
  projectId?: string;
  memberUserId?: string;
  clientId?: string;
  clientIds?: string[];
  projectIds?: string[];
  memberUserIds?: string[];
  fields?: AgencyReportFieldId[];
  showWaste?: AgencyReportShowWaste;
  mergeSameTaskNames?: boolean;
};

export type AgencyTimeRangeFilterSnapshot = {
  id: string;
  savedAt: string;
  rangePreset: RangePreset;
  customFromDate: string;
  customToDate: string;
  clientId: string;
  projectId: string;
  memberUserId: string;
  clientIds: string[];
  projectIds: string[];
  memberUserIds: string[];
  fieldIds: AgencyReportFieldId[];
  showWaste: AgencyReportShowWaste;
  mergeSameTaskNames: boolean;
  tenureMonthIndexes: number[];
  range: { from: string; to: string };
};

type UseAgencyTimeRangeFiltersOptions = {
  teamId: string;
  includeClientFilter?: boolean;
  includeFieldsFilter?: boolean;
  fetchEntries?: boolean;
  /** Subscribe to dashboard query fetch state for command-bar busy shimmer. */
  fetchDashboard?: boolean;
  /** Seed custom period from URL handoff (Dashboard → Reports). */
  initialCustomRange?: { from: string; to: string } | null;
  initialFieldIds?: AgencyReportFieldId[];
  initialShowWaste?: AgencyReportShowWaste;
  initialMergeSameTaskNames?: boolean;
  onFiltersApplied?: (snapshot: Omit<AgencyTimeRangeFilterSnapshot, "id" | "savedAt">) => void;
  /** Instant view-option changes (fields / show waste / merge) — keep URL sync off the Apply path. */
  onViewOptionsChange?: (options: {
    fieldIds: AgencyReportFieldId[];
    showWaste: AgencyReportShowWaste;
    mergeSameTaskNames: boolean;
  }) => void;
  /** Reports studio: choosers write applied scope immediately so the preview restyles. */
  liveApply?: boolean;
};

function sameIdList(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const leftSet = new Set(left);
  return right.every((value) => leftSet.has(value));
}

function buildProjectFilterGroups(
  projects: Array<{ id: string; name: string; clientName: string }>,
): AgencyFilterOptionGroup[] {
  const sortedProjects = [...projects].sort(
    (left, right) =>
      left.clientName.localeCompare(right.clientName) || left.name.localeCompare(right.name),
  );
  const groups: AgencyFilterOptionGroup[] = [];
  let currentGroup: AgencyFilterOptionGroup | null = null;

  for (const project of sortedProjects) {
    if (!currentGroup || currentGroup.groupLabel !== project.clientName) {
      currentGroup = { groupLabel: project.clientName, options: [] };
      groups.push(currentGroup);
    }
    currentGroup.options!.push({
      value: project.id,
      label: project.name,
      secondary: project.clientName,
      searchText: project.clientName,
    });
  }

  return groups;
}

export function resolveAgencyRangeFromPreset(
  preset: RangePreset,
  customFromDate: string,
  customToDate: string,
  tenurePolicy: Parameters<typeof getCurrentTenurePeriodRange>[0],
  now: Date,
  tenureMonthIndexes: number[] = [],
  weekStartsOn: number = DEFAULT_WORK_SCHEDULE.weekStartsOn,
): { from: string; to: string } {
  const endIso = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
  ).toISOString();
  const startOfTodayIso = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();

  switch (preset) {
    case "tenure": {
      const tenureRange = getCurrentTenurePeriodRange(tenurePolicy, now, tenureMonthIndexes);
      if (tenureRange) {
        return { from: tenureRange.from, to: tenureRange.to };
      }
      return {
        from: new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29),
        ).toISOString(),
        to: endIso,
      };
    }
    case "today":
      return { from: startOfTodayIso, to: endIso };
    case "week":
      return { from: startOfWeekUtc(weekStartsOn, now).toISOString(), to: endIso };
    case "month":
      return {
        from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString(),
        to: endIso,
      };
    case "last30":
      return {
        from: new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29),
        ).toISOString(),
        to: endIso,
      };
    case "custom":
      return {
        from: dateInputToIso(customFromDate),
        to: dateInputToIso(customToDate, true),
      };
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
}

export function useAgencyTimeRangeFilters({
  teamId,
  includeClientFilter = false,
  includeFieldsFilter = false,
  fetchEntries = false,
  fetchDashboard = false,
  initialCustomRange = null,
  initialFieldIds,
  initialShowWaste,
  initialMergeSameTaskNames,
  onFiltersApplied,
  onViewOptionsChange,
  liveApply = false,
}: UseAgencyTimeRangeFiltersOptions) {
  const defaultFieldIds = allAgencyReportFieldIds();
  const startingFieldIds = initialFieldIds ?? defaultFieldIds;
  const startingShowWaste = initialShowWaste ?? DEFAULT_AGENCY_REPORT_SHOW_WASTE;
  const startingMergeSameTaskNames =
    initialMergeSameTaskNames ?? DEFAULT_AGENCY_REPORT_MERGE_SAME_TASK_NAMES;
  const now = useMemo(() => new Date(), []);
  const seededCustomRange = initialCustomRange;
  const viewOptionsRef = useRef({
    fieldIds: startingFieldIds,
    showWaste: startingShowWaste,
    mergeSameTaskNames: startingMergeSameTaskNames,
  });

  function syncViewOptions(
    fieldIds: AgencyReportFieldId[],
    showWaste: AgencyReportShowWaste,
    mergeSameTaskNames: boolean,
  ) {
    viewOptionsRef.current = { fieldIds, showWaste, mergeSameTaskNames };
    onViewOptionsChange?.(viewOptionsRef.current);
  }

  const tenurePolicyQuery = useQuery({
    ...orpc.agencyOps.tenure.policy.get.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });
  const tenurePolicy = tenurePolicyQuery.data?.policy ?? null;
  const weekStartsOn = tenurePolicy?.weekStartsOn ?? DEFAULT_WORK_SCHEDULE.weekStartsOn;
  const defaultRangePreset = useMemo(
    () => resolveDefaultDashboardRangePreset(tenurePolicy),
    [tenurePolicy],
  );
  const defaultTenureMonthIndexes = useMemo(
    () => resolveDefaultTenureMonthIndexes(tenurePolicy, now),
    [now, tenurePolicy],
  );
  const tenureQuarterMonths = useMemo(
    () => getCurrentTenureQuarterMonths(tenurePolicy, now) ?? [],
    [now, tenurePolicy],
  );

  const [appliedRangePreset, setAppliedRangePreset] = useState<RangePreset | null>(
    seededCustomRange ? "custom" : null,
  );
  const effectiveAppliedRangePreset = appliedRangePreset ?? defaultRangePreset;
  const [appliedCustomFromDate, setAppliedCustomFromDate] = useState(
    seededCustomRange?.from ?? toDateInputValue(startOfWeekUtc(weekStartsOn, now)),
  );
  const [appliedCustomToDate, setAppliedCustomToDate] = useState(
    seededCustomRange?.to ?? toDateInputValue(now),
  );
  const [appliedClientIds, setAppliedClientIds] = useState<string[]>([]);
  const [appliedProjectIds, setAppliedProjectIds] = useState<string[]>([]);
  const [appliedMemberUserIds, setAppliedMemberUserIds] = useState<string[]>([]);
  const [appliedFieldIds, setAppliedFieldIds] = useState<AgencyReportFieldId[]>(startingFieldIds);
  const [appliedShowWaste, setAppliedShowWaste] =
    useState<AgencyReportShowWaste>(startingShowWaste);
  const [appliedMergeSameTaskNames, setAppliedMergeSameTaskNames] = useState(
    startingMergeSameTaskNames,
  );
  // null = unset (current tenure month); [] = explicit All Quarter
  const [appliedTenureMonthIndexes, setAppliedTenureMonthIndexes] = useState<number[] | null>(null);
  const effectiveAppliedTenureMonthIndexes = appliedTenureMonthIndexes ?? defaultTenureMonthIndexes;

  const [draftRangePreset, setDraftRangePreset] = useState<RangePreset | null>(
    seededCustomRange ? "custom" : null,
  );
  const effectiveDraftRangePreset = draftRangePreset ?? defaultRangePreset;
  const [draftCustomFromDate, setDraftCustomFromDate] = useState(
    seededCustomRange?.from ?? toDateInputValue(startOfWeekUtc(weekStartsOn, now)),
  );
  const [draftCustomToDate, setDraftCustomToDate] = useState(
    seededCustomRange?.to ?? toDateInputValue(now),
  );
  const [draftClientIds, setDraftClientIds] = useState<string[]>([]);
  const [draftProjectIds, setDraftProjectIds] = useState<string[]>([]);
  const [draftMemberUserIds, setDraftMemberUserIds] = useState<string[]>([]);
  const [draftFieldIds, setDraftFieldIds] = useState<AgencyReportFieldId[]>(startingFieldIds);
  const [draftShowWaste, setDraftShowWaste] = useState<AgencyReportShowWaste>(startingShowWaste);
  const [draftMergeSameTaskNames, setDraftMergeSameTaskNames] = useState(
    startingMergeSameTaskNames,
  );
  const [draftTenureMonthIndexes, setDraftTenureMonthIndexes] = useState<number[] | null>(null);
  const effectiveDraftTenureMonthIndexes = draftTenureMonthIndexes ?? defaultTenureMonthIndexes;
  const defaultCustomRangeRef = useRef({
    from: seededCustomRange?.from ?? toDateInputValue(startOfWeekUtc(weekStartsOn, now)),
    to: seededCustomRange?.to ?? toDateInputValue(now),
  });

  const tenurePeriodLabel = useMemo(
    () =>
      getCurrentTenurePeriodRange(tenurePolicy, now, effectiveDraftTenureMonthIndexes)
        ?.simpleLabel ?? null,
    [effectiveDraftTenureMonthIndexes, now, tenurePolicy],
  );
  const tenureQuarterLabel = useMemo(
    () => getCurrentTenurePeriodRange(tenurePolicy, now)?.simpleLabel ?? null,
    [now, tenurePolicy],
  );

  const hasPendingFilterChanges =
    effectiveDraftRangePreset !== effectiveAppliedRangePreset ||
    !sameIdList(draftProjectIds, appliedProjectIds) ||
    !sameIdList(draftMemberUserIds, appliedMemberUserIds) ||
    !sameIdList(
      effectiveDraftTenureMonthIndexes.map(String),
      effectiveAppliedTenureMonthIndexes.map(String),
    ) ||
    (includeClientFilter && !sameIdList(draftClientIds, appliedClientIds)) ||
    (includeFieldsFilter &&
      (!areSameReportFieldSets(draftFieldIds, appliedFieldIds) ||
        !areSameShowWaste(draftShowWaste, appliedShowWaste) ||
        draftMergeSameTaskNames !== appliedMergeSameTaskNames)) ||
    (effectiveDraftRangePreset === "custom" &&
      (draftCustomFromDate !== appliedCustomFromDate || draftCustomToDate !== appliedCustomToDate));

  const range = useMemo(
    () =>
      resolveAgencyRangeFromPreset(
        effectiveAppliedRangePreset,
        appliedCustomFromDate,
        appliedCustomToDate,
        tenurePolicy,
        now,
        effectiveAppliedTenureMonthIndexes,
        weekStartsOn,
      ),
    [
      appliedCustomFromDate,
      appliedCustomToDate,
      effectiveAppliedTenureMonthIndexes,
      effectiveAppliedRangePreset,
      now,
      tenurePolicy,
      weekStartsOn,
    ],
  );

  const applied: AgencyTimeRangeFilters = useMemo(
    () => ({
      range,
      clientIds: appliedClientIds.length > 0 ? appliedClientIds : undefined,
      projectIds: appliedProjectIds.length > 0 ? appliedProjectIds : undefined,
      memberUserIds: appliedMemberUserIds.length > 0 ? appliedMemberUserIds : undefined,
      ...(includeFieldsFilter
        ? {
            fields: appliedFieldIds,
            showWaste: appliedShowWaste,
            mergeSameTaskNames: appliedMergeSameTaskNames,
          }
        : {}),
    }),
    [
      appliedClientIds,
      appliedFieldIds,
      appliedMemberUserIds,
      appliedMergeSameTaskNames,
      appliedProjectIds,
      appliedShowWaste,
      includeFieldsFilter,
      range,
    ],
  );

  const projectsQuery = useQuery({
    ...orpc.agencyOps.projects.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });
  const clientsQuery = useAgencyClientsQuery(includeClientFilter ? teamId : "");
  const membersQuery = useQuery({
    ...orpc.team.members.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });

  const entriesQuery = useQuery({
    queryKey: [
      "agency-reports",
      "entries",
      teamId,
      range.from,
      range.to,
      appliedClientIds,
      appliedProjectIds,
      appliedMemberUserIds,
    ],
    queryFn: () =>
      fetchAllReportEntries(teamId, range, {
        clientIds: appliedClientIds.length > 0 ? appliedClientIds : undefined,
        projectIds: appliedProjectIds.length > 0 ? appliedProjectIds : undefined,
        memberUserIds: appliedMemberUserIds.length > 0 ? appliedMemberUserIds : undefined,
      }),
    enabled: Boolean(teamId) && fetchEntries,
    placeholderData: keepPreviousData,
  });

  const dashboardQuery = useQuery({
    ...orpc.agencyOps.reports.dashboard.queryOptions({
      input: {
        teamId,
        from: range.from,
        to: range.to,
        clientId: appliedClientIds.length === 1 ? appliedClientIds[0] : undefined,
        projectId: appliedProjectIds.length === 1 ? appliedProjectIds[0] : undefined,
        memberUserId: appliedMemberUserIds.length === 1 ? appliedMemberUserIds[0] : undefined,
        clientIds: appliedClientIds.length > 0 ? appliedClientIds : undefined,
        projectIds: appliedProjectIds.length > 0 ? appliedProjectIds : undefined,
        memberUserIds: appliedMemberUserIds.length > 0 ? appliedMemberUserIds : undefined,
      },
    }),
    enabled: Boolean(teamId) && fetchDashboard && !tenurePolicyQuery.isPending,
    placeholderData: keepPreviousData,
  });

  const projects = projectsQuery.data?.items ?? [];
  const clients = (clientsQuery.data?.items ?? []).map((client) => ({
    id: client.id,
    name: client.name,
  }));
  const filteredProjects = useMemo(() => {
    if (!includeClientFilter || draftClientIds.length === 0) return projects;
    const clientSet = new Set(draftClientIds);
    return projects.filter((project) => clientSet.has(project.clientId));
  }, [draftClientIds, includeClientFilter, projects]);
  const projectFilterGroups = useMemo(
    () => buildProjectFilterGroups(filteredProjects),
    [filteredProjects],
  );
  const members = (membersQuery.data?.items ?? []).map((member) => ({
    userId: member.userId,
    userName: member.userName,
  }));
  const clientOptions = clients.map((client) => ({ value: client.id, label: client.name }));
  const memberOptions = (membersQuery.data?.items ?? []).map((member) => ({
    value: member.userId,
    label: member.userName,
    avatar: {
      userId: member.userId,
      name: member.userName,
      avatarUrl: member.userAvatar,
    },
  }));
  const canReset = agencyTimeRangeCanReset({
    rangePreset: effectiveDraftRangePreset,
    defaultRangePreset,
    tenureMonthIndexes: effectiveDraftTenureMonthIndexes,
    defaultTenureMonthIndexes,
    clientIds: draftClientIds,
    projectIds: draftProjectIds,
    memberUserIds: draftMemberUserIds,
    customFromDate: draftCustomFromDate,
    customToDate: draftCustomToDate,
    defaultCustomFromDate: defaultCustomRangeRef.current.from,
    defaultCustomToDate: defaultCustomRangeRef.current.to,
  });

  function handleClientIdsChange(clientIds: string[]) {
    setDraftClientIds(clientIds);
    if (liveApply) setAppliedClientIds(clientIds);
    if (clientIds.length === 0 || draftProjectIds.length === 0) return;
    const clientSet = new Set(clientIds);
    const nextProjectIds = draftProjectIds.filter((projectId) => {
      const project = projects.find((entry) => entry.id === projectId);
      return project ? clientSet.has(project.clientId) : false;
    });
    if (!sameIdList(nextProjectIds, draftProjectIds)) {
      setDraftProjectIds(nextProjectIds);
      if (liveApply) setAppliedProjectIds(nextProjectIds);
    }
  }

  function buildSnapshot(
    preset: RangePreset,
    customFromDate: string,
    customToDate: string,
    clientIds: string[],
    projectIds: string[],
    memberUserIds: string[],
    fieldIds: AgencyReportFieldId[],
    showWaste: AgencyReportShowWaste,
    mergeSameTaskNames: boolean,
    tenureMonthIndexes: number[],
  ): Omit<AgencyTimeRangeFilterSnapshot, "id" | "savedAt"> {
    return {
      rangePreset: preset,
      customFromDate,
      customToDate,
      // Legacy single-id snapshot fields — prefer the array fields below.
      projectId: projectIds.length === 1 ? (projectIds[0] ?? "") : "",
      memberUserId: memberUserIds.length === 1 ? (memberUserIds[0] ?? "") : "",
      clientId: clientIds.length === 1 ? (clientIds[0] ?? "") : "",
      clientIds,
      projectIds,
      memberUserIds,
      fieldIds,
      showWaste,
      mergeSameTaskNames,
      tenureMonthIndexes,
      range: resolveAgencyRangeFromPreset(
        preset,
        customFromDate,
        customToDate,
        tenurePolicy,
        now,
        tenureMonthIndexes,
        weekStartsOn,
      ),
    };
  }

  function handleApply() {
    const nextFieldIds = draftFieldIds.length > 0 ? draftFieldIds : defaultFieldIds;
    const nextShowWaste = draftShowWaste;
    const nextMergeSameTaskNames = draftMergeSameTaskNames;
    if (draftFieldIds.length === 0) {
      setDraftFieldIds(nextFieldIds);
    }
    if (onFiltersApplied) {
      onFiltersApplied(
        buildSnapshot(
          effectiveDraftRangePreset,
          draftCustomFromDate,
          draftCustomToDate,
          draftClientIds,
          draftProjectIds,
          draftMemberUserIds,
          nextFieldIds,
          nextShowWaste,
          nextMergeSameTaskNames,
          effectiveDraftTenureMonthIndexes,
        ),
      );
    }
    setAppliedRangePreset(draftRangePreset);
    setAppliedCustomFromDate(draftCustomFromDate);
    setAppliedCustomToDate(draftCustomToDate);
    setAppliedClientIds(draftClientIds);
    setAppliedProjectIds(draftProjectIds);
    setAppliedMemberUserIds(draftMemberUserIds);
    setAppliedTenureMonthIndexes(draftTenureMonthIndexes);
    if (includeFieldsFilter) {
      setAppliedFieldIds(nextFieldIds);
      setAppliedShowWaste(nextShowWaste);
      setAppliedMergeSameTaskNames(nextMergeSameTaskNames);
      syncViewOptions(nextFieldIds, nextShowWaste, nextMergeSameTaskNames);
    }
  }

  function handleReset() {
    setDraftRangePreset(null);
    setDraftClientIds([]);
    setDraftProjectIds([]);
    setDraftMemberUserIds([]);
    setDraftTenureMonthIndexes(null);
    setAppliedClientIds([]);
    setAppliedProjectIds([]);
    setAppliedMemberUserIds([]);
    setAppliedTenureMonthIndexes(null);
    if (includeFieldsFilter) {
      setDraftFieldIds(defaultFieldIds);
      setAppliedFieldIds(defaultFieldIds);
      setDraftShowWaste(DEFAULT_AGENCY_REPORT_SHOW_WASTE);
      setAppliedShowWaste(DEFAULT_AGENCY_REPORT_SHOW_WASTE);
      setDraftMergeSameTaskNames(DEFAULT_AGENCY_REPORT_MERGE_SAME_TASK_NAMES);
      setAppliedMergeSameTaskNames(DEFAULT_AGENCY_REPORT_MERGE_SAME_TASK_NAMES);
      syncViewOptions(
        defaultFieldIds,
        DEFAULT_AGENCY_REPORT_SHOW_WASTE,
        DEFAULT_AGENCY_REPORT_MERGE_SAME_TASK_NAMES,
      );
    }
    setAppliedRangePreset(null);
  }

  function captureAppliedSnapshot(): Omit<AgencyTimeRangeFilterSnapshot, "id" | "savedAt"> {
    return buildSnapshot(
      effectiveAppliedRangePreset,
      appliedCustomFromDate,
      appliedCustomToDate,
      appliedClientIds,
      appliedProjectIds,
      appliedMemberUserIds,
      appliedFieldIds,
      appliedShowWaste,
      appliedMergeSameTaskNames,
      effectiveAppliedTenureMonthIndexes,
    );
  }

  function restoreSnapshot(snapshot: AgencyTimeRangeFilterSnapshot) {
    const storedPreset = snapshot.rangePreset === defaultRangePreset ? null : snapshot.rangePreset;
    const clientIds =
      snapshot.clientIds.length > 0
        ? snapshot.clientIds
        : snapshot.clientId
          ? [snapshot.clientId]
          : [];
    const projectIds =
      snapshot.projectIds.length > 0
        ? snapshot.projectIds
        : snapshot.projectId
          ? [snapshot.projectId]
          : [];
    const memberUserIds =
      snapshot.memberUserIds.length > 0
        ? snapshot.memberUserIds
        : snapshot.memberUserId
          ? [snapshot.memberUserId]
          : [];
    const tenureMonthIndexes = snapshot.tenureMonthIndexes ?? defaultTenureMonthIndexes;
    const sameAsDefault =
      tenureMonthIndexes.length === defaultTenureMonthIndexes.length &&
      tenureMonthIndexes.every((index, offset) => index === defaultTenureMonthIndexes[offset]);
    const storedTenureMonthIndexes = sameAsDefault ? null : tenureMonthIndexes;
    const showWaste = snapshot.showWaste ?? DEFAULT_AGENCY_REPORT_SHOW_WASTE;
    const mergeSameTaskNames =
      snapshot.mergeSameTaskNames ?? DEFAULT_AGENCY_REPORT_MERGE_SAME_TASK_NAMES;

    setDraftRangePreset(storedPreset);
    setDraftCustomFromDate(snapshot.customFromDate);
    setDraftCustomToDate(snapshot.customToDate);
    setDraftClientIds(clientIds);
    setDraftProjectIds(projectIds);
    setDraftMemberUserIds(memberUserIds);
    setDraftFieldIds(snapshot.fieldIds);
    setDraftShowWaste(showWaste);
    setDraftMergeSameTaskNames(mergeSameTaskNames);
    setDraftTenureMonthIndexes(storedTenureMonthIndexes);
    setAppliedRangePreset(storedPreset);
    setAppliedCustomFromDate(snapshot.customFromDate);
    setAppliedCustomToDate(snapshot.customToDate);
    setAppliedClientIds(clientIds);
    setAppliedProjectIds(projectIds);
    setAppliedMemberUserIds(memberUserIds);
    setAppliedFieldIds(snapshot.fieldIds);
    setAppliedShowWaste(showWaste);
    setAppliedMergeSameTaskNames(mergeSameTaskNames);
    setAppliedTenureMonthIndexes(storedTenureMonthIndexes);
    viewOptionsRef.current = { fieldIds: snapshot.fieldIds, showWaste, mergeSameTaskNames };
  }

  const isLoading =
    tenurePolicyQuery.isPending ||
    projectsQuery.isPending ||
    (includeClientFilter && clientsQuery.isPending);

  const isRefreshing =
    (fetchEntries && entriesQuery.isFetching && Boolean(entriesQuery.data)) ||
    (fetchDashboard && dashboardQuery.isFetching && Boolean(dashboardQuery.data));

  return {
    applied,
    isLoading,
    isRefreshing,
    isTenurePolicyPending: tenurePolicyQuery.isPending,
    projects,
    members,
    clients,
    entriesCount: entriesQuery.data?.length ?? 0,
    entriesFetching: entriesQuery.isFetching,
    captureAppliedSnapshot,
    restoreSnapshot,
    rangePreset: effectiveDraftRangePreset,
    onRangePresetChange: (preset: RangePreset) => {
      setDraftRangePreset(preset);
      if (liveApply) setAppliedRangePreset(preset);
    },
    customFromDate: draftCustomFromDate,
    onCustomFromChange: (value: string) => {
      setDraftCustomFromDate(value);
      if (liveApply) setAppliedCustomFromDate(value);
    },
    customToDate: draftCustomToDate,
    onCustomToChange: (value: string) => {
      setDraftCustomToDate(value);
      if (liveApply) setAppliedCustomToDate(value);
    },
    onApply: handleApply,
    hasPendingChanges: hasPendingFilterChanges,
    onReset: handleReset,
    canReset,
    tenureAvailable: Boolean(tenurePolicy?.enabled),
    tenurePeriodLabel,
    tenureQuarterLabel,
    tenureQuarterMonths,
    tenureMonthIndexes: effectiveDraftTenureMonthIndexes,
    onTenureMonthIndexesChange: (indexes: number[]) => {
      setDraftTenureMonthIndexes(indexes);
      if (liveApply) setAppliedTenureMonthIndexes(indexes);
    },
    showClientFilter: includeClientFilter,
    clientOptions,
    clientsLoading: clientsQuery.isPending,
    clientIds: draftClientIds,
    onClientIdsChange: handleClientIdsChange,
    projectIds: draftProjectIds,
    onProjectIdsChange: (projectIds: string[]) => {
      setDraftProjectIds(projectIds);
      if (liveApply) setAppliedProjectIds(projectIds);
    },
    memberUserIds: draftMemberUserIds,
    onMemberUserIdsChange: (memberUserIds: string[]) => {
      setDraftMemberUserIds(memberUserIds);
      if (liveApply) setAppliedMemberUserIds(memberUserIds);
    },
    memberOptions,
    projectFilterGroups,
    projectsLoading: projectsQuery.isPending,
  };
}
