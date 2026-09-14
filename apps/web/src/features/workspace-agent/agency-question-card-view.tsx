import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { RadioGroup, RadioGroupItem } from "@/ui/radio-group";
import { Textarea } from "@/ui/textarea";
import { cn } from "@/lib/utils";

type AgencyQuestionCardViewModel = {
  questionId: string;
  prompt: string;
  kind: "single" | "multi" | "text";
  options: Array<{ id: string; label: string; hint?: string }>;
  allowFreeText: boolean;
  context?: string;
};

type AgencyQuestionCardViewProps = {
  question: AgencyQuestionCardViewModel;
  selectedOptionIds: string[];
  freeText: string;
  answered: boolean;
  submitting: boolean;
  canSubmit: boolean;
  onSelectedOptionIdsChange: (ids: string[]) => void;
  onFreeTextChange: (value: string) => void;
  onSubmit: () => void;
  className?: string;
  /** Flatten chrome when hosted in the sticky dock. */
  embedded?: boolean;
};

/** Presentational clarifying-question card — Approach A option tiles + ink CTA. */
export function AgencyQuestionCardView({
  question,
  selectedOptionIds,
  freeText,
  answered,
  submitting,
  canSubmit,
  onSelectedOptionIdsChange,
  onFreeTextChange,
  onSubmit,
  className,
  embedded = false,
}: AgencyQuestionCardViewProps) {
  const disabled = answered || submitting;

  return (
    <div
      className={cn(
        "max-w-[min(100%,36rem)] text-card-foreground",
        embedded ? "rounded-none border-0 bg-transparent p-0" : "rounded-xl bg-muted/40 p-4",
        className,
      )}
    >
      <div className="text-base font-semibold tracking-tight text-foreground">
        {question.prompt}
      </div>
      {question.context ? (
        <p className="mt-1 max-w-[65ch] text-xs leading-relaxed text-muted-foreground">
          {question.context}
        </p>
      ) : null}

      {question.kind === "single" ? (
        <RadioGroup
          className="mt-3.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2"
          value={selectedOptionIds[0] ?? ""}
          onValueChange={(value) => onSelectedOptionIdsChange(value ? [value] : [])}
          disabled={disabled}
        >
          {question.options.map((option) => {
            const selected = selectedOptionIds[0] === option.id;
            return (
              <Label
                key={option.id}
                htmlFor={`${question.questionId}-${option.id}`}
                className={cn(
                  "flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-2 text-xs font-normal leading-snug motion-safe:transition-colors",
                  selected
                    ? "border-foreground/30 bg-muted"
                    : "border-border bg-muted/30 hover:bg-muted/60",
                  disabled && "pointer-events-none opacity-60",
                )}
              >
                <RadioGroupItem
                  value={option.id}
                  id={`${question.questionId}-${option.id}`}
                  className="shrink-0"
                />
                <span className="min-w-0">
                  <span className="block text-foreground">{option.label}</span>
                  {option.hint ? (
                    <span className="mt-0.5 block text-muted-foreground">{option.hint}</span>
                  ) : null}
                </span>
              </Label>
            );
          })}
        </RadioGroup>
      ) : null}

      {question.kind === "multi" ? (
        <div className="mt-3.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {question.options.map((option) => {
            const checked = selectedOptionIds.includes(option.id);
            return (
              <Label
                key={option.id}
                htmlFor={`${question.questionId}-${option.id}`}
                className={cn(
                  "flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-2 text-xs font-normal leading-snug motion-safe:transition-colors",
                  checked
                    ? "border-foreground/30 bg-muted"
                    : "border-border bg-muted/30 hover:bg-muted/60",
                  disabled && "pointer-events-none opacity-60",
                )}
              >
                <Checkbox
                  id={`${question.questionId}-${option.id}`}
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(value) => {
                    const next = value === true;
                    onSelectedOptionIdsChange(
                      next
                        ? [...selectedOptionIds, option.id]
                        : selectedOptionIds.filter((id) => id !== option.id),
                    );
                  }}
                />
                <span className="min-w-0">
                  <span className="block text-foreground">{option.label}</span>
                  {option.hint ? (
                    <span className="mt-0.5 block text-muted-foreground">{option.hint}</span>
                  ) : null}
                </span>
              </Label>
            );
          })}
        </div>
      ) : null}

      {question.kind === "text" || question.allowFreeText ? (
        <div className="mt-3 space-y-1.5">
          {question.kind !== "text" ? (
            <Label
              htmlFor={`${question.questionId}-free`}
              className="text-xs text-muted-foreground"
            >
              Or type your own
            </Label>
          ) : null}
          {question.kind === "text" ? (
            <Textarea
              id={`${question.questionId}-free`}
              value={freeText}
              disabled={disabled}
              onChange={(event) => onFreeTextChange(event.target.value)}
              placeholder="Your answer"
              className="min-h-[58px] rounded-lg text-xs"
            />
          ) : (
            <Input
              id={`${question.questionId}-free`}
              value={freeText}
              disabled={disabled}
              onChange={(event) => onFreeTextChange(event.target.value)}
              placeholder="Your answer"
              className="h-9 rounded-lg text-xs"
            />
          )}
        </div>
      ) : null}

      <div className="mt-3.5 flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!canSubmit}
          onClick={onSubmit}
          className="h-8 min-w-24 rounded-full px-4 font-medium"
        >
          {answered ? "Answered" : submitting ? "Sending…" : "Continue"}
        </Button>
      </div>
    </div>
  );
}
