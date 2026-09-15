import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  Building2,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { useRef } from "react";

import { AgencySearchHighlight } from "@/features/shared/agency-search-highlight";
import {
  agencyEmptyPanelClass,
  agencyErrorPanelClass,
  agencyFocusRingClass,
  agencyLabelClass,
  agencyWorkMetaClass,
  agencyWorkMetricClass,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Popover, PopoverAnchor, PopoverContent } from "@/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { SurfaceShimmer } from "@/ui/skeleton";

import { clientBookNeedLabel, type ClientBookNeedId } from "./clients-book-corridors";
import type {
  AgencyClientsBookRow,
  AgencyClientsTableViewModel,
} from "./hooks/use-agency-clients-table";

type AgencyClientsTableViewProps = {
  viewModel: AgencyClientsTableViewModel;
  searchQuery: string;
  onSelect: (clientId: string) => void;
};

function CategoryMark({ category }: { category: "internal" | "external" }) {
  const isInternal = category === "internal";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold capitalize",
        isInternal ? "border border-default bg-default text-muted" : "bg-elevated text-highlighted",
      )}
    >
      {isInternal ? "Internal" : "External"}
    </span>
  );
}

function NeedChip({ id }: { id: ClientBookNeedId }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-sm px-1.5 py-0.5 text-[10px] font-bold tracking-[0.04em]",
        id === "invoice" || id === "outstanding"
          ? "bg-warning/15 text-warning"
          : "bg-elevated text-muted",
      )}
    >
      {clientBookNeedLabel(id)}
    </span>
  );
}

function WeekHeat({ share, durationSeconds }: { share: number; durationSeconds: number }) {
  const width = `${Math.round(Math.min(1, Math.max(0, share)) * 100)}%`;
  return (
    <div className="flex min-w-0 flex-col items-end gap-1">
      <span
        className={cn(
          agencyWorkMetricClass,
          "text-right text-xs",
          durationSeconds > 0 ? "text-highlighted" : "text-dimmed",
        )}
      >
        {formatDuration(durationSeconds, "short")}
      </span>
      <div className="h-1 w-24 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div
          className="h-full rounded-full bg-foreground motion-reduce:transition-none"
          style={{ width }}
        />
      </div>
    </div>
  );
}

