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
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { RadioGroup, RadioGroupItem } from "@/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Separator } from "@/ui/separator";
import { Textarea } from "@/ui/textarea";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,40rem)] gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="space-y-1 border-b border-border px-5 py-4 text-left">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-xl",
                knowledgeCreateAccentClass(surface),
              )}
            >
              <Icon className="size-4" aria-hidden />
            </span>
            <DialogTitle className="text-base font-semibold text-foreground">{heading}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
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
              <div className="grid gap-2">
                <Label htmlFor="knowledge-pin-kind">Agency record</Label>
                <Select
                  value={pinKind}
                  onValueChange={(value) => onPinKindChange(value as KnowledgePinKind)}
                  disabled={pending || !teamSelected}
                >
                  <SelectTrigger id="knowledge-pin-kind" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {knowledgePinKinds.map((item) => (
                      <SelectItem key={item} value={item}>
                        {pinChipLabel(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={pinQuery}
                  onChange={(event) => onPinQueryChange(event.target.value)}
                  placeholder="Search by name"
                  aria-label="Search Agency"
                  disabled={pending || !teamSelected}
                />
                {!teamSelected ? (
                  <p className="text-sm text-muted-foreground">
                    Select a team to pin live records.
                  </p>
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
              <div className="grid gap-2">
                <Label htmlFor="knowledge-title">Title</Label>
                <Input
                  id="knowledge-title"
                  value={title}
                  onChange={(event) => onTitleChange(event.target.value)}
                  placeholder="Name this card"
                  disabled={pending}
                  autoFocus
                />
              </div>
            ) : null}

            {surface === "decision" ? (
              <div className="grid gap-2">
                <Label htmlFor="knowledge-decision-status">Status</Label>
                <Select
                  value={status}
                  onValueChange={(value) => onStatusChange(value as KnowledgeDecisionStatus)}
                  disabled={pending}
                >
                  <SelectTrigger id="knowledge-decision-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {knowledgeDecisionStatuses.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Label htmlFor="knowledge-recommendation">Recommendation</Label>
                <Textarea
                  id="knowledge-recommendation"
                  value={recommendation}
                  onChange={(event) => onRecommendationChange(event.target.value)}
                  placeholder="Optional"
                  disabled={pending}
                  rows={3}
                />
              </div>
            ) : null}

            {surface === "source" ? (
              <div className="grid gap-2">
                <Label htmlFor="knowledge-source-url">URL</Label>
                <Input
                  id="knowledge-source-url"
                  value={sourceUrl}
                  onChange={(event) => onSourceUrlChange(event.target.value)}
                  placeholder="https://"
                  disabled={pending}
                />
                {canUploadSource ? (
                  <Input
                    type="file"
                    aria-label="Source file"
                    disabled={pending}
                    onChange={(event) => onSourceFileChange(event.target.files?.[0] ?? null)}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Select a team to upload a file.</p>
                )}
              </div>
            ) : null}

            {surface === "note" || surface === "decision" ? (
              <div className="grid gap-2">
                <Label htmlFor="knowledge-about">About</Label>
                <Select
                  value={aboutId ?? "none"}
                  onValueChange={(value) => onAboutIdChange(value === "none" ? null : value)}
                  disabled={pending}
                >
                  <SelectTrigger id="knowledge-about" className="w-full">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {aboutOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {!isUnplaced && teamSelected ? (
              <fieldset className="grid gap-2">
                <legend className="text-sm font-medium">Visibility</legend>
                <RadioGroup
                  className="grid grid-cols-2 gap-2"
                  value={visibility}
                  onValueChange={(value) => onVisibilityChange(value as "private" | "team")}
                  disabled={pending}
                >
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm has-[[data-checked]]:border-primary/40 has-[[data-checked]]:bg-primary/5">
                    <RadioGroupItem value="private" />
                    Private
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm has-[[data-checked]]:border-primary/40 has-[[data-checked]]:bg-primary/5">
                    <RadioGroupItem value="team" />
                    Team
                  </label>
                </RadioGroup>
                {visibility === "team" ? (
                  <p className="text-xs text-muted-foreground">
                    Team cards wait for Approve in Orch. They will not appear until then.
                  </p>
                ) : null}
              </fieldset>
            ) : null}

            {pendingLabel ? <p className="text-sm text-muted-foreground">{pendingLabel}</p> : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <Separator />
          <DialogFooter className="px-5 py-3">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {isUnplaced ? "Done" : "Cancel"}
            </Button>
            {isUnplaced ? null : (
              <Button type="submit" disabled={pending || !canSubmit}>
                <Icon className="size-3.5" aria-hidden />
                {pending ? "Saving" : knowledgeCreateSubmitLabel(kind)}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
