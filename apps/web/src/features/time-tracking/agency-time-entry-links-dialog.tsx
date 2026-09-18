import { useEffect, useState } from "react";

import {
  MAX_TIME_ENTRY_LINKS,
  normalizeTimeEntryLinkUrls,
  type TimeEntryLinkRecord,
} from "@/features/shared/agency-time-entry-links";
import {
  AgencyCompactDialog,
  AgencyCompactDialogBody,
  AgencyCompactDialogFooter,
  AgencyCompactDialogHeader,
} from "@/features/shared/dialog-kit/agency-compact-dialog-shell";
import { AgencyPasteChipField } from "@/features/shared/dialog-kit/agency-paste-chip-field";
import { Button } from "@/ui/button";

type AgencyTimeEntryLinksDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  links: readonly TimeEntryLinkRecord[];
  saving?: boolean;
  onSave: (urls: string[]) => void | Promise<void>;
};

export function AgencyTimeEntryLinksDialog({
  open,
  onOpenChange,
  links,
  saving = false,
  onSave,
}: AgencyTimeEntryLinksDialogProps) {
  const [drafts, setDrafts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDrafts(links.map((link) => link.url));
    setError(null);
  }, [open, links]);

  const handleSave = async () => {
    const normalized = normalizeTimeEntryLinkUrls(drafts);
    if (normalized.error) {
      setError(normalized.error);
      return;
    }
    setError(null);
    try {
      await onSave(normalized.urls);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save links.");
    }
  };

  return (
    <AgencyCompactDialog open={open} onOpenChange={onOpenChange} showCloseButton={!saving}>
      <AgencyCompactDialogHeader title="Links" description="Paste URLs. They appear in Reports." />
      <AgencyCompactDialogBody>
        <AgencyPasteChipField
          values={drafts}
          onChange={(next) => {
            setDrafts(next);
            if (error) setError(null);
          }}
          max={MAX_TIME_ENTRY_LINKS}
          disabled={saving}
          error={error}
          placeholder="Paste a URL"
        />
      </AgencyCompactDialogBody>
      <AgencyCompactDialogFooter>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={saving}
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          aria-busy={saving}
          disabled={saving}
          onClick={() => void handleSave()}
        >
          Save
        </Button>
      </AgencyCompactDialogFooter>
    </AgencyCompactDialog>
  );
}
