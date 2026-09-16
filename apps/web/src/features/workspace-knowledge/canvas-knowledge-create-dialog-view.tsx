import { FileText, Folder, Pin, Scale, StickyNote, Upload, User } from "lucide-react";

import {
  knowledgeCreateAccentClass,
  knowledgeCreateDescription,
  knowledgeCreateLabel,
  knowledgeCreateSubmitLabel,
  knowledgeDecisionStatuses,
  knowledgePinKinds,
  pinChipLabel,
  type KnowledgeCreateKind,
  type KnowledgeDecisionStatus,
  type KnowledgeDialogKind,
  type KnowledgePinKind,
} from "@/features/workspace-knowledge/knowledge-create";
import { AgencySearchSelect } from "@/features/shared/agency-search-select";
import {
  AgencyCompactDialog,
  AgencyCompactDialogBody,
  AgencyCompactDialogFooter,
  AgencyCompactDialogForm,
  AgencyCompactDialogHeader,
  AgencyCompactDialogMeta,
} from "@/features/shared/dialog-kit/agency-compact-dialog-shell";
import { AgencyIdentityField } from "@/features/shared/dialog-kit/agency-identity-field";
import { AgencyKitReveal } from "@/features/shared/dialog-kit/agency-kit-reveal";
import { AgencyModeSegment } from "@/features/shared/dialog-kit/agency-mode-segment";
import { AgencyNoteField } from "@/features/shared/dialog-kit/agency-note-field";
import { AgencyPasteChipField } from "@/features/shared/dialog-kit/agency-paste-chip-field";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { cn } from "@/lib/utils";

type KnowledgeCreateTargetOption = {
  id: string;
  label: string;
  objectType: string;
};

type CanvasKnowledgeUnplacedItem = {
  id: string;
  chip: string;
  title: string;
};

export type CanvasKnowledgeCreateDialogViewProps = {
  open: boolean;
  surface: KnowledgeDialogKind;
  title: string;
  visibility: "private" | "team";
  teamSelected: boolean;
  status: KnowledgeDecisionStatus;
  recommendation: string;
  sourceUrl: string;
  pinKind: KnowledgePinKind;
  pinQuery: string;
  pinOptions: KnowledgeCreateTargetOption[];
  selectedPinId: string | null;
  aboutOptions: KnowledgeCreateTargetOption[];
  aboutId: string | null;
  unplaced: CanvasKnowledgeUnplacedItem[];
  pending: boolean;
  error: string | null;
  pendingLabel: string | null;
  canUploadSource: boolean;
  onOpenChange: (open: boolean) => void;
  onTitleChange: (title: string) => void;
  onVisibilityChange: (visibility: "private" | "team") => void;
  onStatusChange: (status: KnowledgeDecisionStatus) => void;
  onRecommendationChange: (value: string) => void;
  onSourceUrlChange: (value: string) => void;
  onSourceFileChange: (file: File | null) => void;
  onPinKindChange: (kind: KnowledgePinKind) => void;
  onPinQueryChange: (value: string) => void;
  onSelectPin: (option: KnowledgeCreateTargetOption) => void;
  onAboutIdChange: (id: string | null) => void;
  onPlaceUnplaced: (id: string) => void;
  onRemoveUnplaced: (id: string) => void;
  onSubmit: () => void;
};

