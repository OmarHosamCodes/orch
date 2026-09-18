import {
  WORKSPACE_RECEIVABLE_FILTERS,
  createWorkspaceReceivableInvoice,
  getCollectionsTrackerSummary,
  getReceivableDaysOverdue,
  getReceivableRiskLevel,
  matchesReceivableFilter,
  sortReceivableInvoices,
  workspaceReceivableFilterLabels,
  workspaceReceivableRiskLevelLabels,
  workspaceReceivableStatusLabels,
  type WorkspaceCollectionsTrackerBlock,
  type WorkspaceReceivableFilter,
} from "@orch/workspace";
import { Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { AgencyDateField } from "@/features/shared/date/agency-date-field";
import { BlockSelect } from "@/features/workspace/node/blocks/shared/block-select";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { cn } from "@/lib/utils";

const rowGridStyle = {
  gridTemplateColumns:
    "minmax(12rem,1.1fr) minmax(8rem,0.8fr) minmax(9rem,0.9fr) minmax(7rem,0.6fr) minmax(9rem,0.8fr) minmax(9rem,0.8fr) minmax(8rem,0.8fr) minmax(8rem,0.8fr) minmax(18rem,1.3fr) auto",
};

const statusOptions = Object.entries(workspaceReceivableStatusLabels).map(([value, label]) => ({
  label,
  value,
}));

const headerLabels = [
  "Client",
  "Amount",
  "Due Date",
  "Overdue",
  "Owner",
  "Follow-up",
  "Status",
  "Risk",
  "Notes",
  "Actions",
];

function formatCurrency(value: number) {
  return Math.round(value).toLocaleString("en-US");
}

function toInteger(value: string | number | undefined, fallback = 0) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.max(0, Math.round(numeric));
}

function getRiskBadgeVariant(risk: ReturnType<typeof getReceivableRiskLevel>) {
  switch (risk) {
    case "high":
      return "destructive" as const;
    case "medium":
      return "warning" as const;
    default:
      return "success" as const;
  }
}

export function WorkspaceCollectionsTrackerBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceCollectionsTrackerBlock>) {
  const { mutateTypedBlock } = useWorkspaceNodeEditorContext();

  const summary = useMemo(() => getCollectionsTrackerSummary(block), [block]);

  const filteredInvoices = useMemo(
    () =>
      sortReceivableInvoices(block.invoices).filter((invoice) =>
        matchesReceivableFilter(invoice, block.filter),
      ),
    [block.filter, block.invoices],
  );

  const overdueCount = useMemo(
    () => block.invoices.filter((invoice) => getReceivableDaysOverdue(invoice) > 0).length,
    [block.invoices],
  );

  const highRiskCount = useMemo(
    () => block.invoices.filter((invoice) => getReceivableRiskLevel(invoice) === "high").length,
    [block.invoices],
  );

  const paidCount = useMemo(
    () => block.invoices.filter((invoice) => invoice.status === "paid").length,
    [block.invoices],
  );

  function mutateTrackerBlock(mutator: (entry: WorkspaceCollectionsTrackerBlock) => void) {
    mutateTypedBlock(tabId, block.id, "collections-tracker", mutator);
  }

  function mutateInvoice(
    invoiceId: string,
    mutator: (invoice: WorkspaceCollectionsTrackerBlock["invoices"][number]) => void,
  ) {
    mutateTrackerBlock((entry) => {
      const target = entry.invoices.find((candidate) => candidate.id === invoiceId);
      if (target) {
        mutator(target);
      }
    });
  }

  function addInvoice() {
    mutateTrackerBlock((entry) => {
      entry.invoices.unshift(createWorkspaceReceivableInvoice());
    });
  }

  function removeInvoice(invoiceId: string) {
    mutateTrackerBlock((entry) => {
      entry.invoices = entry.invoices.filter((invoice) => invoice.id !== invoiceId);
    });
  }

  function updateStatus(invoiceId: string, value: string) {
    mutateInvoice(invoiceId, (invoice) => {
      invoice.status =
        value === "due-soon" || value === "partial" || value === "overdue" || value === "paid"
          ? value
          : "due-soon";

      if (invoice.status !== "paid") {
        invoice.paidAt = null;
      }
    });
  }

  function setFilter(filter: WorkspaceReceivableFilter) {
    mutateTrackerBlock((entry) => {
      entry.filter = filter;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          {formatCurrency(summary.totalOutstanding)} outstanding ·{" "}
          {formatCurrency(summary.overdueAmount)} overdue ({overdueCount}) ·{" "}
          {formatCurrency(summary.dueThisWeekAmount)} due this week ·{" "}
          {formatCurrency(summary.collectedThisMonth)} collected ({paidCount} paid)
        </p>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3 px-1">
        <div className="space-y-2">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Collections & receivables tracker
            </p>
            <p className="text-sm text-toned">
              Risk is highlighted automatically from invoice size, status, and delay length so the
              team can focus follow-up where cash exposure is highest.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-2xl">
              {filteredInvoices.length} visible
            </Badge>
            <Badge variant="secondary" className="rounded-2xl">
              Filter: {workspaceReceivableFilterLabels[block.filter]}
            </Badge>
            {highRiskCount > 0 ? (
              <Badge variant="warning" className="rounded-2xl">
                {highRiskCount} high risk
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {WORKSPACE_RECEIVABLE_FILTERS.map((filter) => (
            <Button
              key={filter}
              type="button"
              variant={block.filter === filter ? "secondary" : "ghost"}
              size="sm"
              className="rounded-full px-4"
              aria-label={`Show ${workspaceReceivableFilterLabels[filter]} invoices`}
              onClick={() => setFilter(filter)}
            >
              {workspaceReceivableFilterLabels[filter]}
            </Button>
          ))}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full px-4"
            aria-label="Add receivable invoice"
            onClick={addInvoice}
          >
            <Plus />
            Add invoice
          </Button>
        </div>
      </div>

      {filteredInvoices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-muted bg-background py-12 text-center">
          <p className="text-sm text-toned">
            {block.invoices.length === 0 ? "No invoices yet." : "No invoices match this filter."}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-3"
            aria-label="Add receivable invoice"
            onClick={addInvoice}
          >
            <Plus />
            Add invoice
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div
            className="grid min-w-[1560px] gap-px overflow-hidden rounded-xl border border-muted bg-muted/20"
            style={rowGridStyle}
          >
            {headerLabels.map((label) => (
              <div
                key={label}
                className="bg-muted px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-toned"
              >
                {label}
              </div>
            ))}

            {filteredInvoices.map((invoice) => {
              const daysOverdue = getReceivableDaysOverdue(invoice);
              const riskLevel = getReceivableRiskLevel(invoice);

              return (
                <div key={invoice.id} className="contents">
                  <div className="bg-background p-3">
                    <Input
                      value={invoice.clientName}
                      placeholder="Client"
                      className="border-0 bg-transparent px-0 font-semibold text-foreground shadow-none placeholder:text-muted focus-visible:ring-0"
                      aria-label={`Client name for invoice ${invoice.clientName || "draft"}`}
                      onChange={(event) =>
                        mutateInvoice(invoice.id, (entry) => {
                          entry.clientName = event.target.value.slice(0, 120);
                        })
                      }
                    />
                  </div>

                  <div className="bg-background p-3">
                    <Input
                      type="number"
                      value={String(invoice.amountEgp)}
                      className="rounded-2xl"
                      aria-label={`Amount for ${invoice.clientName || "invoice"}`}
                      onChange={(event) =>
                        mutateInvoice(invoice.id, (entry) => {
                          entry.amountEgp = toInteger(event.target.value, entry.amountEgp);
                        })
                      }
                    />
                  </div>

                  <div className="bg-background p-3">
                    <AgencyDateField
                      value={invoice.dueDate ?? ""}
                      displayStyle="short"
                      className="h-8 rounded-2xl"
                      aria-label={`Due date for ${invoice.clientName || "invoice"}`}
                      onChange={(next) =>
                        mutateInvoice(invoice.id, (entry) => {
                          entry.dueDate = next || null;
                        })
                      }
                      onClear={() =>
                        mutateInvoice(invoice.id, (entry) => {
                          entry.dueDate = null;
                        })
                      }
                    />
                  </div>

                  <div className="bg-background p-3">
                    <p
                      className={cn(
                        "rounded-2xl border px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.1em]",
                        daysOverdue > 0
                          ? "border-destructive/20 bg-destructive/10 text-destructive"
                          : "border-muted bg-muted text-toned",
                      )}
                    >
                      {daysOverdue > 0 ? `${daysOverdue}d` : "0d"}
                    </p>
                  </div>

                  <div className="bg-background p-3">
                    <Input
                      value={invoice.owner}
                      placeholder="Owner"
                      className="rounded-2xl"
                      aria-label={`Owner for ${invoice.clientName || "invoice"}`}
                      onChange={(event) =>
                        mutateInvoice(invoice.id, (entry) => {
                          entry.owner = event.target.value.slice(0, 120);
                        })
                      }
                    />
                  </div>

                  <div className="bg-background p-3">
                    <AgencyDateField
                      value={invoice.nextFollowUpDate ?? ""}
                      displayStyle="short"
                      className="h-8 rounded-2xl"
                      aria-label={`Next follow-up date for ${invoice.clientName || "invoice"}`}
                      onChange={(next) =>
                        mutateInvoice(invoice.id, (entry) => {
                          entry.nextFollowUpDate = next || null;
                        })
                      }
                      onClear={() =>
                        mutateInvoice(invoice.id, (entry) => {
                          entry.nextFollowUpDate = null;
                        })
                      }
                    />
                  </div>

                  <div className="bg-background p-3">
                    <BlockSelect
                      value={invoice.status}
                      options={statusOptions}
                      className="rounded-2xl"
                      aria-label={`Status for ${invoice.clientName || "invoice"}`}
                      onValueChange={(value) => updateStatus(invoice.id, value)}
                    />
                  </div>

                  <div className="bg-background p-3">
                    <Badge variant={getRiskBadgeVariant(riskLevel)} className="rounded-2xl px-3">
                      {workspaceReceivableRiskLevelLabels[riskLevel]}
                    </Badge>

                    {invoice.status === "paid" ? (
                      <AgencyDateField
                        value={invoice.paidAt ?? ""}
                        displayStyle="short"
                        className="mt-2 h-8 rounded-2xl"
                        aria-label={`Paid date for ${invoice.clientName || "invoice"}`}
                        onChange={(next) =>
                          mutateInvoice(invoice.id, (entry) => {
                            entry.paidAt = next || null;
                          })
                        }
                        onClear={() =>
                          mutateInvoice(invoice.id, (entry) => {
                            entry.paidAt = null;
                          })
                        }
                      />
                    ) : null}
                  </div>

                  <div className="bg-background p-3">
                    <Textarea
                      value={invoice.notes}
                      rows={1}
                      className="min-h-0 resize-none rounded-2xl bg-muted text-sm"
                      placeholder="Follow-up notes"
                      aria-label={`Follow-up notes for ${invoice.clientName || "invoice"}`}
                      onChange={(event) =>
                        mutateInvoice(invoice.id, (entry) => {
                          entry.notes = event.target.value.slice(0, 2000);
                        })
                      }
                    />
                  </div>

                  <div className="bg-background p-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-xl transition-colors hover:text-destructive"
                      aria-label={`Remove ${invoice.clientName || "invoice"}`}
                      onClick={() => removeInvoice(invoice.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
