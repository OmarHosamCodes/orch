# Canvas Named Brains

Date: 2026-09-19
Status: Approved — Slice 1 implementation

## Feature summary

Each Canvas workspace is an owner-scoped second brain with its own board,
knowledge graph, and Orch thread. `/canvas` is the central nervous system
(CNS) home: a list of brains, not a merged mega-board. Orch unscoped can
read across every brain; Orch inside a brain is locked to that
`canvasWorkspaceId`. Agency stays the source of truth for operational
records. MCP, sub-agent delegate, embeddings, and team-shared whole brains
are later slices.

## Locked decisions

- First-class `canvas_workspace` rows. Isolation is a foreign key, not a
  folder filter.
- You own the brain. Individual cards may still be `visibility: team`.
  Sharing an entire brain is out of Slice 1.
- Snapshot for a brain is that workspace’s blob plus teammates’ team-visible
  nodes (sharing still works). The actor’s **other** brains are never merged
  onto this board.
- `/node/:id` and `/object/:id` stay globally unique. Lookup the parent
  workspace; do not put it in the URL.
- Conversations: `canvasWorkspaceId` null = CNS thread; set = that brain’s
  thread.
- Canvas/knowledge writes stay immediate; Agency writes stay on confirm.
- Default brain title after migrate: `Canvas`.
- Owner cap: 20 active (non-archived) brains. `WORKSPACE_NODE_LIMIT` stays
  per brain.
- IDs: `createWorkspaceId("cws")`.

## Architecture

```text
canvas_workspace (id, ownerUserId, title, instructions, settings, archivedAt)
  -> dashboard_workspace (workspaceId PK, ownerUserId, nodes jsonb)
  -> workspace_object / relation / placement (canvasWorkspaceId)
  -> dashboard_conversation (canvasWorkspaceId nullable)
```

- `/canvas` — CNS index. Orch unscoped.
- `/canvas/$workspaceId` — that brain’s React Flow board + knowledge overlay.
- Sidebar Canvas: nested list (CNS first, then brains) with the existing
  quiet thread line. Create via shadcn dialog.

## Agent contract (Slice 1)

Turn carries `canvasWorkspaceId: string | null`.

- Scoped: canvas get/save, knowledge query/get/board/capture, and apply
  tools fail closed unless the actor owns that workspace.
- CNS: `list_workspaces` + `query_knowledge` across owned brains. Every
  knowledge hit includes `canvasWorkspaceId` and workspace title so Orch
  can cite “in Client X…”.

## Non-goals (Slice 1)

MCP client, `delegate_to_workspace`, embeddings/RAG, team-shared whole
brains, dropping `dashboard_workspace.nodes`, object-first UX (backlinks
rail / table studio), Money on Canvas, Impeccable redesign of the infinite
board, Ask/Plan/Agent revival.

## Migration

Idempotent: for each user, ensure one `canvas_workspace` titled `Canvas`,
rekey the existing `dashboard_workspace` row onto that id, stamp existing
knowledge rows with that `canvasWorkspaceId`. Existing conversations stay
CNS (`canvasWorkspaceId` null) until the user opens a brain.
