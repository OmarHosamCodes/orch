import { AlertTriangle, Archive, ArchiveRestore, Building2, Plus } from "lucide-react";

import { AgencyProjectCreateDialog } from "@/features/projects/agency-project-create-dialog";
import { AgencySearchHighlight } from "@/features/shared/agency-search-highlight";
import {
  agencyEmptyPanelClass,
  agencyErrorPanelClass,
  agencyFocusRingClass,
  agencyLabelClass,
} from "@/features/shared/agency-ui";
import {
  AGENCY_CURRENCY_OPTIONS,
  catalogRateAmount,
  formatRate,
  parseBillableRateAmount,
} from "@/features/shared/format-rate";
import { projectHueStyle } from "@/features/shared/project-palette";
import { agencyListSearchMatches } from "@/features/shared/agency-list-search";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils/format-duration";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { SurfaceShimmer } from "@/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";

import type { AgencyClientsTableViewModel } from "./hooks/use-agency-clients-table";

type AgencyClientsTableViewProps = {
  viewModel: AgencyClientsTableViewModel;
  searchQuery: string;
  teamId: string;
  onSelect: (clientId: string) => void;
};

function ClientCategoryBadge({ category }: { category: "internal" | "external" }) {
  const isInternal = category === "internal";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-1 text-[11px] font-bold capitalize",
        isInternal ? "border border-default bg-default text-muted" : "bg-elevated text-highlighted",
      )}
    >
      {isInternal ? "Internal" : "External"}
    </span>
  );
}

