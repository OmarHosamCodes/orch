import type { WorkspaceCustomBlock, WorkspaceCustomBlockField } from "@orch/workspace";
import { AlertCircle, AlertTriangle, Loader2, Play } from "lucide-react";
import { useMemo, useState } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { BlockCheckbox } from "@/features/workspace/node/blocks/shared/block-checkbox";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { formatDateTime } from "@/lib/utils/format-date-time";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { cn } from "@/lib/utils";

type BlockStatusTone = "success" | "warning" | "error" | "primary";

function getStatusBadgeClass(tone: BlockStatusTone) {
  switch (tone) {
    case "success":
      return "border-success/30 bg-success/10 text-success";
    case "warning":
      return "border-warning/30 bg-warning/10 text-warning";
    case "error":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    case "primary":
      return "border-primary/30 bg-primary/10 text-primary";
    default: {
      const _never: never = tone;
      return _never;
    }
  }
}

function hasFieldValue(block: WorkspaceCustomBlock, field: WorkspaceCustomBlockField) {
  const value = block.values[field.key];

  if (field.type === "checkbox") {
    return typeof value === "boolean";
  }

  if (field.type === "number") {
    if (typeof value === "number") {
      return Number.isFinite(value);
    }

    if (typeof value === "string") {
      return value.trim().length > 0 && Number.isFinite(Number(value));
    }

    return false;
  }

  return typeof value === "string" && value.trim().length > 0;
}

function getTextValue(block: WorkspaceCustomBlock, field: WorkspaceCustomBlockField) {
  const value = block.values[field.key];
  return typeof value === "string" ? value : "";
}

function getNumericValue(block: WorkspaceCustomBlock, field: WorkspaceCustomBlockField) {
  const value = block.values[field.key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string") {
    return value;
  }

  return "";
}

function getCheckedValue(block: WorkspaceCustomBlock, field: WorkspaceCustomBlockField) {
  return Boolean(block.values[field.key]);
}

function toNumberValue(value: string | number | undefined) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return numeric;
}

