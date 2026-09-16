import { Banknote, X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  AGENCY_CURRENCY_OPTIONS,
  catalogRateAmount,
  catalogWinningRate,
  formatRate,
  parseBillableRateAmount,
  previewConvertedRate,
} from "@/features/shared/format-rate";
import { agencyPickerChipTriggerClass } from "@/features/shared/agency-ui";
import { useAgencyOpsStore } from "@/features/shared/stores/agency-ops";
import type { AgencyProjectTask } from "@/features/task-management/agency-work";
import { orpc } from "@/lib/orpc";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { cn } from "@/lib/utils";

type AgencyTaskRatePopoverProps = {
  teamId: string;
  task: AgencyProjectTask;
  canEdit: boolean;
  disabled?: boolean;
  /** Soften inherit-only triggers until the row is hovered/focused. */
  quietUntilHover?: boolean;
};

function taskCatalogLevels(task: AgencyProjectTask) {
  return {
    task: {
      billableRateAmount: task.billableRateAmount,
      sourceBillableRateAmount: task.sourceBillableRateAmount,
      currency: task.currency,
    },
    project: {
      billableRateAmount: task.projectBillableRateAmount,
      sourceBillableRateAmount: task.projectSourceBillableRateAmount,
      currency: task.projectCurrency,
    },
    client: {
      billableRateAmount: task.clientBillableRateAmount,
      sourceBillableRateAmount: task.clientSourceBillableRateAmount,
      currency: task.clientCurrency,
    },
  };
}

