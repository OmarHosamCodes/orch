import { Plus } from "lucide-react";
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "@/lib/navigation";
import { toast } from "sonner";

import {
  AgencyCommandBar,
  agencyCommandBarCustomRangeTriggerClass,
} from "@/features/shared/command-bar/agency-command-bar";
import { RangePresetChooser } from "@/features/shared/command-bar/range-preset-chooser";
import { AgencyMultiSelectFilter } from "@/features/shared/filters/agency-multi-select-filter";
import { MemberProfileLeaveRangePicker } from "@/features/shared/date/member-profile-leave-range-picker";
import { AgencyProjectCreateDialog } from "@/features/projects/agency-project-create-dialog";
import { AgencyReportHistoryMenu } from "@/features/reports/creator/agency-report-history-menu";
import {
  allAgencyReportFieldIds,
  areSameReportFieldSets,
  parseReportFieldsParam,
  serializeReportFieldsParam,
} from "@/features/reports/agency-report-fields";
import {
  areSameShowWaste,
  DEFAULT_AGENCY_REPORT_SHOW_WASTE,
  parseShowWasteParam,
  serializeShowWasteParam,
} from "@/features/reports/agency-report-show-waste";
import {
  AGENCY_REPORT_MERGE_TASKS_PARAM,
  parseMergeSameTaskNamesParam,
  serializeMergeSameTaskNamesParam,
} from "@/features/reports/agency-report-merge-tasks";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Skeleton } from "@/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";
import { suggestAgencyReportName } from "@/features/reports/agency-report-naming";
import type { AgencyListFiltersApplied } from "@/features/shared/use-agency-list-filters";
import { useAgencyListFilters } from "@/features/shared/use-agency-list-filters";
import type { AgencyTimeRangeFilters } from "@/features/shared/use-agency-time-range-filters";
import { useAgencyTimeRangeFilters } from "@/features/shared/use-agency-time-range-filters";
import { agencyReportHref, type AgencySegmentId } from "@/features/shared/agency-segments";
import { parseAgencyPeriodQuery } from "@/features/shared/agency-period-query";
import { orpcClient } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { AGENCY_CURRENCY_OPTIONS, parseBillableRateAmount } from "@/features/shared/format-rate";
import {
  selectIsClientMutationPending,
  useAgencyOpsStore,
} from "@/features/shared/stores/agency-ops";

type AgencySegmentSurfaceFilters =
  | { kind: "timeRange"; applied: AgencyTimeRangeFilters; isTenurePolicyPending: boolean }
  | { kind: "list"; applied: AgencyListFiltersApplied }
  | { kind: "none"; applied: null };

const AgencySegmentFiltersContext = createContext<AgencySegmentSurfaceFilters>({
  kind: "none",
  applied: null,
});

export function useAgencySegmentSurfaceFilters() {
  return useContext(AgencySegmentFiltersContext);
}

type AgencySegmentFiltersRootProps = {
  segment: AgencySegmentId;
  teamId: string;
  searchParams?: URLSearchParams;
  children: ReactNode;
};

function CommandBarSkeleton() {
  return <Skeleton className="h-[4.25rem] w-full rounded-2xl" />;
}