function kindIcon(kind: KnowledgeCreateKind) {
  switch (kind) {
    case "note":
      return StickyNote;
    case "decision":
      return Scale;
    case "folder":
      return Folder;
    case "person":
      return User;
    case "source":
      return Upload;
    case "pin":
      return Pin;
    case "document":
      return FileText;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function CanvasKnowledgeCreateDialogView({
  open,
  surface,
  title,
  visibility,
  teamSelected,
  status,
  recommendation,
  sourceUrl,
  pinKind,
  pinQuery,
  pinOptions,
  selectedPinId,
  aboutOptions,
  aboutId,
  unplaced,
  pending,
  error,
  pendingLabel,
  canUploadSource,
  onOpenChange,
  onTitleChange,
  onVisibilityChange,
  onStatusChange,
  onRecommendationChange,
  onSourceUrlChange,
  onSourceFileChange,
  onPinKindChange,
  onPinQueryChange,
  onSelectPin,
  onAboutIdChange,
  onPlaceUnplaced,
  onRemoveUnplaced,
  onSubmit,
}: CanvasKnowledgeCreateDialogViewProps) {
  const isUnplaced = surface === "unplaced";
  const kind = isUnplaced ? "note" : surface;
  const isPin = surface === "pin";
  const canSubmit = isUnplaced ? false : isPin ? Boolean(selectedPinId) : title.trim().length > 0;
  const Icon = isUnplaced ? StickyNote : kindIcon(kind);
  const heading = isUnplaced ? "Waiting cards" : knowledgeCreateLabel(kind);
  const description = isUnplaced
    ? "Place leftover cards at this click, or remove them."
    : knowledgeCreateDescription(kind);

  return (
    <AgencyCompactDialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      showCloseButton={!pending}
    >
      <AgencyCompactDialogHeader
        title={heading}
        description={description}
        badge={
          <span className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-lg",
                knowledgeCreateAccentClass(surface),
              )}
            >
              <Icon className="size-3.5" aria-hidden />
            </span>
            {!isUnplaced && teamSelected ? (
              <AgencyModeSegment
                aria-label="Visibility"
                value={visibility}
                options={[
                  { value: "private", label: "Private" },
                  { value: "team", label: "Team" },
                ]}
                onChange={(value) => onVisibilityChange(value)}
                disabled={pending}
              />
            ) : null}
          </span>
        }
      />
      <AgencyCompactDialogForm
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <AgencyCompactDialogBody>
          {isUnplaced ? (
            unplaced.length === 0 ? (
              <p className="text-sm text-muted-foreground">Every card is already on the board.</p>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                {unplaced.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{item.title}</p>
                      <Badge variant="secondary" className="mt-1">
                        {item.chip}
                      </Badge>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        size="xs"
                        variant="secondary"
                        onClick={() => onPlaceUnplaced(item.id)}
                      >
                        Place here
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        onClick={() => onRemoveUnplaced(item.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : null}

          {isPin ? (
            <div className="grid gap-2.5">
              <AgencyCompactDialogMeta>
                <AgencySearchSelect
                  id="knowledge-pin-kind"
                  value={pinKind}
                  onValueChange={(value) => onPinKindChange(value as KnowledgePinKind)}
                  options={knowledgePinKinds.map((item) => ({
                    value: item,
                    label: pinChipLabel(item),
                  }))}
                  disabled={pending || !teamSelected}
                  aria-label="Agency record"
                  variant="chip"
                />
              </AgencyCompactDialogMeta>
              <Input
                value={pinQuery}
                onChange={(event) => onPinQueryChange(event.target.value)}
                placeholder="Search by name"
                aria-label="Search Agency"
                disabled={pending || !teamSelected}
              />
              {!teamSelected ? (
                <p className="text-sm text-muted-foreground">Select a team to pin live records.</p>
              ) : (
                <ul className="max-h-40 overflow-auto rounded-xl border border-border">
                  {pinOptions.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-muted-foreground">No matches.</li>
                  ) : (
                    pinOptions.map((option) => {
                      const selected = option.id === selectedPinId;
                      return (
                        <li key={option.id}>
                          <button
                            type="button"
                            className={cn(
                              "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                              selected ? "bg-primary/10 text-foreground" : "hover:bg-muted",
                            )}
                            onClick={() => onSelectPin(option)}
                          >
                            <Pin className="size-3.5 text-primary" aria-hidden />
                            {option.label}
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              )}
            </div>
          ) : null}

          {!isUnplaced && !isPin ? (
            <AgencyIdentityField
              id="knowledge-title"
              value={title}
              onChange={onTitleChange}
              placeholder="Name this card"
              disabled={pending}
              autoFocus
              aria-label="Title"
            />
          ) : null}

          <AgencyKitReveal open={surface === "decision"}>
            <div className="grid gap-2.5 pt-1">
              <AgencyCompactDialogMeta>
                <AgencySearchSelect
                  id="knowledge-decision-status"
                  value={status}
                  onValueChange={(value) => onStatusChange(value as KnowledgeDecisionStatus)}
                  options={knowledgeDecisionStatuses.map((item) => ({
                    value: item,
                    label: item,
                  }))}
                  disabled={pending}
                  aria-label="Status"
                  variant="chip"
                />
              </AgencyCompactDialogMeta>
              <AgencyNoteField
                id="knowledge-recommendation"
                value={recommendation}
                onChange={onRecommendationChange}
                placeholder="Optional recommendation"
                disabled={pending}
                label="Recommendation"
              />
            </div>
          </AgencyKitReveal>

          <AgencyKitReveal open={surface === "source"}>
            <div className="pt-1">
              <AgencyPasteChipField
                values={sourceUrl.trim() ? [sourceUrl.trim()] : []}
                onChange={(urls) => onSourceUrlChange(urls[0] ?? "")}
                max={1}
                disabled={pending}
                placeholder="Paste a URL"
                acceptFile={canUploadSource}
                onFile={canUploadSource ? onSourceFileChange : undefined}
              />
              {!canUploadSource ? (
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Select a team to upload a file.
                </p>
              ) : null}
            </div>
          </AgencyKitReveal>

          <AgencyKitReveal open={surface === "note" || surface === "decision"}>
            <div className="pt-1">
              <AgencyCompactDialogMeta>
                <AgencySearchSelect
                  id="knowledge-about"
                  value={aboutId ?? "none"}
                  onValueChange={(value) => onAboutIdChange(value === "none" ? null : value)}
                  options={[
                    { value: "none", label: "About: none" },
                    ...aboutOptions.map((option) => ({ value: option.id, label: option.label })),
                  ]}
                  disabled={pending}
                  aria-label="About"
                  variant="chip"
                />
              </AgencyCompactDialogMeta>
            </div>
          </AgencyKitReveal>

          {!isUnplaced && visibility === "team" ? (
            <p className="text-xs text-muted-foreground">
              Team cards wait for Approve in Orch. They will not appear until then.
            </p>
          ) : null}

          {pendingLabel ? <p className="text-sm text-muted-foreground">{pendingLabel}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </AgencyCompactDialogBody>
        <AgencyCompactDialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {isUnplaced ? "Done" : "Cancel"}
          </Button>
          {isUnplaced ? null : (
            <Button type="submit" disabled={pending || !canSubmit}>
              <Icon className="size-3.5" aria-hidden />
              {pending ? "Saving" : knowledgeCreateSubmitLabel(kind)}
            </Button>
          )}
        </AgencyCompactDialogFooter>
      </AgencyCompactDialogForm>
    </AgencyCompactDialog>
  );
}