export function AgencyTaskRatePopover({
  teamId,
  task,
  canEdit,
  disabled = false,
  quietUntilHover = false,
}: AgencyTaskRatePopoverProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [currencyDraft, setCurrencyDraft] = useState(task.currency);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const updateProjectTask = useAgencyOpsStore((state) => state.updateProjectTask);
  const pending = useAgencyOpsStore((state) => state.pendingTaskIds.includes(task.id));

  const fxRatesQuery = useQuery({
    ...orpc.agencyOps.fxRates.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId) && open && canEdit,
  });

  const levels = taskCatalogLevels(task);
  const hasOverride = task.billableRateAmount != null;
  const overrideAmount = catalogRateAmount(task.sourceBillableRateAmount, task.billableRateAmount);
  const parentRate = catalogWinningRate(
    { billableRateAmount: null },
    levels.project,
    levels.client,
  );
  const effectiveRate = catalogWinningRate(levels.task, levels.project, levels.client);
  const inheritCurrency =
    task.projectBillableRateAmount != null
      ? (task.projectCurrency ?? task.clientCurrency ?? "USD")
      : (task.clientCurrency ?? "USD");

  if (!canEdit && !hasOverride) {
    return null;
  }

  const agencyCurrency = fxRatesQuery.data?.agencyCurrency ?? task.clientCurrency ?? "USD";
  const parsedDraft = draft.trim() === "" ? null : parseBillableRateAmount(draft);
  const draftValid = draft.trim() === "" || parsedDraft !== null;
  const baselineAmount = overrideAmount;
  const baselineCurrency = hasOverride ? task.currency : inheritCurrency;
  const isDirty =
    (parsedDraft ?? null) !== (baselineAmount ?? null) ||
    (parsedDraft != null && currencyDraft !== baselineCurrency);
  const draftEffective = catalogWinningRate(
    {
      billableRateAmount: parsedDraft,
      sourceBillableRateAmount: parsedDraft,
      currency: currencyDraft,
    },
    levels.project,
    levels.client,
  );
  const ratePreviewAmount =
    parsedDraft != null && currencyDraft !== agencyCurrency
      ? previewConvertedRate(
          parsedDraft,
          currencyDraft,
          agencyCurrency,
          fxRatesQuery.data?.items ?? [],
        )
      : null;

  const busy = disabled || pending || saving;
  const canSave = canEdit && draftValid && isDirty && !busy;

  function openPopover(nextOpen: boolean) {
    if (nextOpen) {
      setDraft(overrideAmount != null ? String(overrideAmount / 100) : "");
      setCurrencyDraft(hasOverride ? task.currency : inheritCurrency);
      setSaveError(null);
    }
    setOpen(nextOpen);
  }

  async function saveRate(nextAmount: number | null, nextCurrency: string) {
    if (!canEdit) return;
    setSaveError(null);
    setSaving(true);
    try {
      await updateProjectTask({
        teamId,
        taskId: task.id,
        billableRateAmount: nextAmount,
        currency: nextAmount == null ? undefined : nextCurrency,
      });
      setOpen(false);
    } catch {
      setSaveError("Couldn't save rate. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function onDraftKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (canSave) void saveRate(parsedDraft, currencyDraft);
    }
  }

  const triggerLabel = hasOverride
    ? formatRate(overrideAmount, task.currency, { perHour: true })
    : null;
  const softHide = quietUntilHover && !hasOverride && !open;

  return (
    <Popover open={open} onOpenChange={openPopover}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy || (!canEdit && !hasOverride)}
          aria-label={
            triggerLabel
              ? `Task rate ${triggerLabel}`
              : canEdit
                ? "Set task rate"
                : `Effective rate ${formatRate(effectiveRate.amount, effectiveRate.currency, { perHour: true })}`
          }
          title={
            triggerLabel
              ? `Task override ${triggerLabel}`
              : `Effective ${formatRate(effectiveRate.amount, effectiveRate.currency, { perHour: true })}`
          }
          className={cn(
            agencyPickerChipTriggerClass,
            "w-auto shrink-0 gap-1 border-transparent bg-transparent py-0 font-medium",
            "transition-[opacity,colors] motion-reduce:transition-none",
            softHide &&
              "opacity-0 group-hover/task-rate-row:opacity-100 group-focus-within/task-rate-row:opacity-100",
            open && "opacity-100",
            triggerLabel
              ? "bg-muted/80 font-mono tabular-nums text-highlighted hover:bg-muted"
              : "text-muted hover:bg-muted hover:text-foreground",
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <Banknote className="size-3.5 shrink-0" aria-hidden />
          {triggerLabel ? <span className="max-w-[6.5rem] truncate">{triggerLabel}</span> : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        size="form"
        tone="morph"
        className="gap-3 p-surface"
        onClick={(event) => event.stopPropagation()}
        onOpenAutoFocus={(event) => {
          if (!canEdit) event.preventDefault();
        }}
      >
        {canEdit ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">Task rate</p>
              {hasOverride ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Clear task rate"
                  disabled={busy}
                  onClick={() => void saveRate(null, currencyDraft)}
                >
                  <X className="size-3.5" aria-hidden />
                </Button>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`task-rate-${task.id}`} className="text-xs font-medium">
                Rate / hour
              </Label>
              <div className="flex gap-2">
                <Input
                  id={`task-rate-${task.id}`}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={onDraftKeyDown}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Inherit project/client rate"
                  disabled={busy}
                  className="h-8 min-w-0 flex-1"
                  autoFocus
                />
                <Select value={currencyDraft} onValueChange={setCurrencyDraft} disabled={busy}>
                  <SelectTrigger aria-label="Rate currency" className="h-8 w-[5.5rem] shrink-0">
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
                <p className="text-xs text-muted-foreground">
                  ≈ {formatRate(ratePreviewAmount, agencyCurrency, { perHour: true })}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Parent: {formatRate(parentRate.amount, parentRate.currency, { perHour: true })}
              </p>
              <p className="text-sm font-medium text-foreground tabular-nums">
                Effective:{" "}
                {formatRate(draftEffective.amount, draftEffective.currency, { perHour: true })}
              </p>
            </div>
            {saveError ? (
              <p className="text-xs text-destructive" role="alert">
                {saveError}
              </p>
            ) : null}
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={!canSave}
              onClick={() => void saveRate(parsedDraft, currencyDraft)}
            >
              {saving || pending ? "Saving…" : "Save rate"}
            </Button>
          </>
        ) : (
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Override</dt>
              <dd className="font-mono font-bold tabular-nums text-highlighted">
                {formatRate(overrideAmount, task.currency, { perHour: true })}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Effective</dt>
              <dd className="font-mono font-bold tabular-nums text-highlighted">
                {formatRate(effectiveRate.amount, effectiveRate.currency, { perHour: true })}
              </dd>
            </div>
          </dl>
        )}
      </PopoverContent>
    </Popover>
  );
}