function ClientBookRow({
  client,
  searchQuery,
  viewModel,
  onSelect,
}: {
  client: AgencyClientsBookRow;
  searchQuery: string;
  viewModel: AgencyClientsTableViewModel;
  onSelect: (clientId: string) => void;
}) {
  const {
    isOwner,
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
    setCreateProjectClientId,
    archiveClient,
    unarchiveClient,
  } = viewModel;

  const isArchived = Boolean(client.archivedAt);
  const editAfterMenuClose = useRef(false);
  const visibleProjects =
    searchQuery.trim() === ""
      ? client.projects.slice(0, 3)
      : [...client.projects]
          .sort(
            (left, right) =>
              Number(agencyListSearchMatches(searchQuery, right.name)) -
              Number(agencyListSearchMatches(searchQuery, left.name)),
          )
          .slice(0, 3);
  const catalogAmount = catalogRateAmount(
    client.sourceBillableRateAmount,
    client.billableRateAmount,
  );

  return (
    <div
      data-client-id={client.id}
      className={cn(
        "group grid cursor-pointer grid-cols-1 items-center gap-3 border-b border-default px-4 py-3 last:border-b-0",
        "hover:bg-elevated/40 motion-reduce:transition-none md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_8.5rem_7rem_2.5rem]",
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
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            className={cn(
              "truncate text-sm font-bold",
              isArchived ? "text-muted" : "text-highlighted",
            )}
          >
            <AgencySearchHighlight text={client.name} query={searchQuery} />
          </span>
          <CategoryMark category={client.category} />
        </div>
        {client.needs.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {client.needs.map((need) => (
              <NeedChip key={need} id={need} />
            ))}
          </div>
        ) : null}
      </div>

      <div className="min-w-0">
        {client.projects.length > 0 ? (
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {visibleProjects.map((project) => (
              <span
                key={project.id}
                className="inline-flex max-w-36 items-center gap-1.5 text-[11px] font-bold text-muted"
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
            {client.projects.length > visibleProjects.length ? (
              <span className="text-[11px] text-dimmed">
                +{client.projects.length - visibleProjects.length}
              </span>
            ) : null}
          </div>
        ) : (
          <span className={agencyWorkMetaClass}>No projects</span>
        )}
      </div>

      <WeekHeat share={client.weekShare} durationSeconds={client.weekDurationSeconds} />

      <span
        className={cn(
          "font-mono text-xs font-bold tabular-nums md:text-right",
          catalogAmount === null ? "text-dimmed" : "text-highlighted",
        )}
      >
        {formatRate(catalogAmount, client.currency, { perHour: true })}
      </span>

      <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
        {isOwner ? (
          <Popover
            open={editClientId === client.id}
            onOpenChange={(open) => setEditClientId(open ? client.id : "")}
          >
            <PopoverAnchor asChild>
              <div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="opacity-80 group-hover:opacity-100 group-focus-within:opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                      aria-label={`Actions for ${client.name}`}
                    >
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    onClick={(event) => event.stopPropagation()}
                    onCloseAutoFocus={(event) => {
                      if (!editAfterMenuClose.current) return;
                      event.preventDefault();
                      editAfterMenuClose.current = false;
                      setEditClientId(client.id);
                    }}
                  >
                    {!isArchived ? (
                      <DropdownMenuItem onSelect={() => setCreateProjectClientId(client.id)}>
                        <Plus className="size-3.5" />
                        New project
                      </DropdownMenuItem>
                    ) : null}
                    {!isArchived ? (
                      <DropdownMenuItem
                        onSelect={() => {
                          editAfterMenuClose.current = true;
                        }}
                      >
                        Edit commercial
                      </DropdownMenuItem>
                    ) : null}
                    {isArchived ? (
                      <DropdownMenuItem
                        disabled={isClientMutationPending}
                        onSelect={() => unarchiveClient(client.id)}
                      >
                        <ArchiveRestore className="size-3.5" />
                        Unarchive
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        disabled={isClientMutationPending}
                        onSelect={() => archiveClient(client.id)}
                      >
                        <Archive className="size-3.5" />
                        Archive
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </PopoverAnchor>
            <PopoverContent
              align="end"
              size="form"
              tone="morph"
              className="p-4"
              onClick={(event) => event.stopPropagation()}
            >
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  saveClientEdits(client.id);
                }}
              >
                <p className="text-sm font-medium text-foreground">Edit client</p>
                <div className="mt-3 space-y-3">
                  <div>
                    <Label
                      htmlFor={`edit-client-name-${client.id}`}
                      className="text-xs font-medium"
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
                      className="text-xs font-medium"
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
                      className="text-xs font-medium"
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
                      <Select value={editCurrencyDraft} onValueChange={setEditCurrencyDraft}>
                        <SelectTrigger aria-label="Rate currency" className="w-[5.5rem] shrink-0">
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
                  className="mt-4 w-full"
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
      </div>
    </div>
  );
}

export function AgencyClientsTableView({
  viewModel,
  searchQuery,
  onSelect,
}: AgencyClientsTableViewProps) {
  const { openNewClient, isOwner, corridors, clients, isLoading, isError, errorMessage, refetch } =
    viewModel;

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
    <div className="agency-clients flex flex-col gap-6 pb-6">
      {corridors.length === 0 ? (
        <div className="rounded-surface border border-default bg-default p-surface text-center">
          <p className="text-sm font-bold text-highlighted">No clients match.</p>
          <p className="mt-1 text-xs text-muted">Try a different search or archive filter.</p>
        </div>
      ) : (
        corridors.map((corridor) => (
          <section key={corridor.id} aria-labelledby={`client-corridor-${corridor.id}`}>
            <header className="mb-2 flex items-baseline justify-between gap-3 px-1">
              <h2
                id={`client-corridor-${corridor.id}`}
                className={cn(agencyLabelClass, "text-muted")}
              >
                {corridor.label}
              </h2>
              <span className="font-mono text-[11px] tabular-nums text-dimmed">
                {corridor.items.length}
              </span>
            </header>
            <div className="overflow-hidden rounded-surface border border-default bg-default">
              {corridor.items.map((client) => (
                <ClientBookRow
                  key={client.id}
                  client={client}
                  searchQuery={searchQuery}
                  viewModel={viewModel}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
