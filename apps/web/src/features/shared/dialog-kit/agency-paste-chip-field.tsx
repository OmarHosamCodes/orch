import { Link2, Plus, Upload, X } from "lucide-react";
import { useRef, type ClipboardEvent, type DragEvent } from "react";

import {
  extractPastedUrls,
  pasteChipHostHueId,
  pasteChipHostLabel,
} from "@/features/shared/dialog-kit/agency-paste-chip";
import { projectHueStyle } from "@/features/shared/project-palette";
import { agencyFocusRingClass, agencyInputPlaceholderClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";

type AgencyPasteChipFieldProps = {
  values: string[];
  onChange: (values: string[]) => void;
  max?: number;
  disabled?: boolean;
  error?: string | null;
  placeholder?: string;
  acceptFile?: boolean;
  onFile?: (file: File | null) => void;
  fileName?: string | null;
};

export function AgencyPasteChipField({
  values,
  onChange,
  max = 8,
  disabled = false,
  error,
  placeholder = "Paste a URL",
  acceptFile = false,
  onFile,
  fileName,
}: AgencyPasteChipFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canAdd = values.length < max;

  function addUrls(urls: string[]) {
    if (!canAdd || urls.length === 0) return;
    const next = [...values];
    for (const url of urls) {
      if (next.length >= max) break;
      if (next.includes(url)) continue;
      next.push(url);
    }
    onChange(next);
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    const urls = extractPastedUrls(text);
    if (urls.length === 0) return;
    event.preventDefault();
    addUrls(urls);
    event.currentTarget.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (disabled) return;
    const file = event.dataTransfer.files[0];
    if (file && acceptFile && onFile) {
      onFile(file);
      return;
    }
    const text = event.dataTransfer.getData("text");
    addUrls(extractPastedUrls(text));
  }

  function commitDraft(raw: string) {
    const urls = extractPastedUrls(raw);
    if (urls.length > 0) {
      addUrls(urls);
      return true;
    }
    if (raw.trim()) {
      addUrls([raw.trim()]);
      return true;
    }
    return false;
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div
        className={cn(
          "flex min-h-10 min-w-0 flex-wrap items-center gap-1.5 rounded-xl border border-dashed border-default bg-default p-1.5",
          "transition-[border-color,background-color] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-out)]",
          "focus-within:border-solid focus-within:border-ring",
          error && "border-destructive",
          "motion-reduce:transition-none",
        )}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        {values.map((url, index) => {
          const host = pasteChipHostLabel(url);
          const hueId = pasteChipHostHueId(host);
          return (
            <span
              key={`${url}-${index}`}
              className={cn(
                "inline-flex max-w-full items-center gap-1.5 rounded-full border border-default bg-elevated py-0.5 pr-0.5 pl-1.5",
                "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-[var(--motion-duration-fast)] motion-reduce:animate-none",
              )}
            >
              <span
                className={cn(
                  "inline-flex size-5 shrink-0 items-center justify-center rounded-full",
                  "bg-[var(--project-hue-soft)] text-[var(--project-hue)] dark:bg-[var(--project-hue-soft-dark)] dark:text-[var(--project-hue-dark)]",
                )}
                style={projectHueStyle(host, hueId)}
                aria-hidden
              >
                <Link2 className="size-2.5" strokeWidth={2.25} />
              </span>
              <span className="max-w-[10rem] truncate font-mono text-[11px] text-highlighted">
                {host}
              </span>
              <button
                type="button"
                aria-label={`Remove ${pasteChipHostLabel(url)}`}
                disabled={disabled}
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full text-muted hover:bg-muted hover:text-highlighted",
                  agencyFocusRingClass,
                )}
                onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))}
              >
                <X className="size-3" />
              </button>
            </span>
          );
        })}
        {fileName ? (
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-default bg-elevated py-0.5 pr-0.5 pl-2">
            <Upload className="size-3 shrink-0 text-muted" aria-hidden />
            <span className="max-w-[10rem] truncate text-[11px] text-highlighted">{fileName}</span>
            <button
              type="button"
              aria-label="Remove file"
              disabled={disabled}
              className={cn(
                "inline-flex size-6 items-center justify-center rounded-full text-muted hover:bg-muted hover:text-highlighted",
                agencyFocusRingClass,
              )}
              onClick={() => onFile?.(null)}
            >
              <X className="size-3" />
            </button>
          </span>
        ) : null}
        {canAdd ? (
          <Input
            type="url"
            inputMode="url"
            disabled={disabled}
            placeholder={values.length === 0 && !fileName ? placeholder : "Add another"}
            className={cn(
              "h-8 min-w-[8rem] flex-1 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0",
              "text-sm",
              agencyInputPlaceholderClass,
            )}
            onPaste={handlePaste}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              if (commitDraft(event.currentTarget.value)) {
                event.currentTarget.value = "";
              }
            }}
            onBlur={(event) => {
              if (commitDraft(event.currentTarget.value)) {
                event.currentTarget.value = "";
              }
            }}
          />
        ) : null}
        {acceptFile && onFile ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              aria-label="Source file"
              disabled={disabled}
              onChange={(event) => {
                onFile(event.target.files?.[0] ?? null);
                event.currentTarget.value = "";
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              className="h-8 gap-1.5 px-2 text-xs"
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus className="size-3.5" aria-hidden />
              File
            </Button>
          </>
        ) : null}
      </div>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
