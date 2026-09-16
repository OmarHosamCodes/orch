import type { WorkspaceKanbanBlock } from "@orch/workspace";
import { Calendar, ChevronUp, Expand, Plus, Trash2, User } from "lucide-react";
import { useMemo, useState, type DragEvent } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { AgencyDateField } from "@/features/shared/date/agency-date-field";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { cn } from "@/lib/utils";

export function WorkspaceKanbanBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceKanbanBlock>) {
  const {
    addKanbanColumn,
    mutateKanbanColumn,
    removeKanbanColumn,
    addKanbanCard,
    mutateKanbanCard,
    moveKanbanCard,
    removeKanbanCard,
  } = useWorkspaceNodeEditorContext();

  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const cardsByColumn = useMemo(
    () =>
      Object.fromEntries(
        block.columns.map((column) => [
          column.id,
          block.cards.filter((card) => card.columnId === column.id),
        ]),
      ),
    [block.columns, block.cards],
  );

  function canRemoveColumn() {
    return block.columns.length > 1;
  }

  function toggleCard(cardId: string) {
    setExpandedCardId((current) => (current === cardId ? null : cardId));
  }

  function onCardDragStart(cardId: string, event: DragEvent<HTMLElement>) {
    setDraggingCardId(cardId);
    if (!event.dataTransfer) {
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-workspace-kanban-card", cardId);
    event.dataTransfer.setData("text/plain", cardId);
  }

  function clearDragState() {
    setDraggingCardId(null);
    setDragOverColumnId(null);
  }

  function onColumnDragOver(columnId: string, event: DragEvent<HTMLElement>) {
    if (!draggingCardId) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
    setDragOverColumnId(columnId);
  }

  function onColumnDragLeave(columnId: string, event: DragEvent<HTMLElement>) {
    const currentTarget = event.currentTarget;
    const nextTarget = event.relatedTarget;
    if (
      currentTarget instanceof HTMLElement &&
      nextTarget instanceof Node &&
      currentTarget.contains(nextTarget)
    ) {
      return;
    }
    if (dragOverColumnId === columnId) {
      setDragOverColumnId(null);
    }
  }

  function onColumnDrop(columnId: string, event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const cardId =
      draggingCardId || event.dataTransfer?.getData("application/x-workspace-kanban-card") || "";
    if (!cardId) {
      clearDragState();
      return;
    }
    moveKanbanCard(tabId, block.id, cardId, columnId);
    clearDragState();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-toned">
          {block.columns.length} columns · {block.cards.length} cards
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="rounded-full px-4"
          aria-label="Add kanban column"
          onClick={() => addKanbanColumn(tabId, block.id)}
        >
          <Plus />
          Add column
        </Button>
      </div>

      <div className="-mx-2 flex gap-4 overflow-x-auto px-2 pb-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {block.columns.map((column) => (
          <section
            key={column.id}
            className={cn(
              "flex min-w-[300px] max-w-[300px] flex-col rounded-surface border border-muted bg-background p-surface",
              dragOverColumnId === column.id ? "ring-2 ring-primary/20" : "",
            )}
            onDragOver={(event) => onColumnDragOver(column.id, event)}
            onDragLeave={(event) => onColumnDragLeave(column.id, event)}
            onDrop={(event) => onColumnDrop(column.id, event)}
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Input
                  value={column.title}
                  placeholder="Column title"
                  className="flex-1 border-0 bg-transparent px-0 text-sm font-semibold text-foreground placeholder:text-muted shadow-none focus-visible:ring-0"
                  onChange={(event) =>
                    mutateKanbanColumn(tabId, block.id, column.id, (entry) => {
                      entry.title = event.target.value.slice(0, 80);
                    })
                  }
                />
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold text-toned">
                  {cardsByColumn[column.id]?.length || 0}
                </span>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-lg text-toned hover:text-destructive/80"
                disabled={!canRemoveColumn()}
                aria-label={`Remove ${column.title || "kanban"} column`}
                onClick={() => removeKanbanColumn(tabId, block.id, column.id)}
              >
                <Trash2 />
              </Button>
            </div>

            <div className="flex-1 space-y-3">
              {(cardsByColumn[column.id] ?? []).map((card) => (
                <article
                  key={card.id}
                  draggable
                  className={cn(
                    "group relative flex flex-col rounded-surface border border-muted bg-background p-surface",
                    draggingCardId === card.id
                      ? "pointer-events-none opacity-40"
                      : "cursor-grab active:cursor-grabbing",
                    expandedCardId === card.id ? "ring-2 ring-primary/20" : "",
                  )}
                  onDragStart={(event) => onCardDragStart(card.id, event)}
                  onDragEnd={clearDragState}
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <Input
                        value={card.title}
                        placeholder="Task title..."
                        className="w-full border-0 bg-transparent px-0 py-0 text-sm leading-tight font-semibold text-foreground placeholder:text-muted shadow-none focus-visible:ring-0"
                        onChange={(event) =>
                          mutateKanbanCard(tabId, block.id, card.id, (entry) => {
                            entry.title = event.target.value.slice(0, 240);
                          })
                        }
                      />
                      {card.description && expandedCardId !== card.id ? (
                        <p className="mt-1.5 truncate text-[11px] leading-relaxed text-toned">
                          {card.description}
                        </p>
                      ) : null}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-lg text-toned hover:text-foreground"
                      aria-label={
                        expandedCardId === card.id ? "Collapse card details" : "Expand card details"
                      }
                      aria-expanded={expandedCardId === card.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleCard(card.id);
                      }}
                    >
                      {expandedCardId === card.id ? <ChevronUp /> : <Expand />}
                    </Button>
                  </div>

                  {expandedCardId === card.id ? (
                    <div className="mt-4 space-y-4 border-t border-muted pt-4">
                      <div className="space-y-1">
                        <label className="px-1 text-xs font-semibold text-muted-foreground">
                          Description
                        </label>
                        <Textarea
                          value={card.description}
                          placeholder="Details..."
                          className="w-full rounded-xl bg-background text-sm leading-relaxed text-toned"
                          rows={3}
                          onChange={(event) =>
                            mutateKanbanCard(tabId, block.id, card.id, (entry) => {
                              entry.description = event.target.value.slice(0, 4000);
                            })
                          }
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="px-1 text-xs font-semibold text-muted-foreground">
                            Assignee
                          </label>
                          <div className="relative">
                            <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              value={card.assignee}
                              className="rounded-xl pl-9"
                              onChange={(event) =>
                                mutateKanbanCard(tabId, block.id, card.id, (entry) => {
                                  entry.assignee = event.target.value.slice(0, 120);
                                })
                              }
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="px-1 text-xs font-semibold text-muted-foreground">
                            Due date
                          </label>
                          <AgencyDateField
                            value={card.dueDate ?? ""}
                            displayStyle="short"
                            className="h-8 rounded-xl"
                            aria-label="Due date"
                            onChange={(next) =>
                              mutateKanbanCard(tabId, block.id, card.id, (entry) => {
                                entry.dueDate = next || null;
                              })
                            }
                            onClear={() =>
                              mutateKanbanCard(tabId, block.id, card.id, (entry) => {
                                entry.dueDate = null;
                              })
                            }
                          />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="rounded-lg hover:text-destructive/80"
                          aria-label={`Remove ${card.title || "kanban"} card`}
                          onClick={() => removeKanbanCard(tabId, block.id, card.id)}
                        >
                          <Trash2 />
                          Remove
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="rounded-full px-4"
                          onClick={() => toggleCard(card.id)}
                        >
                          Collapse
                        </Button>
                      </div>
                    </div>
                  ) : card.assignee || card.dueDate ? (
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {card.assignee ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-toned">
                          <User className="size-3" />
                          <span>{card.assignee}</span>
                        </div>
                      ) : null}
                      {card.dueDate ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-toned">
                          <Calendar className="size-3" />
                          <span>{card.dueDate}</span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              ))}

              {(cardsByColumn[column.id] ?? []).length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No cards yet.</p>
              ) : null}

              <Button
                type="button"
                variant="ghost"
                className="w-full rounded-full border border-dashed border-muted py-3 text-sm font-semibold text-toned"
                aria-label={`Add card to ${column.title || "this"} column`}
                onClick={() => addKanbanCard(tabId, block.id, column.id)}
              >
                <Plus />
                Add task
              </Button>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
