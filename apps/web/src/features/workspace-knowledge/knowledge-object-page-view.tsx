import { Link } from "@/lib/navigation";

import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";

type KnowledgeObjectBacklink = {
  id: string;
  label: string;
  href: string;
};

export type KnowledgeObjectPageViewProps = {
  title: string;
  chip: string;
  body: string | null;
  propertyLines: { label: string; value: string }[];
  backlinks: KnowledgeObjectBacklink[];
  agencyLinks: { label: string; href: string }[];
  error: string | null;
  missing: boolean;
  linkRelationType: string;
  linkTargetId: string;
  linkTargets: KnowledgeObjectBacklink[];
  linkPending: boolean;
  onLinkRelationTypeChange: (value: string) => void;
  onLinkTargetIdChange: (value: string) => void;
  onCreateLink: () => void;
  onOpenOnBoard: () => void;
};

export function KnowledgeObjectPageView({
  title,
  chip,
  body,
  propertyLines,
  backlinks,
  agencyLinks,
  error,
  missing,
  linkRelationType,
  linkTargetId,
  linkTargets,
  linkPending,
  onLinkRelationTypeChange,
  onLinkTargetIdChange,
  onCreateLink,
  onOpenOnBoard,
}: KnowledgeObjectPageViewProps) {
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 overflow-auto px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <Badge variant="secondary">{chip}</Badge>
          <h1 className="text-2xl font-semibold text-highlighted">{title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" asChild>
            <Link to="/canvas">Back to canvas</Link>
          </Button>
          <Button type="button" onClick={onOpenOnBoard}>
            Open on board
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {missing ? (
        <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm">
          This record is missing or no longer available.
        </div>
      ) : null}

      {body ? <p className="whitespace-pre-wrap text-sm leading-6 text-toned">{body}</p> : null}

      {propertyLines.length > 0 ? (
        <dl className="grid gap-3 text-sm">
          {propertyLines.map((line) => (
            <div key={line.label} className="grid gap-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                {line.label}
              </dt>
              <dd className="text-toned">{line.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {agencyLinks.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {agencyLinks.map((link) => (
            <Badge key={link.href} variant="outline" asChild>
              <Link to={link.href}>{link.label}</Link>
            </Badge>
          ))}
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-highlighted">Link to</h2>
        <div className="flex flex-wrap gap-2">
          <select
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            value={linkRelationType}
            onChange={(event) => onLinkRelationTypeChange(event.target.value)}
            aria-label="Relation type"
          >
            <option value="about">about</option>
            <option value="supports">supports</option>
            <option value="related">related</option>
            <option value="mentions">mentions</option>
          </select>
          <select
            className="h-9 min-w-48 flex-1 rounded-md border border-input bg-transparent px-3 text-sm"
            value={linkTargetId}
            onChange={(event) => onLinkTargetIdChange(event.target.value)}
            aria-label="Link target"
          >
            <option value="">Choose a target</option>
            {linkTargets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.label}
              </option>
            ))}
          </select>
          <Button type="button" disabled={linkPending || !linkTargetId} onClick={onCreateLink}>
            Link
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-highlighted">Backlinks</h2>
        {backlinks.length === 0 ? (
          <p className="text-sm text-muted">Nothing points here yet.</p>
        ) : (
          <ul className="space-y-2">
            {backlinks.map((link) => (
              <li key={link.id}>
                <Link
                  className="text-sm text-primary underline-offset-4 hover:underline"
                  to={link.href}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
