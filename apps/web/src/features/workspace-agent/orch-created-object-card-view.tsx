import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";

type OrchCreatedObject = {
  kind: "node" | "block" | "knowledge";
  id: string;
  title: string;
  href: string;
};

function kindLabel(kind: OrchCreatedObject["kind"]): string {
  switch (kind) {
    case "node":
      return "Canvas node";
    case "block":
      return "Canvas block";
    case "knowledge":
      return "Knowledge";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function OrchCreatedObjectCardView({
  object,
  onOpen,
  className,
}: {
  object: OrchCreatedObject;
  onOpen: (href: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-2 flex max-w-[min(100%,36rem)] items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-muted-foreground">{kindLabel(object.kind)}</p>
        <p className="truncate text-sm font-medium text-foreground">{object.title}</p>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={() => onOpen(object.href)}>
        Open
      </Button>
    </div>
  );
}
