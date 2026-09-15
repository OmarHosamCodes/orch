import type { AgentModelPreset, AgentModelTier } from "@orch/agent/types";

import { ModelSelector, type ModelOption } from "@/components/assistant-ui/model-selector";
import { Button } from "@/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip";
import { cn } from "@/lib/utils";

const TIER_MODELS: ModelOption[] = [
  { id: "fast", name: "Fast", description: "Snappy replies" },
  { id: "balanced", name: "Balanced", description: "Default quality" },
  { id: "pro", name: "Pro", description: "Harder problems", efforts: true },
];

function ToggleChip({
  pressed,
  label,
  onPressedChange,
}: {
  pressed: boolean;
  label: string;
  onPressedChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "inline-flex h-8 flex-1 items-center justify-center rounded-full border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        pressed
          ? "border-border bg-secondary text-secondary-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
      onClick={() => onPressedChange(!pressed)}
    >
      {label}
    </button>
  );
}

export function WorkspaceAgentThreadModelSelector({
  modelTier,
  modelAuto,
  modelFree,
  modelEffort,
  selectedModelLabel,
  selectedModelButtonLabel,
  resolvedModelLabel,
  modelMenuOpen,
  onModelTierChange,
  onModelAutoChange,
  onModelFreeChange,
  onModelEffortChange,
  onModelMenuOpenChange,
  onOpenModelLibrary,
}: {
  modelTier: AgentModelTier;
  modelAuto: boolean;
  modelFree: boolean;
  modelEffort: AgentModelPreset["effort"];
  selectedModelLabel: string;
  selectedModelButtonLabel: string;
  resolvedModelLabel: string | null;
  modelMenuOpen: boolean;
  onModelTierChange: (tier: AgentModelTier) => void;
  onModelAutoChange: (auto: boolean) => void;
  onModelFreeChange: (free: boolean) => void;
  onModelEffortChange: (effort: AgentModelPreset["effort"]) => void;
  onModelMenuOpenChange: (open: boolean) => void;
  onOpenModelLibrary: () => void;
}) {
  const effortLabel =
    modelTier === "pro" && modelEffort
      ? modelEffort === "low"
        ? "Low"
        : modelEffort === "high"
          ? "High"
          : "Med"
      : null;
  const labelWithEffort = effortLabel
    ? `${selectedModelLabel} · ${effortLabel}`
    : selectedModelLabel;
  const modelTooltip = resolvedModelLabel
    ? `${labelWithEffort} · ${resolvedModelLabel}`
    : labelWithEffort;

  return (
    <ModelSelector.Root
      models={TIER_MODELS}
      value={modelTier}
      onValueChange={(value) => onModelTierChange(value as AgentModelTier)}
      effort={modelEffort}
      onEffortChange={(value) =>
        onModelEffortChange(value as NonNullable<AgentModelPreset["effort"]>)
      }
      open={modelMenuOpen}
      onOpenChange={onModelMenuOpenChange}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <ModelSelector.Trigger
            variant="ghost"
            size="sm"
            className="h-7 rounded-full px-2.5 text-muted-foreground hover:text-foreground"
            aria-label={`Model: ${selectedModelLabel}`}
          >
            {selectedModelButtonLabel}
          </ModelSelector.Trigger>
        </TooltipTrigger>
        <TooltipContent side="top">{modelTooltip}</TooltipContent>
      </Tooltip>
      <ModelSelector.Content
        searchable={false}
        align="start"
        side="top"
        sideOffset={8}
        className="w-72"
        data-workspace-agent-overlay
      >
        <ModelSelector.List />
        <ModelSelector.Effort />
        <div className="flex flex-col gap-2 border-t border-border p-3">
          <div className="flex gap-2">
            <ToggleChip pressed={modelAuto} label="Auto" onPressedChange={onModelAutoChange} />
            <ToggleChip pressed={modelFree} label="Free" onPressedChange={onModelFreeChange} />
          </div>
          {resolvedModelLabel ? (
            <p className="font-mono text-xs text-muted-foreground">
              Last used · {resolvedModelLabel}
            </p>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="justify-start px-2 text-muted-foreground hover:text-foreground"
            onClick={() => {
              onModelMenuOpenChange(false);
              onOpenModelLibrary();
            }}
          >
            Browse all models
          </Button>
        </div>
      </ModelSelector.Content>
    </ModelSelector.Root>
  );
}
