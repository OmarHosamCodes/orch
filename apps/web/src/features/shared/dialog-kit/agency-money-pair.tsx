import type { ReactNode } from "react";

import { AgencySearchSelect } from "@/features/shared/agency-search-select";
import { AgencyCurrencyGlyph } from "@/features/shared/dialog-kit/agency-currency-glyph";
import {
  agencyFormFieldClass,
  agencyFormLabelClass,
  agencyInputPlaceholderClass,
  agencyMetricClass,
} from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import { Input } from "@/ui/input";

type AgencyMoneyPairProps = {
  id?: string;
  label?: string;
  amount: string;
  onAmountChange: (value: string) => void;
  currency: string;
  currencyOptions: readonly string[];
  onCurrencyChange?: (value: string) => void;
  preview?: string | null;
  error?: string | null;
  hint?: string | null;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  fxSlot?: ReactNode;
  showCurrency?: boolean;
  /** Hero is the pay/collect converter: large amount, no field label. */
  emphasis?: "field" | "hero";
  "aria-label"?: string;
};

export function AgencyMoneyPair({
  id,
  label,
  amount,
  onAmountChange,
  currency,
  currencyOptions,
  onCurrencyChange,
  preview,
  error,
  hint,
  placeholder = "0.00",
  disabled = false,
  required = false,
  autoFocus = false,
  fxSlot,
  showCurrency = true,
  emphasis = "field",
  "aria-label": ariaLabel,
}: AgencyMoneyPairProps) {
  const currencyDisabled = disabled || !onCurrencyChange;
  const isHero = emphasis === "hero";
  const describedBy = error
    ? `${id ?? "money-pair"}-error`
    : preview
      ? `${id ?? "money-pair"}-preview`
      : undefined;

  return (
    <div className={agencyFormFieldClass}>
      {label && !isHero ? <span className={agencyFormLabelClass}>{label}</span> : null}
      <div
        className={cn(
          "flex min-w-0 items-stretch overflow-hidden rounded-xl border border-default bg-default",
          "transition-[border-color,box-shadow] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-out)]",
          "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
          error && "border-destructive",
          isHero && "rounded-2xl",
          "motion-reduce:transition-none",
        )}
      >
        <Input
          id={id}
          inputMode="decimal"
          value={amount}
          onChange={(event) => onAmountChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoFocus={autoFocus}
          aria-label={ariaLabel ?? label ?? "Amount"}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(
            "min-w-0 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0",
            "rounded-none font-mono font-semibold tabular-nums",
            agencyMetricClass,
            agencyInputPlaceholderClass,
            isHero ? "h-16 px-4 text-3xl tracking-tight" : "h-11 text-lg",
          )}
        />
        {showCurrency ? (
          onCurrencyChange ? (
            <AgencySearchSelect
              value={currency}
              onValueChange={onCurrencyChange}
              options={currencyOptions.map((code) => ({
                value: code,
                label: code,
                glyph: <AgencyCurrencyGlyph code={code} />,
              }))}
              disabled={currencyDisabled}
              aria-label="Currency"
              variant="chip"
              className={cn("m-1.5 w-[5.75rem] shrink-0", isHero && "my-auto mr-3")}
            />
          ) : (
            <span
              className={cn(
                "m-1.5 inline-flex h-8 items-center gap-1.5 rounded-full bg-elevated px-2 font-mono text-xs font-semibold tabular-nums text-highlighted",
                isHero && "my-auto mr-3",
              )}
            >
              <AgencyCurrencyGlyph code={currency} />
              {currency}
            </span>
          )
        ) : null}
      </div>
      {preview ? (
        <p
          id={`${id ?? "money-pair"}-preview`}
          className="font-mono text-[11px] tabular-nums text-muted"
        >
          {preview}
        </p>
      ) : null}
      {hint ? <p className="text-[11px] text-muted text-pretty">{hint}</p> : null}
      {error ? (
        <p id={`${id ?? "money-pair"}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {fxSlot}
    </div>
  );
}
