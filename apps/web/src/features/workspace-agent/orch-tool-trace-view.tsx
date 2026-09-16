import { cn } from "@/lib/utils";

export function OrchToolTraceView({
  name,
  status,
  inputText,
  outputText,
  error,
  className,
}: {
  name: string;
  status: "completed" | "error" | "in_progress";
  inputText: string;
  outputText: string;
  error: string | null;
  className?: string;
}) {
  const statusLabel = status === "in_progress" ? "Running" : status === "error" ? "Failed" : "Done";
  return (
    <details
      className={cn(
        "mt-2 max-w-[min(100%,36rem)] rounded-xl border border-border bg-card px-3 py-2 text-xs",
        className,
      )}
    >
      <summary className="cursor-pointer font-medium text-foreground">
        {name} · {statusLabel}
      </summary>
      {error ? <p className="mt-2 text-destructive">{error}</p> : null}
      {inputText ? (
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-muted-foreground">
          {inputText}
        </pre>
      ) : null}
      {outputText ? (
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-muted-foreground">
          {outputText}
        </pre>
      ) : null}
    </details>
  );
}
