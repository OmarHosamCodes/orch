import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ArrowLeft,
  ExternalLink,
  MoreHorizontal,
  Plus,
} from "lucide-react";

import { clientContactCompletenessLabel } from "@/features/clients/client-contact-completeness";
import { NotFoundState } from "@/features/app-shell/route-status";
import {
  instrumentPlateInkClass,
  instrumentPlateSurfaceClass,
  type InstrumentPlateTone,
} from "@/features/member-profile/member-profile-instrument-plate";
import {
  agencyErrorPanelClass,
  agencyFocusRingClass,
  agencyLabelClass,
  agencyMetricClass,
  agencyPanelClass,
} from "@/features/shared/agency-ui";
import {
  AGENCY_CURRENCY_OPTIONS,
  catalogRateAmount,
  formatRate,
  parseBillableRateAmount,
} from "@/features/shared/format-rate";
import { projectHueStyle } from "@/features/shared/project-palette";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { SurfaceShimmer } from "@/ui/skeleton";

import type { AgencyClientDetailViewModel } from "./hooks/use-agency-client-detail";

type AgencyClientDetailViewProps = {
  viewModel: AgencyClientDetailViewModel;
  onBack: () => void;
  onSelectProject: (projectId: string) => void;
};

function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(0)} ${currency}`;
  }
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function WeekGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 28" className={className} aria-hidden>
      <rect x="4" y="11" width="56" height="6" rx="1.5" className="fill-current opacity-20" />
      <rect x="4" y="11" width="34" height="6" rx="1.5" className="fill-current" />
    </svg>
  );
}

function MonthGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 28" className={className} aria-hidden>
      <rect
        x="8"
        y="6"
        width="48"
        height="16"
        rx="2"
        fill="none"
        className="stroke-current"
        strokeWidth="1.5"
      />
      <rect x="14" y="12" width="8" height="6" className="fill-current opacity-35" />
      <rect x="28" y="12" width="8" height="6" className="fill-current" />
      <rect x="42" y="12" width="8" height="6" className="fill-current opacity-35" />
    </svg>
  );
}

function ProjectsGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 28" className={className} aria-hidden>
      <circle cx="16" cy="14" r="4" className="fill-current" />
      <circle cx="32" cy="14" r="4" className="fill-current opacity-70" />
      <circle cx="48" cy="14" r="4" className="fill-current opacity-40" />
    </svg>
  );
}

function InvoiceGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 28" className={className} aria-hidden>
      <rect
        x="18"
        y="5"
        width="28"
        height="18"
        rx="2"
        fill="none"
        className="stroke-current"
        strokeWidth="1.5"
      />
      <path d="M24 11h16M24 16h10" className="stroke-current" strokeWidth="1.5" />
    </svg>
  );
}

function DetailPlate({
  label,
  value,
  hint,
  tone,
  glyph,
  onClick,
  actionLabel,
}: {
  label: string;
  value: string;
  hint: string;
  tone: InstrumentPlateTone;
  glyph: "week" | "month" | "projects" | "invoice";
  onClick?: () => void;
  actionLabel?: string;
}) {
  const ink = instrumentPlateInkClass(tone);
  const glyphNode =
    glyph === "week" ? (
      <WeekGlyph className="h-full w-full" />
    ) : glyph === "month" ? (
      <MonthGlyph className="h-full w-full" />
    ) : glyph === "projects" ? (
      <ProjectsGlyph className="h-full w-full" />
    ) : (
      <InvoiceGlyph className="h-full w-full" />
    );

  const className = cn(
    instrumentPlateSurfaceClass(),
    "flex min-h-[7.5rem] flex-col items-center justify-between gap-2 rounded-surface border px-3 py-3 text-center transition-colors motion-reduce:transition-none",
    onClick && cn(agencyFocusRingClass, "hover:bg-muted/60"),
  );

  const body = (
    <>
      <div className={cn("h-7 w-full", ink)}>{glyphNode}</div>
      <span className={cn(agencyMetricClass, "text-lg font-semibold leading-none")}>{value}</span>
      <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <span className="text-[10px] text-muted-foreground">{hint}</span>
      {actionLabel ? (
        <span className="text-[11px] font-bold text-highlighted">{actionLabel}</span>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
}

export function AgencyClientDetailView({
  viewModel,
  onBack,
  onSelectProject,
}: AgencyClientDetailViewProps) {
  const {
    clientId,
    isLoading,
    isError,
    errorMessage,
    retryLoad,
    isOwner,
    client,
    isArchived,
    weekDurationSeconds,
    monthDurationSeconds,
    monthUninvoicedDurationSeconds,
    activeProjectCount,
    projects,
    contactCompleteness,
    contactName,
    setContactName,
    contactEmail,
    setContactEmail,
    contactPhone,
    setContactPhone,
    contactDirty,
    saveContact,
    isContactMutationPending,
    editNameDraft,
    setEditNameDraft,
    editCategoryDraft,
    setEditCategoryDraft,
    editBillableRateDraft,
    setEditBillableRateDraft,
    editCurrencyDraft,
    setEditCurrencyDraft,
    agencyCurrency,
    ratePreviewAmount,
    saveCommercial,
    isClientMutationPending,
    canViewBilling,
    openInvoiceCount,
    outstandingAmount,
    billingCurrency,
    recentInvoices,
    openMoney,
    archiveClient,
    unarchiveClient,
    setCreateProjectOpen,
  } = viewModel;

  const readyToInvoice = canViewBilling && monthUninvoicedDurationSeconds > 0;
  const rateMissing =
    catalogRateAmount(client?.sourceBillableRateAmount, client?.billableRateAmount) === null;
  const contactIncomplete = contactCompleteness !== "complete";

  return (
    <div className="agency-client-detail flex flex-col gap-5 pb-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft />
          Back to clients
        </Button>
      </div>

      {isLoading ? (
        <SurfaceShimmer className="min-h-96" label="Loading client" />
      ) : isError ? (
        <div className={agencyErrorPanelClass} role="alert">
          <AlertTriangle className="mx-auto size-5 text-error" />
          <p className="mt-3 text-sm font-bold text-highlighted">Couldn&apos;t load this client.</p>
          <p className="mt-1 text-xs text-muted">{errorMessage}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={retryLoad}>
            Retry
          </Button>
        </div>
      ) : !client ? (
        <NotFoundState
          title="Client not found."
          description="This client may have been removed or moved to another team. Return to the canvas to continue working."
        />
      ) : (
        <>
          {isArchived ? (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-surface border border-default bg-card px-surface py-3"
              role="status"
            >
              <p className="text-sm text-highlighted">
                This client is archived. Unarchive to use it in Agency again.
              </p>
              {isOwner ? (
                <Button size="sm" disabled={isClientMutationPending} onClick={unarchiveClient}>
                  <ArchiveRestore className="size-3.5" />
                  Unarchive
                </Button>
              ) : null}
            </div>
          ) : null}

          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-1 text-[11px] font-bold capitalize",
                    client.category === "internal"
                      ? "border border-default bg-default text-muted"
                      : "bg-elevated text-highlighted",
                  )}
                >
                  {client.category === "internal" ? "Internal" : "External"}
                </span>
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
              </div>
              <h2 className="mt-2 truncate text-lg font-bold text-highlighted">{client.name}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                <span>Contact: {clientContactCompletenessLabel(contactCompleteness)}</span>
                {contactIncomplete && isOwner && !isArchived ? (
                  <button
                    type="button"
                    className={cn(
                      "font-bold text-highlighted underline-offset-2 hover:underline",
                      agencyFocusRingClass,
                      "rounded-sm",
                    )}
                    onClick={() => scrollToSection(`client-contact-${clientId}`)}
                  >
                    Add contact
                  </button>
                ) : null}
                {rateMissing ? (
                  <>
                    <span aria-hidden>·</span>
                    {isOwner && !isArchived ? (
                      <button
                        type="button"
                        className={cn(
                          "font-bold text-highlighted underline-offset-2 hover:underline",
                          agencyFocusRingClass,
                          "rounded-sm",
                        )}
                        onClick={() => scrollToSection(`client-commercial-${clientId}`)}
                      >
                        Set catalog rate
                      </button>
                    ) : (
                      <span>Catalog rate not set</span>
                    )}
                  </>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isOwner && !isArchived ? (
                <Button variant="secondary" size="sm" onClick={() => setCreateProjectOpen(true)}>
                  <Plus className="size-3.5" />
                  New project
                </Button>
              ) : null}
              {isOwner && !isArchived ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" aria-label="More client actions">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      disabled={isClientMutationPending}
                      onSelect={() => archiveClient()}
                    >
                      <Archive className="size-3.5" />
                      Archive client
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </header>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Client metrics">
            <DetailPlate
              label="This week"
              value={formatDuration(weekDurationSeconds, "short")}
              hint="Tracked hours"
              tone={weekDurationSeconds > 0 ? "neutral" : "info"}
              glyph="week"
            />
            <DetailPlate
              label="This month"
              value={formatDuration(monthDurationSeconds, "short")}
              hint="Calendar month"
              tone={monthDurationSeconds > 0 ? "neutral" : "info"}
              glyph="month"
            />
            <DetailPlate
              label="Projects"
              value={String(activeProjectCount)}
              hint={activeProjectCount === 0 ? "None open yet" : "Active in this book"}
              tone={activeProjectCount > 0 ? "neutral" : "info"}
              glyph="projects"
            />
            <DetailPlate
              label="Ready to invoice"
              value={
                canViewBilling
                  ? formatDuration(monthUninvoicedDurationSeconds, "short")
                  : "Owners only"
              }
              hint={
                readyToInvoice
                  ? "Uninvoiced time this month"
                  : canViewBilling
                    ? "Nothing waiting"
                    : "Billing needs owner access"
              }
              tone={readyToInvoice ? "warning" : "info"}
              glyph="invoice"
              onClick={readyToInvoice ? openMoney : undefined}
              actionLabel={readyToInvoice ? "Open Money to bill" : undefined}
            />
          </section>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <section className={cn(agencyPanelClass, "p-3.5 sm:p-4")}>
              <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={agencyLabelClass}>Projects</p>
                  {projects.length > 0 ? (
                    <span className="inline-flex rounded-full border border-default px-2.5 py-0.5 text-[11px] font-bold text-muted">
                      {activeProjectCount} active
                    </span>
                  ) : null}
                </div>
                {isOwner && !isArchived && projects.length > 0 ? (
                  <Button variant="ghost" size="sm" onClick={() => setCreateProjectOpen(true)}>
                    <Plus className="size-3.5" />
                    New project
                  </Button>
                ) : null}
              </header>
              {projects.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm font-bold text-highlighted">No projects yet</p>
                  <p className="mt-1 text-xs text-muted">
                    Create a project to start tracking time under this client.
                  </p>
                  {isOwner && !isArchived ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-4"
                      onClick={() => setCreateProjectOpen(true)}
                    >
                      <Plus />
                      New project
                    </Button>
                  ) : null}
                </div>
              ) : (
                <ul className="grid gap-2">
                  {projects.map((project) => {
                    const isTrashed = Boolean(project.deletedAt);
                    return (
                      <li key={project.id}>
                        <article
                          className={cn(
                            "flex items-center justify-between gap-3 rounded-lg border border-default px-2.5 py-2.5",
                            isTrashed && "opacity-80",
                          )}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2.5">
                            <span
                              className="inline-block size-2 shrink-0 rounded-full"
                              aria-hidden
                              style={projectHueStyle(project.id)}
                            />
                            <span
                              className={cn(
                                "min-w-0 truncate text-xs font-bold",
                                isTrashed ? "text-muted line-through" : "text-highlighted",
                              )}
                            >
                              {project.name}
                            </span>
                            {isTrashed ? (
                              <span className="inline-flex shrink-0 rounded-sm bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold text-warning">
                                In trash
                              </span>
                            ) : null}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0"
                            onClick={() => onSelectProject(project.id)}
                          >
                            Open project
                          </Button>
                        </article>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <aside className="flex min-w-0 flex-col gap-6">
              <section id={`client-commercial-${clientId}`} className="scroll-mt-4">
                <header className="mb-3">
                  <p className={agencyLabelClass}>Commercial</p>
                  <p className="mt-1 text-xs text-muted">
                    Catalog rate for planning. Invoice lines still use member billable rates.
                  </p>
                </header>
                {isOwner ? (
                  <form
                    className="space-y-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      saveCommercial();
                    }}
                  >
                    <div>
                      <Label htmlFor={`client-name-${clientId}`} className="text-[11px] font-bold">
                        Name
                      </Label>
                      <Input
                        id={`client-name-${clientId}`}
                        value={editNameDraft}
                        onChange={(e) => setEditNameDraft(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor={`client-category-${clientId}`}
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
                        <SelectTrigger id={`client-category-${clientId}`} className="mt-1 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="external">External</SelectItem>
                          <SelectItem value="internal">Internal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor={`client-rate-${clientId}`} className="text-[11px] font-bold">
                        Catalog rate / hour
                      </Label>
                      <div className="mt-1 flex gap-2">
                        <Input
                          id={`client-rate-${clientId}`}
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
                      {ratePreviewAmount != null ? (
                        <p className="mt-1 text-[11px] text-muted">
                          ≈ {formatRate(ratePreviewAmount, agencyCurrency, { perHour: true })}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={
                        !editNameDraft.trim() ||
                        isClientMutationPending ||
                        Boolean(
                          editBillableRateDraft.trim() &&
                          parseBillableRateAmount(editBillableRateDraft) === null,
                        )
                      }
                    >
                      Save commercial
                    </Button>
                  </form>
                ) : (
                  <dl className="space-y-2 text-xs">
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Rate</dt>
                      <dd className="font-mono font-bold tabular-nums text-highlighted">
                        {formatRate(
                          catalogRateAmount(
                            client.sourceBillableRateAmount,
                            client.billableRateAmount,
                          ),
                          client.currency,
                          { perHour: true },
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Currency</dt>
                      <dd className="font-bold text-highlighted">{client.currency}</dd>
                    </div>
                  </dl>
                )}
              </section>

              <section id={`client-contact-${clientId}`} className="scroll-mt-4">
                <header className="mb-3">
                  <p className={agencyLabelClass}>Contact</p>
                  <p className="mt-1 text-xs text-muted">
                    One primary contact for status calls and billing follow-up.
                  </p>
                </header>
                {isOwner ? (
                  <form
                    className="space-y-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      saveContact();
                    }}
                  >
                    <div>
                      <Label
                        htmlFor={`client-contact-name-${clientId}`}
                        className="text-[11px] font-bold"
                      >
                        Name
                      </Label>
                      <Input
                        id={`client-contact-name-${clientId}`}
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Contact name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor={`client-contact-email-${clientId}`}
                        className="text-[11px] font-bold"
                      >
                        Email
                      </Label>
                      <Input
                        id={`client-contact-email-${clientId}`}
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        type="email"
                        placeholder="contact@example.com"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor={`client-contact-phone-${clientId}`}
                        className="text-[11px] font-bold"
                      >
                        Phone
                      </Label>
                      <Input
                        id={`client-contact-phone-${clientId}`}
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        type="tel"
                        placeholder="+1 555 000 0000"
                        className="mt-1"
                      />
                    </div>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!contactDirty || isContactMutationPending}
                    >
                      Save contact
                    </Button>
                  </form>
                ) : (
                  <dl className="space-y-2 text-xs">
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Name</dt>
                      <dd className="font-bold text-highlighted">{contactName || "Not set"}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Email</dt>
                      <dd className="font-bold text-highlighted">{contactEmail || "Not set"}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Phone</dt>
                      <dd className="font-bold text-highlighted">{contactPhone || "Not set"}</dd>
                    </div>
                  </dl>
                )}
              </section>
            </aside>
          </div>

          {canViewBilling ? (
            <section className="border-t border-default pt-4">
              <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className={agencyLabelClass}>Money</p>
                  <p className="mt-1 text-xs text-muted">
                    {openInvoiceCount > 0
                      ? `${openInvoiceCount} open · ${formatMoney(outstandingAmount, billingCurrency)} outstanding`
                      : "No open invoices"}
                  </p>
                </div>
                <Button
                  variant={readyToInvoice ? "default" : "secondary"}
                  size="sm"
                  onClick={openMoney}
                >
                  {readyToInvoice ? "Invoice ready work" : "Open Money"}
                  <ExternalLink className="size-3.5" />
                </Button>
              </header>
              {recentInvoices.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-xs text-muted">No invoices for this client yet.</p>
                  {readyToInvoice ? (
                    <p className="mt-1 text-xs font-bold text-highlighted">
                      {formatDuration(monthUninvoicedDurationSeconds, "short")} ready to invoice
                      this month.
                    </p>
                  ) : null}
                </div>
              ) : (
                <ul className="divide-y divide-default">
                  {recentInvoices.map((invoice) => (
                    <li
                      key={invoice.id}
                      className="grid grid-cols-[minmax(0,1fr)_5rem_6rem] items-baseline gap-3 py-2.5 text-xs"
                    >
                      <span className="truncate font-bold text-highlighted">{invoice.number}</span>
                      <span className="capitalize text-muted">{invoice.status}</span>
                      <span className="text-right font-mono font-bold tabular-nums text-highlighted">
                        {formatMoney(invoice.amount, invoice.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