function TimeRangeCommandBar({
  timeRange,
  className,
  customRangeTriggerId,
  children,
}: {
  timeRange: ReturnType<typeof useAgencyTimeRangeFilters>;
  className?: string;
  customRangeTriggerId: string;
  children?: ReactNode;
}) {
  return (
    <AgencyCommandBar.Root
      className={className}
      busy={timeRange.isRefreshing}
      busyLabel="Refreshing"
    >
      <AgencyCommandBar.Start>
        {timeRange.showClientFilter ? (
          <AgencyMultiSelectFilter
            label="All Clients"
            values={timeRange.clientIds}
            options={timeRange.clientOptions}
            onValuesChange={timeRange.onClientIdsChange}
            disabled={timeRange.clientsLoading}
            searchPlaceholder="Search clients"
          />
        ) : null}
        <AgencyMultiSelectFilter
          label="All Projects"
          values={timeRange.projectIds}
          groups={timeRange.projectFilterGroups}
          onValuesChange={timeRange.onProjectIdsChange}
          disabled={timeRange.projectsLoading}
          searchPlaceholder="Search projects or clients"
        />
        <AgencyMultiSelectFilter
          label="Team"
          values={timeRange.memberUserIds}
          options={timeRange.memberOptions}
          onValuesChange={timeRange.onMemberUserIdsChange}
          searchPlaceholder="Search people"
        />
        <RangePresetChooser
          value={timeRange.rangePreset}
          onChange={timeRange.onRangePresetChange}
          tenureAvailable={timeRange.tenureAvailable}
          tenurePeriodLabel={timeRange.tenurePeriodLabel}
          tenureQuarterLabel={timeRange.tenureQuarterLabel}
          tenureQuarterMonths={timeRange.tenureQuarterMonths}
          tenureMonthIndexes={timeRange.tenureMonthIndexes}
          onTenureMonthIndexesChange={timeRange.onTenureMonthIndexesChange}
        />
        {timeRange.rangePreset === "custom" ? (
          <MemberProfileLeaveRangePicker
            triggerId={customRangeTriggerId}
            startDate={timeRange.customFromDate}
            endDate={timeRange.customToDate}
            emptyLabel="Select dates"
            ariaLabel="Custom date range"
            triggerClassName={agencyCommandBarCustomRangeTriggerClass}
            onRangeChange={(next) => {
              timeRange.onCustomFromChange(next.startDate);
              timeRange.onCustomToChange(next.endDate);
            }}
          />
        ) : null}
      </AgencyCommandBar.Start>
      <AgencyCommandBar.End>
        <AgencyCommandBar.Apply
          disabled={!timeRange.hasPendingChanges}
          onClick={timeRange.onApply}
        />
        {timeRange.canReset ? <AgencyCommandBar.Reset onClick={timeRange.onReset} /> : null}
        {children}
      </AgencyCommandBar.End>
    </AgencyCommandBar.Root>
  );
}

function ListFilterCommandBar({
  listFilters,
  searchPlaceholder,
  showArchiveFilter = false,
  showTrashFilter = false,
  children,
}: {
  listFilters: ReturnType<typeof useAgencyListFilters>;
  searchPlaceholder: string;
  showArchiveFilter?: boolean;
  showTrashFilter?: boolean;
  children?: ReactNode;
}) {
  return (
    <AgencyCommandBar.Root busy={listFilters.isRefreshing} busyLabel="Refreshing list">
      <AgencyCommandBar.Start>
        <AgencyCommandBar.Search
          value={listFilters.filterTerm}
          onValueChange={listFilters.onFilterTermChange}
          placeholder={searchPlaceholder}
        />
        <AgencyMultiSelectFilter
          label="All People"
          values={listFilters.selectedPeopleIds}
          options={listFilters.peopleOptions}
          onValuesChange={listFilters.onSelectedPeopleIdsChange}
          disabled={listFilters.peopleLoading}
          searchPlaceholder="Search people"
        />
        <AgencyMultiSelectFilter
          label="All Clients"
          values={listFilters.selectedClientIds}
          options={listFilters.clientOptions}
          onValuesChange={listFilters.onSelectedClientIdsChange}
          disabled={listFilters.clientsLoading}
          searchPlaceholder="Search clients"
          statusFilter={showArchiveFilter ? listFilters.archiveStatusFilter : undefined}
        />
        <AgencyMultiSelectFilter
          label="All Projects"
          values={listFilters.selectedProjectIds}
          groups={listFilters.projectFilterGroups}
          onValuesChange={listFilters.onSelectedProjectIdsChange}
          disabled={listFilters.projectsLoading}
          searchPlaceholder="Search projects or clients"
          statusFilter={
            showTrashFilter
              ? listFilters.trashStatusFilter
              : showArchiveFilter
                ? listFilters.archiveStatusFilter
                : undefined
          }
        />
        <AgencyMultiSelectFilter
          label="All Tasks"
          values={listFilters.selectedTaskIds}
          groups={listFilters.taskFilterGroups}
          onValuesChange={listFilters.onSelectedTaskIdsChange}
          disabled={listFilters.tasksLoading}
          searchPlaceholder="Search tasks, projects, or clients"
        />
      </AgencyCommandBar.Start>
      <AgencyCommandBar.End>
        <AgencyCommandBar.Apply
          disabled={!listFilters.hasPendingChanges}
          onClick={listFilters.onApply}
        />
        {listFilters.canReset ? <AgencyCommandBar.Reset onClick={listFilters.onReset} /> : null}
        {children}
      </AgencyCommandBar.End>
    </AgencyCommandBar.Root>
  );
}

