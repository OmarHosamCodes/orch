import type { UiSchemaDoc, UiSchemaNode } from "@orch/agent/types";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Badge } from "@/ui/badge";
import { Separator } from "@/ui/separator";
import { cn } from "@/lib/utils";

// ============================================================================
// AI UI SCHEMA RENDERER
// ============================================================================
// Pure client render of a `kind: "schema"` artifact. No data fetching, no
// user HTML — every node maps onto Orch/shadcn tokens.
// ============================================================================

const GAP: Record<"sm" | "md" | "lg", string> = {
  sm: "gap-1.5",
  md: "gap-3",
  lg: "gap-5",
};

const COLUMNS: Record<1 | 2 | 3 | 4, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
};

const CALLOUT_TONE: Record<"info" | "success" | "warning" | "danger", string> = {
  info: "border-border bg-muted/40 text-foreground",
  success: "border-emerald-500/30 bg-emerald-500/10 text-foreground",
  warning: "border-amber-500/30 bg-amber-500/10 text-foreground",
  danger: "border-destructive/30 bg-destructive/10 text-foreground",
};

const PILL_TONE: Record<"default" | "accent" | "muted", "outline" | "default" | "secondary"> = {
  default: "outline",
  accent: "default",
  muted: "secondary",
};

function SchemaNode({ node }: { node: UiSchemaNode }) {
  switch (node.type) {
    case "text":
      return (
        <p
          className={cn(
            "text-[13px] leading-relaxed",
            node.tone === "muted" ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {node.text}
        </p>
      );

    case "markdown":
      return (
        <div className="space-y-2 text-[13px] leading-relaxed text-foreground [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[12px] [&_li]:ms-4 [&_li]:list-disc [&_strong]:font-semibold">
          <Markdown remarkPlugins={[remarkGfm]}>{node.text}</Markdown>
        </div>
      );

    case "divider":
      return <Separator className="my-1" />;

    case "stat":
      return (
        <div className="rounded-xl border border-border bg-card px-3 py-2.5">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {node.label}
          </p>
          <p className="mt-1 text-xl leading-none font-semibold tabular-nums text-foreground">
            {node.value}
          </p>
          {node.hint ? <p className="mt-1 text-[11px] text-muted-foreground">{node.hint}</p> : null}
        </div>
      );

    case "callout":
      return (
        <div
          className={cn(
            "rounded-xl border px-3 py-2.5 text-[13px] leading-relaxed",
            CALLOUT_TONE[node.tone],
          )}
        >
          {node.title ? <p className="mb-0.5 font-semibold">{node.title}</p> : null}
          <p className="text-foreground/85">{node.body}</p>
        </div>
      );

    case "pillRow":
      return (
        <div className="flex flex-wrap gap-1.5">
          {node.pills.map((pill, i) => (
            <Badge
              key={`${pill.label}-${i}`}
              variant={PILL_TONE[pill.tone ?? "default"]}
              className="text-[11px]"
            >
              {pill.label}
            </Badge>
          ))}
        </div>
      );

    case "table":
      return (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-border">
                {node.columns.map((column) => (
                  <th
                    key={column}
                    className="h-8 px-2.5 text-start text-[11px] font-medium text-muted-foreground"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {node.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-border last:border-b-0">
                  {node.columns.map((column, cellIndex) => (
                    <td key={column} className="px-2.5 py-1.5 tabular-nums text-foreground">
                      {row[cellIndex] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "imageGrid":
      return (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {node.items.map((item, i) => {
            const media = (
              <>
                <img
                  src={item.src}
                  alt={item.title ?? ""}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="aspect-[4/3] w-full bg-muted object-cover"
                />
                {item.title || item.subtitle ? (
                  <div className="px-2 py-1.5">
                    {item.title ? (
                      <p className="truncate text-[12px] font-medium text-foreground">
                        {item.title}
                      </p>
                    ) : null}
                    {item.subtitle ? (
                      <p className="truncate text-[11px] text-muted-foreground">{item.subtitle}</p>
                    ) : null}
                  </div>
                ) : null}
              </>
            );
            const className = "block overflow-hidden rounded-surface border border-border bg-card";
            return item.href ? (
              <a
                key={`${item.src}-${i}`}
                href={item.href}
                target="_blank"
                rel="noreferrer noopener"
                className={cn(className, "hover:border-foreground/25")}
              >
                {media}
              </a>
            ) : (
              <div key={`${item.src}-${i}`} className={className}>
                {media}
              </div>
            );
          })}
        </div>
      );

    case "stack":
      return (
        <div className={cn("flex flex-col", GAP[node.gap ?? "md"])}>
          {node.children.map((child, i) => (
            <SchemaNode key={i} node={child} />
          ))}
        </div>
      );

    case "grid":
      return (
        <div className={cn("grid", COLUMNS[node.columns ?? 2], GAP[node.gap ?? "md"])}>
          {node.children.map((child, i) => (
            <SchemaNode key={i} node={child} />
          ))}
        </div>
      );

    default: {
      const _exhaustive: never = node;
      void _exhaustive;
      return null;
    }
  }
}

export function AgentUiSchemaRendererView({ doc }: { doc: UiSchemaDoc }) {
  return <SchemaNode node={doc.root} />;
}
