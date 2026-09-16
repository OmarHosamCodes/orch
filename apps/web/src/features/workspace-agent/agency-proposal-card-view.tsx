import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";
import {
  proposalPreviewEmptyLabel,
  proposalPreviewLines,
} from "@/features/workspace-agent/proposal-change-preview";

type AgencyProposalCardViewModel = {
  proposalId: string;
  label: string;
  before: unknown;
  after: unknown;
  boardHref?: string | null;
};

type AgencyProposalCardViewProps = {
  proposal: AgencyProposalCardViewModel;
  busy: boolean;
  error?: string | null;
  onApprove: () => void;
  onReject: () => void;
  className?: string;
  embedded?: boolean;
};

function PreviewColumn({ title, value }: { title: string; value: unknown }) {
  const lines = proposalPreviewLines(value);
  return (
    <div className="min-w-0 rounded-xl bg-muted/40 px-3 py-2.5">
      <p className="text-[11px] font-medium text-muted-foreground">{title}</p>
      {lines.length === 0 ? (
        <p className="mt-1 text-xs text-foreground">{proposalPreviewEmptyLabel(value)}</p>
      ) : (
        <dl className="mt-1.5 flex flex-col gap-1">
          {lines.map((line) => (
            <div key={`${title}-${line.label}`} className="min-w-0">
              <dt className="text-[11px] text-muted-foreground">{line.label}</dt>
              <dd className="truncate text-xs font-medium text-foreground">{line.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/** Approve/Reject card with labeled before and after, not a JSON dump. */
export function AgencyProposalCardView({
  proposal,
  busy,
  error = null,
  onApprove,
  onReject,
  className,
  embedded = false,
}: AgencyProposalCardViewProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-3 text-card-foreground",
        embedded
          ? "rounded-none border-0 bg-transparent p-0"
          : "max-w-[min(100%,36rem)] rounded-surface bg-card p-surface",
        className,
      )}
    >
      <div>
        <p className="text-sm font-semibold tracking-tight text-foreground">{proposal.label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Review the change, then approve or reject.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <PreviewColumn title="Before" value={proposal.before} />
        <PreviewColumn title="After" value={proposal.after} />
      </div>

      {error ? (
        <p role="alert" className="text-xs leading-snug text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 rounded-full px-3.5"
          disabled={busy}
          onClick={onReject}
        >
          Reject
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-8 min-w-24 rounded-full px-4"
          disabled={busy}
          onClick={onApprove}
        >
          {busy ? "Saving…" : "Approve"}
        </Button>
      </div>
    </div>
  );
}