export function WorkspaceCustomBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceCustomBlock>) {
  const {
    mutateTypedBlock,
    getCustomTemplate,
    getCustomFormulaResult,
    formatFormulaResult,
    getCustomPromptPreview,
    runCustomPrompt,
    getBlockOperationState,
  } = useWorkspaceNodeEditorContext();

  const [runError, setRunError] = useState<string | null>(null);

  const template = getCustomTemplate(block.definitionId);
  const operationState = getBlockOperationState(tabId, block.id);
  const formulaResult = template ? getCustomFormulaResult(block) : null;

  const fieldTotal = template?.fields.length ?? 0;

  const completedFieldCount = useMemo(() => {
    if (!template) {
      return 0;
    }

    return template.fields.filter((field) => hasFieldValue(block, field)).length;
  }, [block, template]);

  const incompleteFieldCount = Math.max(0, fieldTotal - completedFieldCount);

  const hasPromptTemplate = Boolean(template?.aiPromptTemplate?.trim());
  const hasLatestOutput = block.latestAiOutput.trim().length > 0;
  const latestOutputEntry = block.outputHistory[0] ?? null;

  const blockStatus = useMemo(() => {
    if (!template) {
      return {
        label: "Template missing",
        tone: "error" as const,
        description: "This block no longer has a valid template definition.",
      };
    }

    if (operationState.pending) {
      return {
        label: operationState.label || "Running template",
        tone: "primary" as const,
        description: "Generating output with the current field values.",
      };
    }

    if (runError) {
      return {
        label: "Prompt run failed",
        tone: "error" as const,
        description: runError,
      };
    }

    if (fieldTotal === 0) {
      return {
        label: "Template incomplete",
        tone: "warning" as const,
        description: "No fields are configured in this custom template.",
      };
    }

    if (incompleteFieldCount > 0) {
      return {
        label: "Capture remaining inputs",
        tone: "warning" as const,
        description: `${incompleteFieldCount} field${incompleteFieldCount === 1 ? "" : "s"} still need values.`,
      };
    }

    if (hasPromptTemplate && !hasLatestOutput) {
      return {
        label: "Ready to generate",
        tone: "primary" as const,
        description: "Run the template prompt to produce your first output.",
      };
    }

    return {
      label: "Block ready",
      tone: "success" as const,
      description: "Inputs and outputs are in sync for this template.",
    };
  }, [
    template,
    operationState.pending,
    operationState.label,
    runError,
    fieldTotal,
    incompleteFieldCount,
    hasPromptTemplate,
    hasLatestOutput,
  ]);

  function mutateCustomBlock(mutator: (entry: WorkspaceCustomBlock) => void) {
    mutateTypedBlock(tabId, block.id, "custom", mutator);
  }

  function updateFieldValue(
    field: WorkspaceCustomBlockField,
    value: string | number | boolean | undefined,
  ) {
    mutateCustomBlock((entry) => {
      if (field.type === "checkbox") {
        entry.values[field.key] = Boolean(value);
        return;
      }

      if (field.type === "number") {
        entry.values[field.key] = toNumberValue(value as string | number | undefined);
        return;
      }

      entry.values[field.key] = String(value ?? "");
    });

    setRunError(null);
  }

  function updateNotes(value: string) {
    mutateCustomBlock((entry) => {
      entry.notes = value;
    });
  }

  async function handleRunPrompt() {
    if (!template || !hasPromptTemplate || operationState.pending) {
      return;
    }

    setRunError(null);

    try {
      await Promise.resolve(runCustomPrompt(tabId, block.id));
    } catch (error) {
      setRunError(getErrorMessage(error, "Could not run this template prompt."));
    }
  }

  if (!template) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-warning">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">Template removed</p>
          <p className="mt-1 text-sm">
            This block template no longer exists. Delete this block or recreate the template
            definition.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className="rounded-full border-warning/30 bg-warning/10 text-warning"
            >
              Legacy block
            </Badge>
            <Badge variant="secondary" className="rounded-full">
              {template.name}
            </Badge>
            <Badge
              variant="secondary"
              className={cn("rounded-full", getStatusBadgeClass(blockStatus.tone))}
            >
              {blockStatus.label}
            </Badge>
            <span className="text-sm text-toned">
              {completedFieldCount}/{fieldTotal} fields
            </span>
          </div>
          <p className="text-sm text-toned">{blockStatus.description}</p>
        </div>

        {hasPromptTemplate ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full px-4"
            disabled={operationState.pending}
            onClick={handleRunPrompt}
          >
            {operationState.pending ? (
              <Loader2 className="animate-spin motion-reduce:animate-none" />
            ) : (
              <Play />
            )}
            {operationState.pending ? "Running" : "Run"}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {template.fields.map((field) => (
          <article
            key={field.id}
            className="space-y-3 rounded-surface border border-muted p-surface"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{field.label}</p>
              <Badge variant="secondary" className="rounded-full capitalize">
                {field.type}
              </Badge>
            </div>

            {field.type === "textarea" ? (
              <Textarea
                value={getTextValue(block, field)}
                rows={4}
                className="w-full rounded-xl"
                aria-label={field.label}
                onChange={(event) => updateFieldValue(field, event.target.value)}
              />
            ) : field.type === "checkbox" ? (
              <label className="flex items-center justify-between gap-3 rounded-xl border border-muted px-3 py-2">
                <span className="text-sm text-toned">
                  {getCheckedValue(block, field) ? "Enabled" : "Disabled"}
                </span>
                <BlockCheckbox
                  checked={getCheckedValue(block, field)}
                  aria-label={field.label}
                  onCheckedChange={(checked) => updateFieldValue(field, checked)}
                />
              </label>
            ) : (
              <Input
                value={
                  field.type === "number"
                    ? getNumericValue(block, field)
                    : getTextValue(block, field)
                }
                type={field.type === "number" ? "number" : "text"}
                className="w-full rounded-xl"
                aria-label={field.label}
                onChange={(event) => updateFieldValue(field, event.target.value)}
              />
            )}
          </article>
        ))}
      </div>

      {template.formula ? (
        <p className="text-sm text-toned">
          <span className="font-semibold text-foreground">{template.formula.label}: </span>
          {formatFormulaResult(formulaResult)}
        </p>
      ) : null}

      {template.includeNotes ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Notes</h3>
          <Textarea
            value={block.notes}
            rows={4}
            className="w-full rounded-xl"
            aria-label="Template notes"
            onChange={(event) => updateNotes(event.target.value)}
          />
        </div>
      ) : null}

      {template.aiPromptTemplate ? (
        <div className="space-y-3">
          <p className="text-sm text-toned">{getCustomPromptPreview(block)}</p>

          {runError ? (
            <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
              <AlertCircle className="mt-0.5 size-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Could not run template</p>
                <p className="mt-1 text-sm">{runError}</p>
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-muted p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">Latest output</p>
              {latestOutputEntry ? (
                <span className="text-xs text-toned">
                  {formatDateTime(latestOutputEntry.createdAt)}
                </span>
              ) : null}
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-toned">
              {block.latestAiOutput || "Run the template to capture output."}
            </p>
          </div>

          {block.outputHistory.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Recent runs</p>
              <div className="grid gap-2">
                {block.outputHistory.slice(0, 3).map((entry) => (
                  <article key={entry.id} className="rounded-surface border border-muted p-surface">
                    <p className="text-[11px] text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs italic text-toned">
                      &quot;{entry.prompt}&quot;
                    </p>
                    <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs text-toned">
                      {entry.output}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
