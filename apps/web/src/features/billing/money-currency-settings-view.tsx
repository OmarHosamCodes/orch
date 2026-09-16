import { agencyFormLabelClass } from "@/features/shared/agency-ui";
import { AgencyCurrencyGlyph } from "@/features/shared/dialog-kit/agency-currency-glyph";
import { AgencySearchSelect } from "@/features/shared/agency-search-select";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Skeleton } from "@/ui/skeleton";

export type MoneyCurrencySettingsViewModel = {
  canEdit: boolean;
  isSaving: boolean;
  currency: {
    code: string;
    lockedAt: string | null;
    draft: string;
    onDraftChange: (value: string) => void;
    onSave: () => void;
    options: readonly string[];
  };
  fxRates: {
    items: Array<{
      id: string;
      fromCurrency: string;
      toCurrency: string;
      rate: string;
    }>;
    isLoading: boolean;
    fromCurrency: string;
    onFromCurrencyChange: (value: string) => void;
    rateDraft: string;
    onRateDraftChange: (value: string) => void;
    onSuggest: () => void;
    onSave: () => void;
    onDelete: (id: string) => void;
  };
};

export function MoneyCurrencySettingsView({
  settings,
}: {
  settings: MoneyCurrencySettingsViewModel;
}) {
  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-default p-4">
        <Label htmlFor="agency-currency" className={agencyFormLabelClass}>
          Agency currency
        </Label>
        <div className="flex flex-wrap items-center gap-2">
          <AgencySearchSelect
            id="agency-currency"
            value={settings.currency.draft}
            onValueChange={settings.currency.onDraftChange}
            options={settings.currency.options.map((code) => ({
              value: code,
              label: code,
              glyph: <AgencyCurrencyGlyph code={code} />,
            }))}
            disabled={settings.isSaving || !settings.canEdit || settings.currency.lockedAt != null}
            aria-label="Agency currency"
            variant="chip"
          />
          <Button
            type="button"
            size="sm"
            onClick={settings.currency.onSave}
            disabled={
              settings.isSaving ||
              !settings.canEdit ||
              settings.currency.lockedAt != null ||
              settings.currency.draft === settings.currency.code
            }
          >
            Save
          </Button>
        </div>
        {settings.currency.lockedAt ? (
          <p className="text-xs text-muted-foreground">Currency is locked after money exists.</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Choose the ledger currency before creating rates, bills, or expenses.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-default p-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-highlighted">FX rates</p>
          <p className="text-xs text-muted-foreground">
            Convert foreign inputs into {settings.currency.code}. Suggest pulls a live rate you can
            edit before saving.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label className={agencyFormLabelClass}>From</Label>
            <AgencySearchSelect
              value={settings.fxRates.fromCurrency}
              onValueChange={settings.fxRates.onFromCurrencyChange}
              options={settings.currency.options
                .filter((code) => code !== settings.currency.code)
                .map((code) => ({
                  value: code,
                  label: code,
                  glyph: <AgencyCurrencyGlyph code={code} />,
                }))}
              disabled={settings.isSaving || !settings.canEdit}
              aria-label="From currency"
              variant="chip"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fx-rate" className={agencyFormLabelClass}>
              Rate → {settings.currency.code}
            </Label>
            <Input
              id="fx-rate"
              className="h-8 w-32 rounded-full"
              value={settings.fxRates.rateDraft}
              onChange={(event) => settings.fxRates.onRateDraftChange(event.target.value)}
              placeholder="50.2"
              disabled={settings.isSaving || !settings.canEdit}
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={settings.fxRates.onSuggest}
            disabled={settings.isSaving || !settings.canEdit}
          >
            Suggest
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={settings.fxRates.onSave}
            disabled={
              settings.isSaving ||
              !settings.canEdit ||
              settings.fxRates.rateDraft.trim().length === 0
            }
          >
            Save rate
          </Button>
        </div>
        {settings.fxRates.isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : settings.fxRates.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No FX rates yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {settings.fxRates.items.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-default px-3 py-2 text-sm"
              >
                <span className="tabular-nums text-highlighted">
                  1 {row.fromCurrency} = {row.rate} {row.toCurrency}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => settings.fxRates.onDelete(row.id)}
                  disabled={settings.isSaving || !settings.canEdit}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
