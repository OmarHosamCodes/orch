import {
  createWorkspaceExpenseItem,
  createWorkspaceProfitabilityClient,
  getExpenseSharePercent,
  getProfitabilityCashFlowSummary,
  getProfitabilityClientMarginPercent,
  workspaceFinancePaymentStatusLabels,
  type WorkspaceFinancePaymentStatus,
  type WorkspaceProfitabilityCashFlowBlock,
} from "@orch/workspace";
import { Calculator, Plus, Receipt, Trash2, Users2 } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { BlockProgressBar } from "@/features/workspace/node/blocks/shared/block-progress-bar";
import { BlockFieldLabel } from "@/features/workspace/node/blocks/shared/block-field-label";
import { BlockSelect } from "@/features/workspace/node/blocks/shared/block-select";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { cn } from "@/lib/utils";

const paymentStatusOptions = Object.entries(workspaceFinancePaymentStatusLabels).map(
  ([value, label]) => ({
    label,
    value: value as WorkspaceFinancePaymentStatus,
  }),
);

function formatCurrency(value: number) {
  return Math.round(value).toLocaleString("en-US");
}

function toInteger(value: string, fallback = 0) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.max(0, Math.round(numeric));
}

function getMarginTone(marginPercent: number) {
  if (marginPercent > 40) {
    return {
      text: "text-success",
      bg: "bg-success/5",
      border: "border-success/10",
      icon: "bg-success/10 text-success",
      badgeVariant: "success" as const,
    };
  }

  if (marginPercent > 20) {
    return {
      text: "text-warning",
      bg: "bg-warning/5",
      border: "border-warning/10",
      icon: "bg-warning/10 text-warning",
      badgeVariant: "warning" as const,
    };
  }

  return {
    text: "text-destructive",
    bg: "bg-destructive/5",
    border: "border-destructive/10",
    icon: "bg-destructive/10 text-destructive",
    badgeVariant: "destructive" as const,
  };
}

function getProfitTone(value: number) {
  if (value > 0) {
    return {
      text: "text-success",
      bg: "bg-success/5",
      border: "border-success/10",
      icon: "bg-success/10 text-success",
    };
  }

  if (value === 0) {
    return {
      text: "text-warning",
      bg: "bg-warning/5",
      border: "border-warning/10",
      icon: "bg-warning/10 text-warning",
    };
  }

  return {
    text: "text-destructive",
    bg: "bg-destructive/5",
    border: "border-destructive/10",
    icon: "bg-destructive/10 text-destructive",
  };
}

function getHealthProgressTone(healthPercent: number) {
  if (healthPercent >= 75) {
    return "bg-success";
  }

  if (healthPercent >= 50) {
    return "bg-warning";
  }

  return "bg-destructive";
}

export function WorkspaceProfitabilityCashFlowBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceProfitabilityCashFlowBlock>) {
  const { mutateBlock } = useWorkspaceNodeEditorContext();

  const summary = useMemo(() => getProfitabilityCashFlowSummary(block), [block]);
  const totalExpenseBreakdown = useMemo(
    () => block.expenses.reduce((sum, expense) => sum + expense.amountEgp, 0),
    [block.expenses],
  );

  const profitTone = getProfitTone(summary.totalProfit);
  const marginTone = getMarginTone(summary.marginPercent);

  function addClient() {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "profitability-cash-flow") {
        return;
      }

      entry.clients.push(createWorkspaceProfitabilityClient());
    });
  }

  function removeClient(clientId: string) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "profitability-cash-flow") {
        return;
      }

      entry.clients = entry.clients.filter((client) => client.id !== clientId);
    });
  }

  function addExpense() {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "profitability-cash-flow") {
        return;
      }

      entry.expenses.push(createWorkspaceExpenseItem());
    });
  }

  function removeExpense(expenseId: string) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "profitability-cash-flow") {
        return;
      }

      entry.expenses = entry.expenses.filter((expense) => expense.id !== expenseId);
    });
  }

  function mutateClient(
    clientId: string,
    mutator: (client: WorkspaceProfitabilityCashFlowBlock["clients"][number]) => void,
  ) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "profitability-cash-flow") {
        return;
      }

      const target = entry.clients.find((candidate) => candidate.id === clientId);

      if (!target) {
        return;
      }

      mutator(target);
    });
  }

  function mutateExpense(
    expenseId: string,
    mutator: (expense: WorkspaceProfitabilityCashFlowBlock["expenses"][number]) => void,
  ) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "profitability-cash-flow") {
        return;
      }

      const target = entry.expenses.find((candidate) => candidate.id === expenseId);

      if (!target) {
        return;
      }

      mutator(target);
    });
  }

  return (
    <div className="space-y-8 overflow-x-hidden">
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 px-1">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Cash Flow Overview
            </h2>
            <p className="text-xs text-toned">
              Real-time profitability and margin metrics across all clients.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">
            <span className="text-success">{formatCurrency(summary.totalRevenue)}</span> revenue ·{" "}
            <span className="text-destructive">{formatCurrency(summary.totalExpenses)}</span>{" "}
            expenses ·{" "}
            <span className={profitTone.text}>{formatCurrency(summary.totalProfit)}</span> net
            profit · <span className={marginTone.text}>{summary.marginPercent}%</span> margin
          </p>
          <BlockProgressBar
            className="min-w-24 max-w-48 flex-1"
            value={summary.marginPercent}
            max={100}
          />
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <section className="min-w-0 space-y-6">
          <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Client Portfolio
              </h2>
              <p className="text-xs text-toned">
                Track profitability, margins, and collection status per client.
              </p>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full"
              onClick={addClient}
            >
              <Plus />
              Add Client
            </Button>
          </div>

          {block.clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-surface border border-dashed border-muted bg-background py-surface text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-muted text-muted">
                <Users2 className="size-8" />
              </div>
              <p className="mt-4 text-sm font-bold text-muted-foreground">No clients yet</p>
              <p className="mt-1 text-xs text-toned">
                Add your first client to track profitability
              </p>
              <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={addClient}>
                <Plus />
                Add first client
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {block.clients.map((client) => {
                const clientMargin = getProfitabilityClientMarginPercent(client);
                const clientMarginTone = getMarginTone(clientMargin);

                return (
                  <article
                    key={client.id}
                    className="group relative rounded-surface border border-muted bg-background p-surface transition-all hover:border-muted"
                  >
                    <div className="mb-5 flex items-start justify-between gap-4 border-b border-muted pb-4">
                      <div className="min-w-0 flex-1">
                        <Input
                          value={client.name}
                          placeholder="Client name"
                          className="border-0 bg-transparent px-0 text-xl font-semibold tracking-tight text-foreground shadow-none placeholder:text-muted focus-visible:ring-0"
                          onChange={(event) =>
                            mutateClient(client.id, (target) => {
                              target.name = event.target.value.slice(0, 120);
                            })
                          }
                        />
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <Badge
                          variant={clientMarginTone.badgeVariant}
                          className="rounded-xl px-3 py-1 font-mono font-bold"
                        >
                          {clientMargin}% margin
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          className="rounded-xl hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Remove client"
                          onClick={() => removeClient(client.id)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <BlockFieldLabel className="mb-2 block">Payment Status</BlockFieldLabel>
                        <BlockSelect
                          value={client.paymentStatus}
                          options={paymentStatusOptions}
                          className="rounded-xl"
                          aria-label="Payment status"
                          onValueChange={(value) =>
                            mutateClient(client.id, (target) => {
                              target.paymentStatus = value as WorkspaceFinancePaymentStatus;
                            })
                          }
                        />
                      </div>

                      <div>
                        <BlockFieldLabel className="mb-2 block">Revenue</BlockFieldLabel>
                        <Input
                          value={String(client.revenueEgp)}
                          type="number"
                          className="rounded-xl font-mono text-success"
                          onChange={(event) =>
                            mutateClient(client.id, (target) => {
                              target.revenueEgp = toInteger(event.target.value, target.revenueEgp);
                            })
                          }
                        />
                      </div>

                      <div>
                        <BlockFieldLabel className="mb-2 block">Direct Cost</BlockFieldLabel>
                        <Input
                          value={String(client.costEgp)}
                          type="number"
                          className="rounded-xl font-mono text-destructive"
                          onChange={(event) =>
                            mutateClient(client.id, (target) => {
                              target.costEgp = toInteger(event.target.value, target.costEgp);
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="mt-4 rounded-surface border border-muted bg-card p-surface">
                      <div className="mb-2 flex items-center justify-between">
                        <BlockFieldLabel>Relationship Health</BlockFieldLabel>
                        <div className="flex items-center gap-1.5">
                          <Input
                            value={String(client.healthPercent)}
                            type="number"
                            className="h-auto w-10 border-0 bg-transparent p-0 text-right font-mono font-bold text-primary shadow-none focus-visible:ring-0"
                            onChange={(event) =>
                              mutateClient(client.id, (target) => {
                                target.healthPercent = Math.min(
                                  100,
                                  toInteger(event.target.value, target.healthPercent),
                                );
                              })
                            }
                          />
                          <span className="text-xs font-semibold text-primary/60">%</span>
                        </div>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            getHealthProgressTone(client.healthPercent),
                          )}
                          style={{ width: `${Math.min(100, Math.max(0, client.healthPercent))}%` }}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-5 rounded-surface border border-muted bg-background p-surface lg:sticky lg:top-8 lg:h-fit">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Monthly Overhead
              </h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Recurring operating costs.</p>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full"
              onClick={addExpense}
            >
              <Plus />
              Add
            </Button>
          </div>

          {block.expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-surface border border-dashed border-muted bg-background py-surface text-center">
              <Receipt className="size-6 text-muted" />
              <p className="mt-3 text-xs font-bold text-muted-foreground">No overhead costs yet.</p>
              <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={addExpense}>
                <Plus />
                Add
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {block.expenses.map((expense) => (
                <article
                  key={expense.id}
                  className="relative rounded-surface border border-muted bg-background p-surface transition-all hover:bg-background"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <Input
                        value={expense.category}
                        placeholder="Category name"
                        className="border-0 bg-transparent px-0 text-sm font-bold text-foreground shadow-none placeholder:text-muted focus-visible:ring-0"
                        onChange={(event) =>
                          mutateExpense(expense.id, (target) => {
                            target.category = event.target.value.slice(0, 120);
                          })
                        }
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-lg hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remove expense"
                      onClick={() => removeExpense(expense.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>

                  <div className="flex items-end justify-between gap-3">
                    <div className="flex-1">
                      <BlockFieldLabel className="mb-1.5 block">Monthly</BlockFieldLabel>
                      <Input
                        value={String(expense.amountEgp)}
                        type="number"
                        className="rounded-xl font-mono"
                        onChange={(event) =>
                          mutateExpense(expense.id, (target) => {
                            target.amountEgp = toInteger(event.target.value, target.amountEgp);
                          })
                        }
                      />
                    </div>

                    <div className="pb-0.5 text-right">
                      <p className="font-mono text-xs font-semibold text-toned">
                        {getExpenseSharePercent(expense, totalExpenseBreakdown)}%
                      </p>
                    </div>
                  </div>
                </article>
              ))}

              <div className="flex items-center justify-between rounded-surface border border-muted bg-background p-surface">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                    Total Monthly
                  </p>
                  <p className="mt-1 font-mono text-lg font-semibold tracking-tight text-primary">
                    {formatCurrency(totalExpenseBreakdown)}
                  </p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-xl border border-primary/10 bg-primary/10 text-primary">
                  <Calculator className="size-5" />
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
