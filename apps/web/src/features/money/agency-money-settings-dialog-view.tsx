import { ArrowLeft, Banknote, Calculator, ChevronRight, Lock, Plus, Users } from "lucide-react";

import { AgencyMultiSelectFilter } from "@/features/shared/filters/agency-multi-select-filter";
import { agencyErrorPanelClass, agencyFocusRingClass } from "@/features/shared/agency-ui";
import { type MoneyCohortPane } from "@/features/billing/money-cohort-allocations-fixture";
import { MoneyCurrencySettingsView } from "@/features/billing/money-currency-settings-view";
import { MoneyFormulaChipEditorView } from "@/features/billing/money-formula-chip-editor-view";
import {
  moneyFormulaDestinationSummary,
  summarizeMoneyFormulaTokens,
} from "@/features/billing/money-formula-chips";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { SurfaceShimmer } from "@/ui/skeleton";
import { cn } from "@/lib/utils";

import { type AgencyMoneySurfaceViewModel } from "./hooks/use-agency-money-surface";

function MoneySettingsDialog({
  settings,
}: {
  settings: AgencyMoneySurfaceViewModel["moneySettings"];
}) {
  const paneTitle =
    settings.paneOptions.find((option) => option.id === settings.pane)?.label ?? "Rules";
  const paneDescription =
    settings.paneOptions.find((option) => option.id === settings.pane)?.description ?? "";
  const editor = settings.editor;
  const editingFormula = editor?.kind === "formula";

  return (
    <Dialog open={settings.open} onOpenChange={settings.onOpenChange}>
      <DialogContent
        className={cn(
          "gap-0 overflow-hidden p-0",
          editingFormula ? "sm:max-w-4xl" : "sm:max-w-3xl",
        )}
      >
        <DialogTitle className="sr-only">{settings.title}</DialogTitle>
        <DialogDescription className="sr-only">{settings.description}</DialogDescription>

        <div
          className={cn(
            "flex overflow-hidden",
            editingFormula ? "h-[min(40rem,92vh)]" : "h-[min(36rem,90vh)]",
          )}
        >
          <nav
            className={cn(
              "flex w-48 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border bg-muted/30 p-3",
              editingFormula && "hidden",
            )}
            aria-label="Money settings sections"
          >
            {settings.paneOptions.map((option) => {
              const isActive = settings.pane === option.id && editor == null;
              const Icon =
                option.id === "rules" ? Users : option.id === "currency" ? Banknote : Calculator;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors duration-150 ease-out motion-reduce:transition-none",
                    agencyFocusRingClass,
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => settings.onPaneChange(option.id as MoneyCohortPane)}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {option.label}
                </button>
              );
            })}
          </nav>

          <div
            className={cn(
              "flex min-h-0 min-w-0 flex-1 flex-col p-6 pr-14",
              editor?.kind === "formula" ? "overflow-hidden" : "overflow-y-auto overscroll-contain",
            )}
          >
            {settings.status === "loading" ? (
              <SurfaceShimmer className="min-h-48 my-4" label="Loading Money settings" />
            ) : settings.status === "error" ? (
              <div className={cn(agencyErrorPanelClass, "my-auto")} role="alert">
                <p className="text-sm font-medium text-highlighted">Couldn’t load Money settings</p>
                <p className="mt-1 text-xs text-muted">{settings.errorMessage}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={settings.onRetry}
                >
                  Retry
                </Button>
              </div>
            ) : editor?.kind === "formula" ? (
              <MoneyFormulaChipEditorView
                formula={editor.formula}
                currency={settings.currency.code}
                ruleOptions={settings.ruleOptions}
                validationError={settings.formulaValidationError}
                previewLabel={settings.formulaPreviewLabel}
                previewPending={settings.formulaPreviewPending}
                isSaving={settings.isSaving}
                onChange={(formula) => settings.onEditorChange({ kind: "formula", formula })}
                onCancel={settings.onEditorCancel}
                onSave={settings.onEditorSave}
                canSave={settings.canSaveEditor}
                onBack={settings.onEditorCancel}
              />
            ) : editor?.kind === "rule" ? (
              <div className="flex min-h-0 flex-1 flex-col gap-5">
                <div className="flex flex-col gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="-ml-2 w-fit gap-1.5 px-2"
                    onClick={settings.onEditorCancel}
                    disabled={settings.isSaving}
                  >
                    <ArrowLeft className="size-3.5" aria-hidden />
                    Back
                  </Button>
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {editor.locked ? (
                        <h2 className="text-xl font-semibold tracking-tight text-foreground text-balance">
                          {editor.label}
                        </h2>
                      ) : (
                        <Input
                          value={editor.label}
                          onChange={(event) =>
                            settings.onEditorChange({ ...editor, label: event.target.value })
                          }
                          disabled={settings.isSaving}
                          className="h-9 max-w-sm text-lg font-semibold"
                          aria-label="Rule label"
                        />
                      )}
                      {editor.locked ? (
                        <Badge variant="outline" className="text-[0.65rem]">
                          Template
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground text-balance">
                      Edit who this rule applies to, then save.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 text-sm text-foreground">
                  <Checkbox
                    checked={editor.enabled}
                    onCheckedChange={(checked) =>
                      settings.onEditorChange({ ...editor, enabled: checked === true })
                    }
                    disabled={settings.isSaving}
                    aria-label="Enabled"
                  />
                  Enabled for this team
                </label>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="money-settings-rule-cohort">Cohort</Label>
                    <Input
                      id="money-settings-rule-cohort"
                      value={editor.cohort}
                      onChange={(event) =>
                        settings.onEditorChange({ ...editor, cohort: event.target.value })
                      }
                      placeholder="e.g. All members except interns"
                      disabled={settings.isSaving || !settings.canEdit}
                    />
                  </div>
                  {editor.supportsMemberPick ? (
                    <div className="flex flex-col gap-1.5">
                      <Label>Members</Label>
                      <AgencyMultiSelectFilter
                        label="Members"
                        values={editor.memberIds}
                        options={settings.memberOptions}
                        onValuesChange={(memberIds) =>
                          settings.onEditorChange({ ...editor, memberIds })
                        }
                        disabled={settings.isSaving}
                        searchPlaceholder="Search members"
                      />
                      <p className="text-xs text-muted-foreground">
                        {editor.memberIds.length > 0
                          ? `${editor.memberIds.length} selected`
                          : "Pick who receives this allowance."}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="mt-auto flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={settings.onEditorCancel}
                    disabled={settings.isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={settings.onEditorSave}
                    disabled={!settings.canSaveEditor || settings.isSaving}
                  >
                    {settings.isSaving ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground text-balance">
                      {paneTitle}
                    </h2>
                    <p className="text-sm text-muted-foreground text-balance">{paneDescription}</p>
                  </div>
                  {settings.pane === "formulas" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-1.5"
                      onClick={settings.onAddCustomFormula}
                      disabled={settings.isSaving || !settings.canEdit}
                    >
                      <Plus className="size-3.5" aria-hidden />
                      Add formula
                    </Button>
                  ) : settings.pane === "rules" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-1.5"
                      onClick={settings.onAddCustomRule}
                      disabled={settings.isSaving}
                    >
                      <Plus className="size-3.5" aria-hidden />
                      Add rule
                    </Button>
                  ) : null}
                </div>

                {settings.pane === "rules" && settings.rules.length === 0 ? (
                  <div className="mt-8 flex flex-col items-start gap-3 rounded-2xl border border-dashed border-default px-4 py-6">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium text-highlighted">No rules yet</p>
                      <p className="max-w-prose text-sm text-pretty text-muted-foreground">
                        Add a rule to define who qualifies for an allocation.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1.5"
                      onClick={settings.onAddCustomRule}
                      disabled={settings.isSaving}
                    >
                      <Plus className="size-3.5" aria-hidden />
                      Add rule
                    </Button>
                  </div>
                ) : settings.pane === "rules" ? (
                  <ul className="mt-6 flex flex-col gap-2">
                    {settings.rules.map((rule) => (
                      <li key={rule.id}>
                        <button
                          type="button"
                          className={cn(
                            "group/rule flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors",
                            rule.enabled
                              ? "border-default hover:bg-elevated"
                              : "border-dashed border-default opacity-70 hover:opacity-100",
                            agencyFocusRingClass,
                          )}
                          onClick={() => settings.onSelect({ kind: "rule", ruleId: rule.id })}
                          aria-label={`Edit ${rule.benefit}`}
                          disabled={settings.isSaving || !settings.canEdit}
                        >
                          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-elevated text-muted">
                            <Users className="size-4" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-highlighted">
                                {rule.benefit}
                              </span>
                              {!rule.enabled ? (
                                <Badge variant="outline" className="shrink-0 text-[0.65rem]">
                                  Off
                                </Badge>
                              ) : null}
                              <ChevronRight
                                className="size-4 shrink-0 text-muted opacity-0 transition-opacity group-hover/rule:opacity-100 group-focus-visible/rule:opacity-100"
                                aria-hidden
                              />
                            </span>
                            <span className="mt-1.5 inline-flex max-w-full items-center rounded-full bg-elevated px-2.5 py-0.5 text-xs text-muted">
                              <span className="truncate">{rule.cohort}</span>
                              {rule.memberCount !== null ? (
                                <span className="ml-1.5 shrink-0 tabular-nums text-highlighted">
                                  · {rule.memberCount}
                                </span>
                              ) : null}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : settings.pane === "currency" ? (
                  <MoneyCurrencySettingsView
                    settings={{
                      canEdit: settings.canEdit,
                      isSaving: settings.isSaving,
                      currency: settings.currency,
                      fxRates: settings.fxRates,
                    }}
                  />
                ) : settings.formulas.length === 0 ? (
                  <div className="mt-8 flex flex-col items-start gap-3 rounded-2xl border border-dashed border-default px-4 py-6">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium text-highlighted">No formulas yet</p>
                      <p className="max-w-prose text-sm text-pretty text-muted-foreground">
                        Add a chip formula to drive a scoreboard metric or payout section amount.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1.5"
                      onClick={settings.onAddCustomFormula}
                      disabled={settings.isSaving}
                    >
                      <Plus className="size-3.5" aria-hidden />
                      Add formula
                    </Button>
                  </div>
                ) : (
                  <ul className="mt-6 flex flex-col gap-2">
                    {settings.formulas.map((formula) => (
                      <li key={formula.id}>
                        <button
                          type="button"
                          className={cn(
                            "group/option flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors duration-150 ease-out motion-reduce:transition-none",
                            formula.enabled
                              ? "border-default hover:bg-elevated"
                              : "border-dashed border-default opacity-70 hover:opacity-100",
                            agencyFocusRingClass,
                          )}
                          onClick={() =>
                            settings.onSelect({ kind: "formula", formulaId: formula.id })
                          }
                          aria-label={`Edit ${formula.label}`}
                          disabled={settings.isSaving || !settings.canEdit}
                        >
                          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-elevated text-muted">
                            {formula.locked ? (
                              <Lock className="size-3.5" aria-hidden />
                            ) : (
                              <Calculator className="size-3.5" aria-hidden />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-highlighted">
                                {formula.label}
                              </span>
                              {!formula.enabled ? (
                                <Badge variant="outline" className="shrink-0 text-[0.65rem]">
                                  Off
                                </Badge>
                              ) : null}
                              <ChevronRight
                                className="size-4 shrink-0 text-muted opacity-0 transition-opacity duration-150 ease-out motion-reduce:transition-none group-hover/option:opacity-100 group-focus-visible/option:opacity-100"
                                aria-hidden
                              />
                            </span>
                            <span className="mt-1 block truncate font-mono text-xs text-muted">
                              {summarizeMoneyFormulaTokens(formula.tokens, {
                                output: formula.output,
                                currency: settings.currency.code,
                              })}
                            </span>
                            <span className="mt-1.5 inline-flex max-w-full items-center rounded-full bg-elevated px-2.5 py-0.5 text-xs text-muted">
                              <span className="truncate">
                                {moneyFormulaDestinationSummary(
                                  formula,
                                  settings.ruleOptions.find(
                                    (option) => option.id === formula.ruleId,
                                  )?.label,
                                )}
                              </span>
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { MoneySettingsDialog };
