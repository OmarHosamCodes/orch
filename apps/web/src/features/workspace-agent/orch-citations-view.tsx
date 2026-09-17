export type OrchCitation = {
  url: string;
  title: string;
};

type OrchCitationsViewProps = {
  citations: OrchCitation[];
};

export function OrchCitationsView({ citations }: OrchCitationsViewProps) {
  if (citations.length === 0) return null;
  return (
    <p className="text-[11px] text-muted-foreground">
      Sources:{" "}
      {citations.map((citation, index) => (
        <span key={citation.url}>
          {index > 0 ? " · " : null}
          <a
            href={citation.url}
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground"
          >
            {citation.title}
          </a>
        </span>
      ))}
    </p>
  );
}

export function citationsFromToolOutput(name: string, output: unknown): OrchCitation[] {
  if (name !== "fetch_web_page" || !output || typeof output !== "object") return [];
  const record = output as { url?: unknown; title?: unknown; error?: unknown };
  if (typeof record.url !== "string" || record.error) return [];
  const title =
    typeof record.title === "string" && record.title.trim() ? record.title.trim() : record.url;
  return [{ url: record.url, title }];
}