export function AgencyClientsTableView({
  viewModel,
  searchQuery,
  teamId,
  onSelect,
}: AgencyClientsTableViewProps) {
  const {
    openNewClient,
    isOwner,
    filteredClients,
    projectsByClient,
    weekHoursByClient,
    clients,
    isLoading,
    isError,
    errorMessage,
    refetch,
    isClientMutationPending,
    editClientId,
    setEditClientId,
    editNameDraft,
    setEditNameDraft,
    editCategoryDraft,
    setEditCategoryDraft,
    editBillableRateDraft,
    setEditBillableRateDraft,
    editCurrencyDraft,
    setEditCurrencyDraft,
    saveClientEdits,
    createProjectClientId,
    setCreateProjectClientId,
    createProjectClients,
    archiveClient,
    unarchiveClient,
  } = viewModel;

  if (isLoading) {
    return <SurfaceShimmer className="min-h-80" label="Loading clients" />;
  }

  if (isError) {
    return (
      <div className={agencyErrorPanelClass} role="alert">
        <AlertTriangle className="mx-auto size-5 text-error" />
        <p className="mt-3 text-sm font-bold text-highlighted">Couldn&apos;t load clients.</p>
        <p className="mt-1 text-xs text-muted">{errorMessage}</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={refetch}>
          Retry
        </Button>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className={agencyEmptyPanelClass}>
        <Building2 className="mx-auto size-6 text-muted" />
        <p className="mt-3 text-sm font-bold text-highlighted">No clients yet.</p>
        <p className="mt-1 text-xs text-muted">
          Add your first client to start grouping projects and time.
        </p>
        {isOwner ? (
          <Button variant="secondary" size="sm" className="mt-4" onClick={openNewClient}>
            <Plus />
            New client
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      {filteredClients.length === 0 ? (
        <div className="rounded-surface border border-default bg-default p-surface text-center">
          <p className="text-sm font-bold text-highlighted">No clients match.</p>
          <p className="mt-1 text-xs text-muted">Try a different search or archive filter.</p>
        </div>
      ) : (
        <div className="agency-clients overflow-x-auto rounded-surface border border-default bg-default">
          <table className="w-full min-w-[68rem] text-xs">
            <thead className="border-b border-default bg-muted">
              <tr className={agencyLabelClass}>
                <th scope="col" className="px-4 py-2.5 font-bold">
                  Client
                </th>
                <th scope="col" className="px-3 py-2.5 font-bold">
                  Category
                </th>
                <th scope="col" className="px-3 py-2.5 font-bold">
                  Rate
                </th>
                <th scope="col" className="px-3 py-2.5 font-bold">
                  Projects
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-bold">
                  Hours · this week
                </th>
                <th scope="col" className="px-3 py-2.5 font-bold">
                  Status
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-bold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => {
                const clientProjects = projectsByClient.get(client.id) ?? [];
                const isArchived = Boolean(client.archivedAt);
                const visibleProjects =
                  searchQuery.trim() === ""
                    ? clientProjects.slice(0, 3)
                    : [...clientProjects]
                        .sort(
                          (left, right) =>
                            Number(agencyListSearchMatches(searchQuery, right.name)) -
                            Number(agencyListSearchMatches(searchQuery, left.name)),
                        )
                        .slice(0, 3);

                return (
                  <tr
                    key={client.id}
                    data-client-id={client.id}
                    className={cn(
                      "group cursor-pointer border-b border-default transition-colors last:border-b-0 hover:bg-elevated/40 motion-reduce:transition-none",
                      agencyFocusRingClass,
                    )}
                    onClick={() => onSelect(client.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelect(client.id);
                      }
                    }}
                    tabIndex={0}
                    aria-label={`Open ${client.name}`}
                  >
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "truncate font-bold",
                          isArchived ? "text-muted" : "text-highlighted",
                        )}
                      >
                        <AgencySearchHighlight text={client.name} query={searchQuery} />
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <ClientCategoryBadge category={client.category} />
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "font-mono font-bold tabular-nums",
                          catalogRateAmount(
                            client.sourceBillableRateAmount,
                            client.billableRateAmount,
                          ) === null
                            ? "text-dimmed"
                            : "text-highlighted",
                        )}
                      >
                        {formatRate(
                          catalogRateAmount(
                            client.sourceBillableRateAmount,
                            client.billableRateAmount,
                          ),
                          client.currency,
                          { perHour: true },
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {clientProjects.length > 0 ? (
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          {visibleProjects.map((project) => (
                            <span
                              key={project.id}
                              className="inline-flex max-w-36 items-center gap-1.5 rounded-full bg-elevated px-2 py-1 text-[11px] font-bold text-muted"
                            >
                              <span
                                className="inline-block size-1.5 shrink-0 rounded-full"
                                aria-hidden="true"
                                style={projectHueStyle(project.id)}
                              />
                              <span className="truncate">
                                <AgencySearchHighlight text={project.name} query={searchQuery} />
                              </span>
                            </span>
                          ))}
                          {clientProjects.length > visibleProjects.length ? (
                            <span className="text-[11px] text-dimmed">
                              +{clientProjects.length - visibleProjects.length} more
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-dimmed">No projects</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span
                        className={cn(
                          "font-mono font-bold tabular-nums",
                          (weekHoursByClient.get(client.id) ?? 0) > 0
                            ? "text-highlighted"
                            : "text-dimmed",
                        )}
                      >
                        {formatDuration(weekHoursByClient.get(client.id) ?? 0, "short")}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-1 text-[11px] font-bold",
                          isArchived
                            ? "border border-default bg-default text-muted"
                            : "bg-elevated text-highlighted",
                        )}
                      >
                        {isArchived ? "Archived" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                      <div className="flex justify-end gap-1.5 opacity-80 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none">
                        {isOwner && !isArchived ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={`New project for ${client.name}`}
                                onClick={() => setCreateProjectClientId(client.id)}
                              >
                                <Plus />
                                <span className="sr-only sm:not-sr-only">Project</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>New project</TooltipContent>
                          </Tooltip>
                        ) : null}

                        {isOwner && !isArchived ? (
                          <Popover
                            open={editClientId === client.id}
                            onOpenChange={(open) => setEditClientId(open ? client.id : "")}
                          >
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm">
                                Edit
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-72 space-y-2 p-3">
                              <form
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  saveClientEdits(client.id);
                                }}
                              >
                                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                                  Edit client
                                </p>
                                <div className="mt-2 space-y-2">
                                  <div>
                                    <Label
                                      htmlFor={`edit-client-name-${client.id}`}
                                      className="text-[11px] font-bold"
                                    >
                                      Name
                                    </Label>
                                    <Input
                                      id={`edit-client-name-${client.id}`}
                                      value={editNameDraft}
                                      onChange={(e) => setEditNameDraft(e.target.value)}
                                      className="mt-1"
                                      autoFocus
                                    />
                                  </div>
                                  <div>
                                    <Label
                                      htmlFor={`edit-client-category-${client.id}`}
                                      className="text-[11px] font-bold"
                                    >
                                      Category
                                    </Label>
                                    <Select
                                      value={editCategoryDraft}
                                      onValueChange={(value) =>
                                        setEditCategoryDraft(value as "internal" | "external")
                                      }
                                    >
                                      <SelectTrigger
                                        id={`edit-client-category-${client.id}`}
                                        className="mt-1 w-full"
                                      >
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="external">External</SelectItem>
                                        <SelectItem value="internal">Internal</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label
                                      htmlFor={`edit-client-rate-${client.id}`}
                                      className="text-[11px] font-bold"
                                    >
                                      Catalog rate / hour
                                    </Label>
                                    <div className="mt-1 flex gap-2">
                                      <Input
                                        id={`edit-client-rate-${client.id}`}
                                        value={editBillableRateDraft}
                                        onChange={(e) => setEditBillableRateDraft(e.target.value)}
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="Leave blank if not set"
                                        className="min-w-0 flex-1"
                                      />
                                      <Select
                                        value={editCurrencyDraft}
                                        onValueChange={setEditCurrencyDraft}
                                      >
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
                                </div>
                                <Button
                                  type="submit"
                                  size="sm"
                                  className="mt-2 w-full"
                                  disabled={
                                    !editNameDraft.trim() ||
                                    isClientMutationPending ||
                                    Boolean(
                                      editBillableRateDraft.trim() &&
                                      parseBillableRateAmount(editBillableRateDraft) === null,
                                    )
                                  }
                                >
                                  Save
                                </Button>
                              </form>
                            </PopoverContent>
                          </Popover>
                        ) : null}

                        {isOwner ? (
                          isArchived ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={isClientMutationPending}
                                  aria-label={`Unarchive ${client.name}`}
                                  onClick={() => unarchiveClient(client.id)}
                                >
                                  <ArchiveRestore />
                                  <span className="sr-only sm:not-sr-only">Unarchive</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Restore to active clients</TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={isClientMutationPending}
                                  aria-label={`Archive ${client.name}`}
                                  onClick={() => archiveClient(client.id)}
                                >
                                  <Archive />
                                  <span className="sr-only sm:not-sr-only">Archive</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Archive client</TooltipContent>
                            </Tooltip>
                          )
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AgencyProjectCreateDialog
        open={Boolean(createProjectClientId)}
        onOpenChange={(open) => {
          if (!open) setCreateProjectClientId("");
        }}
        teamId={teamId}
        clients={createProjectClients}
        lockClientId={createProjectClientId || undefined}
      />
    </TooltipProvider>
  );
}
