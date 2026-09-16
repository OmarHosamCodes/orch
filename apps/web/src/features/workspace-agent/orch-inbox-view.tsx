import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";

export type OrchInboxNote = {
  id: string;
  kind: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export function OrchInboxView({
  notes,
  emptyHint,
  onMarkRead,
  className,
}: {
  notes: OrchInboxNote[];
  emptyHint: string;
  onMarkRead: (noteId: string) => void;
  className?: string;
}) {
  if (notes.length === 0) {
    return (
      <p className={cn("px-4 py-8 text-center text-sm text-muted-foreground", className)}>
        {emptyHint}
      </p>
    );
  }

  return (
    <ul className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3", className)}>
      {notes.map((note) => {
        const unread = note.readAt === null;
        return (
          <li
            key={note.id}
            className={cn(
              "rounded-xl border border-border bg-card px-3 py-2.5",
              unread && "border-chart-2/40",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{note.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{note.body}</p>
              </div>
              {unread ? (
                <Button type="button" size="sm" variant="ghost" onClick={() => onMarkRead(note.id)}>
                  Mark read
                </Button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
