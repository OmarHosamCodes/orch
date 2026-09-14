import { getPricingSimulatorSummary, type WorkspacePricingSimulatorBlock } from "@orch/workspace";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { cn } from "@/lib/utils";

const controls = [
  {
    key: "hoursPerClientPerMonth" as const,
    label: "Hours / Client / Month",
    min: 5,
    max: 100,
    suffix: "h",
  },
  {
    key: "hourlyRateEgp" as const,
    label: "Hourly Rate",
    min: 100,
    max: 2_000,
    suffix: "",
  },
  {
    key: "monthlyOverheadEgp" as const,
    label: "Monthly Overhead",
    min: 10_000,
    max: 200_000,
    suffix: "",
  },
  {
    key: "targetMarginPercent" as const,
    label: "Target Margin",
    min: 10,
    max: 80,
    suffix: "%",
  },
];

function formatCurrency(value: number) {
  return Math.round(value).toLocaleString("en-US");
}

function toInteger(value: string, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.round(numeric);
}

export function WorkspacePricingSimulatorBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspacePricingSimulatorBlock>) {
  const { mutateBlock } = useWorkspaceNodeEditorContext();
  const summary = useMemo(() => getPricingSimulatorSummary(block), [block]);

  function updateControl(
    key: (typeof controls)[number]["key"],
    value: number,
    min: number,
    max: number,
  ) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "pricing-simulator") {
        return;
      }
      entry[key] = Math.min(max, Math.max(min, value));
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <section className="space-y-4 rounded-surface border border-muted bg-background p-surface">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Pricing Simulator
            </h2>
            <p className="text-xs text-toned">Monthly retainer model for executive decisions.</p>
          </div>

          <div className="rounded-surface border border-muted bg-background px-surface py-2.5 text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
              Active Clients
            </p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {block.activeClients}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              mutateBlock(tabId, block.id, (entry) => {
                if (entry.type !== "pricing-simulator") {
                  return;
                }
                entry.activeClients = Math.max(1, entry.activeClients - 1);
              })
            }
          >
            -1 Client
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              mutateBlock(tabId, block.id, (entry) => {
                if (entry.type !== "pricing-simulator") {
                  return;
                }
                entry.activeClients = Math.min(50, entry.activeClients + 1);
              })
            }
          >
            +1 Client
          </Button>
        </div>

        {controls.map((control) => (
          <article
            key={control.key}
            className="rounded-surface border border-muted bg-muted p-surface"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <label
                htmlFor={control.key}
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-toned"
              >
                {control.label}
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                  {block[control.key]}
                </span>
                {control.suffix ? (
                  <span className="text-xs font-semibold text-muted-foreground">
                    {control.suffix}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                id={control.key}
                value={block[control.key]}
                min={control.min}
                max={control.max}
                type="range"
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-muted/35 accent-primary"
                onChange={(event) =>
                  updateControl(
                    control.key,
                    toInteger(event.target.value, block[control.key]),
                    control.min,
                    control.max,
                  )
                }
              />
              <Input
                type="number"
                value={String(block[control.key])}
                className="w-20 rounded-xl"
                onChange={(event) =>
                  updateControl(
                    control.key,
                    toInteger(event.target.value, block[control.key]),
                    control.min,
                    control.max,
                  )
                }
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
              <span>{control.min}</span>
              <span>{control.max}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-surface border border-muted bg-background p-surface">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
              Projected Revenue
            </p>
            <p className="mt-2 font-mono text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {formatCurrency(summary.projectedRevenue)}
            </p>
          </div>

          <div className="rounded-surface border border-muted bg-background p-surface">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
              Min Retainer / Client
            </p>
            <p className="mt-2 font-mono text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {formatCurrency(summary.minimumRetainerPerClient)}
            </p>
          </div>

          <div className="rounded-surface border border-muted bg-background p-surface">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
              Projected Profit
            </p>
            <p
              className={cn(
                "mt-2 font-mono text-xl font-semibold tracking-tight sm:text-2xl",
                summary.projectedProfit >= 0 ? "text-success" : "text-destructive",
              )}
            >
              {formatCurrency(summary.projectedProfit)}
            </p>
          </div>

          <div className="rounded-surface border border-muted bg-background p-surface">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
              Required Revenue
            </p>
            <p className="mt-2 font-mono text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {formatCurrency(summary.requiredRevenue)}
            </p>
          </div>
        </div>

        <div className="rounded-surface border border-muted bg-background p-surface">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">Scenario Readout</h3>
          <div className="mt-3 space-y-2 text-sm text-toned">
            <p>
              At <strong>{block.activeClients}</strong> active clients, the team carries{" "}
              <strong>{summary.monthlyClientHours}</strong> monthly delivery hours.
            </p>
            <p>
              To hit a <strong>{block.targetMarginPercent}%</strong> margin with current overhead,
              each client should clear at least{" "}
              <strong>{formatCurrency(summary.minimumRetainerPerClient)}</strong> per month.
            </p>
            <p className="text-xs text-toned">
              Use this to pressure-test rate increases, hiring decisions, and minimum retainers.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