function DashboardFiltersRoot({
  teamId,
  showBar,
  children,
}: {
  teamId: string;
  showBar: boolean;
  children: ReactNode;
}) {
  const timeRange = useAgencyTimeRangeFilters({
    teamId,
    includeClientFilter: true,
    fetchDashboard: true,
  });

  return (
    <AgencySegmentFiltersContext.Provider
      value={{
        kind: "timeRange",
        applied: timeRange.applied,
        isTenurePolicyPending: timeRange.isTenurePolicyPending,
      }}
    >
      <div className="space-y-4">
        {showBar ? (
          timeRange.isLoading ? (
            <CommandBarSkeleton />
          ) : (
            <TimeRangeCommandBar
              timeRange={timeRange}
              customRangeTriggerId="agency-dashboard-custom-range"
            />
          )
        ) : null}
        {children}
      </div>
    </AgencySegmentFiltersContext.Provider>
  );
}

function ReportsFiltersRoot({
  teamId,
  showBar,
  searchParams,
  children,
}: {
  teamId: string;
  showBar: boolean;
  searchParams: URLSearchParams;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const [creatingReport, setCreatingReport] = useState(false);

  const initialFieldIds = useMemo(
    () => parseReportFieldsParam(searchParams.get("fields")),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once from the landing URL
    [],
  );
  const initialShowWaste = useMemo(
    () => parseShowWasteParam(searchParams.get("showWaste")),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once from the landing URL
    [],
  );
  const initialMergeSameTaskNames = useMemo(
    () => parseMergeSameTaskNamesParam(searchParams.get(AGENCY_REPORT_MERGE_TASKS_PARAM)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once from the landing URL
    [],
  );
  const initialCustomRange = useMemo(
    () => parseAgencyPeriodQuery(searchParams),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once from the landing URL
    [],
  );

  const syncReportFilterParams = useCallback(
    (
      fieldIds: typeof initialFieldIds,
      showWaste: typeof initialShowWaste,
      mergeSameTaskNames: typeof initialMergeSameTaskNames,
    ) => {
      const currentFields = parseReportFieldsParam(searchParams.get("fields"));
      const currentShowWaste = parseShowWasteParam(searchParams.get("showWaste"));
      const currentMergeSameTaskNames = parseMergeSameTaskNamesParam(
        searchParams.get(AGENCY_REPORT_MERGE_TASKS_PARAM),
      );
      if (
        areSameReportFieldSets(fieldIds, currentFields) &&
        areSameShowWaste(showWaste, currentShowWaste) &&
        mergeSameTaskNames === currentMergeSameTaskNames
      ) {
        return;
      }
      const next = new URLSearchParams(searchParams);
      next.delete("section");
      next.delete("report");
      if (areSameReportFieldSets(fieldIds, allAgencyReportFieldIds())) {
        next.delete("fields");
      } else {
        next.set("fields", serializeReportFieldsParam(fieldIds));
      }
      if (areSameShowWaste(showWaste, DEFAULT_AGENCY_REPORT_SHOW_WASTE)) {
        next.delete("showWaste");
      } else {
        next.set("showWaste", serializeShowWasteParam(showWaste));
      }
      const mergeParam = serializeMergeSameTaskNamesParam(mergeSameTaskNames);
      if (!mergeParam) {
        next.delete(AGENCY_REPORT_MERGE_TASKS_PARAM);
      } else {
        next.set(AGENCY_REPORT_MERGE_TASKS_PARAM, mergeParam);
      }
      const query = next.toString();
      // Router updates are secondary; don't block the table paint.
      startTransition(() => {
        navigate(query ? `/agency/reports?${query}` : "/agency/reports", { replace: true });
      });
    },
    [navigate, searchParams],
  );

  const timeRange = useAgencyTimeRangeFilters({
    teamId,
    includeClientFilter: true,
    includeFieldsFilter: true,
    fetchEntries: true,
    initialCustomRange,
    initialFieldIds,
    initialShowWaste,
    initialMergeSameTaskNames,
    onViewOptionsChange: ({ fieldIds, showWaste, mergeSameTaskNames }) => {
      syncReportFilterParams(fieldIds, showWaste, mergeSameTaskNames);
    },
  });

  const searchContext = {
    clients: timeRange.clients,
    members: timeRange.members,
  };

  const openSavedReport = useCallback(
    (
      reportId: string,
      options?: { preserveShowWaste?: boolean; preserveMergeSameTaskNames?: boolean },
    ) => {
      const next = new URLSearchParams();
      if (options?.preserveShowWaste) {
        const showWaste = searchParams.get("showWaste");
        if (showWaste) next.set("showWaste", showWaste);
      }
      if (options?.preserveMergeSameTaskNames) {
        const mergeTasks = searchParams.get(AGENCY_REPORT_MERGE_TASKS_PARAM);
        if (mergeTasks) next.set(AGENCY_REPORT_MERGE_TASKS_PARAM, mergeTasks);
      }
      const query = next.toString();
      navigate(query ? `${agencyReportHref(reportId)}?${query}` : agencyReportHref(reportId));
    },
    [navigate, searchParams],
  );

  async function openReportCreator() {
    if (creatingReport) return;
    setCreatingReport(true);
    try {
      const snapshot = timeRange.captureAppliedSnapshot();
      const name = suggestAgencyReportName(
        {
          range: snapshot.range,
          clientId:
            snapshot.clientIds.length === 1
              ? snapshot.clientIds[0]
              : snapshot.clientId || undefined,
          memberUserId:
            snapshot.memberUserIds.length === 1
              ? snapshot.memberUserIds[0]
              : snapshot.memberUserId || undefined,
        },
        searchContext,
      );

      const report = await orpcClient.agencyOps.reports.saved.create({
        teamId,
        name,
        rangePreset: snapshot.rangePreset,
        customFromDate: snapshot.customFromDate,
        customToDate: snapshot.customToDate,
        rangeFrom: snapshot.range.from,
        rangeTo: snapshot.range.to,
        clientId: snapshot.clientIds.join(",") || snapshot.clientId || undefined,
        projectId: snapshot.projectIds.join(",") || snapshot.projectId || undefined,
        memberUserId: snapshot.memberUserIds.join(",") || snapshot.memberUserId || undefined,
        fieldIds: snapshot.fieldIds,
      });

      openSavedReport(report.id, {
        preserveShowWaste: true,
        preserveMergeSameTaskNames: true,
      });
    } catch (error) {
      toast.error("Couldn't create report", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      setCreatingReport(false);
    }
  }

  return (
    <AgencySegmentFiltersContext.Provider
      value={{
        kind: "timeRange",
        applied: timeRange.applied,
        isTenurePolicyPending: timeRange.isTenurePolicyPending,
      }}
    >
      <div className="space-y-4">
        {showBar ? (
          timeRange.isLoading ? (
            <CommandBarSkeleton />
          ) : (
            <TimeRangeCommandBar
              timeRange={timeRange}
              className="rounded-dense"
              customRangeTriggerId="agency-reports-custom-range"
            >
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button
                        size="sm"
                        disabled={
                          timeRange.entriesCount === 0 ||
                          timeRange.entriesFetching ||
                          creatingReport
                        }
                        onClick={() => void openReportCreator()}
                      >
                        {creatingReport ? "Creating report…" : "Create report"}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {timeRange.entriesCount === 0 || timeRange.entriesFetching ? (
                    <TooltipContent side="bottom">
                      {timeRange.entriesFetching
                        ? "Still loading hours…"
                        : "No hours in this range. Widen dates or reset filters."}
                    </TooltipContent>
                  ) : null}
                </Tooltip>
              </TooltipProvider>
              <AgencyReportHistoryMenu
                teamId={teamId}
                searchContext={searchContext}
                onSelectReport={openSavedReport}
              />
            </TimeRangeCommandBar>
          )
        ) : null}
        {children}
      </div>
    </AgencySegmentFiltersContext.Provider>
  );
}

const AgencyClientsActionsContext = createContext<{ openNewClient: () => void }>({
  openNewClient: () => {},
});

export function useAgencyClientsActions() {
  return useContext(AgencyClientsActionsContext);
}

function ClientsFiltersRoot({
  teamId,
  showBar,
  children,
}: {
  teamId: string;
  showBar: boolean;
  children: ReactNode;
}) {
  const agencyOps = useAgencyOpsStore();
  const isClientMutationPending = useAgencyOpsStore(selectIsClientMutationPending);
  const listFilters = useAgencyListFilters({ teamId });
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientCategory, setNewClientCategory] = useState<"internal" | "external">("external");
  const [newClientBillableRate, setNewClientBillableRate] = useState("");
  const [newClientCurrency, setNewClientCurrency] = useState("USD");

  function resetNewClientForm() {
    setNewClientName("");
    setNewClientCategory("external");
    setNewClientBillableRate("");
    setNewClientCurrency("USD");
  }

  async function createClient() {
    const name = newClientName.trim();
    if (!name || !teamId) return;

    const billableRateAmount = parseBillableRateAmount(newClientBillableRate);
    if (newClientBillableRate.trim() && billableRateAmount === null) return;

    resetNewClientForm();
    setNewClientOpen(false);
    await agencyOps.createClient({
      teamId,
      name,
      category: newClientCategory,
      billableRateAmount,
      currency: newClientCurrency,
    });
  }

  return (
    <AgencySegmentFiltersContext.Provider value={{ kind: "list", applied: listFilters.applied }}>
      <AgencyClientsActionsContext.Provider value={{ openNewClient: () => setNewClientOpen(true) }}>
        <div className="space-y-4">
          {showBar ? (
            listFilters.isLoading ? (
              <CommandBarSkeleton />
            ) : (
              <ListFilterCommandBar
                listFilters={listFilters}
                searchPlaceholder="Filter clients"
                showArchiveFilter
              >
                <Popover open={newClientOpen} onOpenChange={setNewClientOpen}>
                  <PopoverTrigger asChild>
                    <Button size="sm" disabled={!teamId}>
                      <Plus />
                      New client
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-72 space-y-2 p-3">
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void createClient();
                      }}
                    >
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                        New client
                      </p>
                      <Input
                        value={newClientName}
                        onChange={(event) => setNewClientName(event.target.value)}
                        placeholder="Client name"
                        className="mt-2"
                        autoFocus
                      />
                      <div className="mt-2">
                        <label className="text-[11px] font-bold text-muted">Category</label>
                        <select
                          value={newClientCategory}
                          onChange={(event) =>
                            setNewClientCategory(event.target.value as "internal" | "external")
                          }
                          className="mt-1 flex h-9 w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted"
                        >
                          <option value="external">External</option>
                          <option value="internal">Internal</option>
                        </select>
                      </div>
                      <div className="mt-2">
                        <label className="text-[11px] font-bold text-muted">
                          Billable rate / hour
                        </label>
                        <div className="mt-1 flex gap-2">
                          <Input
                            value={newClientBillableRate}
                            onChange={(event) => setNewClientBillableRate(event.target.value)}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Optional"
                            className="min-w-0 flex-1"
                          />
                          <Select value={newClientCurrency} onValueChange={setNewClientCurrency}>
                            <SelectTrigger
                              aria-label="Rate currency"
                              className="w-[5.5rem] shrink-0"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {AGENCY_CURRENCY_OPTIONS.map((code) => (
                                <SelectItem key={code} value={code}>
                                  {code}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button
                        type="submit"
                        size="sm"
                        className="mt-2 w-full"
                        disabled={
                          !newClientName.trim() ||
                          isClientMutationPending ||
                          Boolean(
                            newClientBillableRate.trim() &&
                            parseBillableRateAmount(newClientBillableRate) === null,
                          )
                        }
                      >
                        Create
                      </Button>
                    </form>
                  </PopoverContent>
                </Popover>
              </ListFilterCommandBar>
            )
          ) : null}
          {children}
        </div>
      </AgencyClientsActionsContext.Provider>
    </AgencySegmentFiltersContext.Provider>
  );
}

const AgencyProjectsActionsContext = createContext<{ openNewProject: () => void }>({
  openNewProject: () => {},
});

export function useAgencyProjectsActions() {
  return useContext(AgencyProjectsActionsContext);
}

function ProjectsFiltersRoot({
  teamId,
  showBar,
  children,
}: {
  teamId: string;
  showBar: boolean;
  children: ReactNode;
}) {
  const listFilters = useAgencyListFilters({ teamId });
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  return (
    <AgencySegmentFiltersContext.Provider value={{ kind: "list", applied: listFilters.applied }}>
      <AgencyProjectsActionsContext.Provider
        value={{ openNewProject: () => setNewProjectOpen(true) }}
      >
        <div className="space-y-4">
          {showBar ? (
            listFilters.isLoading ? (
              <CommandBarSkeleton />
            ) : (
              <ListFilterCommandBar
                listFilters={listFilters}
                searchPlaceholder="Search projects"
                showArchiveFilter
                showTrashFilter
              >
                <Button
                  size="sm"
                  disabled={!teamId || listFilters.clients.length === 0}
                  onClick={() => setNewProjectOpen(true)}
                >
                  <Plus />
                  New project
                </Button>
              </ListFilterCommandBar>
            )
          ) : null}
          <AgencyProjectCreateDialog
            open={newProjectOpen}
            onOpenChange={setNewProjectOpen}
            teamId={teamId}
            clients={listFilters.clients}
          />
          {children}
        </div>
      </AgencyProjectsActionsContext.Provider>
    </AgencySegmentFiltersContext.Provider>
  );
}

function NoFiltersRoot({ children }: { children: ReactNode }) {
  return (
    <AgencySegmentFiltersContext.Provider value={{ kind: "none", applied: null }}>
      {children}
    </AgencySegmentFiltersContext.Provider>
  );
}

export function AgencySegmentFiltersRoot({
  segment,
  teamId,
  searchParams,
  children,
}: AgencySegmentFiltersRootProps) {
  switch (segment) {
    case "dashboard":
      return (
        <DashboardFiltersRoot teamId={teamId} showBar>
          {children}
        </DashboardFiltersRoot>
      );
    case "reports":
      return (
        <ReportsFiltersRoot
          teamId={teamId}
          showBar
          searchParams={searchParams ?? new URLSearchParams()}
        >
          {children}
        </ReportsFiltersRoot>
      );
    case "clients":
      return (
        <ClientsFiltersRoot teamId={teamId} showBar>
          {children}
        </ClientsFiltersRoot>
      );
    case "projects":
      return (
        <ProjectsFiltersRoot teamId={teamId} showBar>
          {children}
        </ProjectsFiltersRoot>
      );
    default:
      return <NoFiltersRoot>{children}</NoFiltersRoot>;
  }
}
