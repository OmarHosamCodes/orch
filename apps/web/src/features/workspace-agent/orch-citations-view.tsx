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
    <ul className="flex flex-wrap gap-1.5">
      {citations.map((citation) => (
        <li key={citation.url}>
          <a
            href={citation.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-48 truncate rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
          >
            {citation.title}
          </a>
        </li>
      ))}
    </ul>
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
