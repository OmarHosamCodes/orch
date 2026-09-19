import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { WorkspaceCollectedTask, WorkspaceNode, WorkspaceTask } from "@orch/workspace";

import { GalleryCard } from "@/pages/dev-dialogs-page";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import { useTeamStore } from "@/features/team/team-store";
import { teamDetailQueryOptions, teamListQueryOptions } from "@/features/team/team-queries";
import {
  useAgencyClientsQuery,
  useAgencyProjectsQuery,
  useAgencyProjectTemplatesQuery,
  useAgencyTimeEntriesQuery,
} from "@/features/shared/agency-queries";
import { useAgencyProjectTasksForChooserQuery } from "@/features/shared/agency-task-chooser-catalog";
import { toAgencyMemberOption } from "@/features/shared/agency-member-option";
import { AgencyProjectCreateDialog } from "@/features/projects/agency-project-create-dialog";
import { AgencyTaskCreateDialog } from "@/features/time-tracking/choosers/agency-task-create-dialog";
import { AgencyTaskChooserProjectCreateDialog } from "@/features/time-tracking/choosers/agency-task-chooser-project-create-dialog";
import { AgencyMyTasksEditDialog } from "@/features/task-management/my-tasks-rail/agency-my-tasks-edit-dialog";
import { AgencyTimeEntryLinksDialog } from "@/features/time-tracking/agency-time-entry-links-dialog";
import { AgencyReportEntryDetailsDialog } from "@/features/reports/agency-report-entry-details-dialog";
import type { AgencyReportEntry } from "@/features/reports/agency-report-grouping";
import { MemberProfileGaugeDetailDialog } from "@/features/member-profile/member-profile-gauge-detail-dialog";
import { useAgencyMemberProfile } from "@/features/member-profile/hooks/use-agency-member-profile";
import { TeamSettingsModal } from "@/features/team/team-settings-modal";
import { CanvasKnowledgeCreateDialog } from "@/features/workspace-knowledge/workspace-knowledge";
import { WorkspaceEditorModal } from "@/features/workspace/workspace-editor-modal";
import { WorkspaceOrchestratorSourcesModal } from "@/features/workspace/node/blocks/workspace-orchestrator-sources-modal";
import { canvasBrainsListQueryOptions } from "@/features/workspace/hooks/use-canvas-brains";
import { useWorkspaceQuery } from "@/features/workspace/hooks/use-workspace-query";
import { useWorkspaceKnowledgeStore } from "@/features/workspace-knowledge/stores/workspace-knowledge";
import { MoneySettingsDialog } from "@/features/money/agency-money-settings-dialog-view";
import { AgencyMoneyExpenseDialogs } from "@/features/money/agency-money-expense-dialogs-view";
import { AgencyMoneyBillsDialogs } from "@/features/money/agency-money-bills-dialogs-view";
import { useAgencyMoneySurface } from "@/features/money/hooks/use-agency-money-surface";
import {
  buildAgencyTimeEntryLinksUpdatePayload,
  useAgencyTimeTrackingStore,
} from "@/features/time-tracking/stores/agency-time-tracking";
import { Button } from "@/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";

function RealHint({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-xs text-muted">{children}</p>;
}

export function DevRealTeamControls({
  teamId,
  onTeamChange,
}: {
  teamId: string;
  onTeamChange: (teamId: string) => void;
}) {
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const teamsQuery = useQuery({ ...teamListQueryOptions(), enabled: Boolean(user) });
  const teams = useMemo(() => teamsQuery.data?.items ?? [], [teamsQuery.data?.items]);
  const syncSelectedTeam = useTeamStore((s) => s.syncSelectedTeam);

  useEffect(() => {
    syncSelectedTeam(teams);
  }, [teams, syncSelectedTeam]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-xs text-muted">
        Signed in as{" "}
        <span className="font-semibold text-highlighted">{user?.name || user?.email || "…"}</span>
      </p>
      <Select value={teamId} onValueChange={onTeamChange} disabled={teams.length === 0}>
        <SelectTrigger className="h-8 w-52 text-xs" aria-label="Team">
          <SelectValue placeholder="Select team" />
        </SelectTrigger>
        <SelectContent>
          {teams.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              {team.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

type RealData = {
  teamId: string;
  userId: string;
  clients: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string; clientId: string; clientName: string }>;
  tasks: Array<{ id: string; title: string; projectId: string }>;
  members: Array<{ userId: string; userName: string; userAvatar: string | null }>;
  templates: Array<{ id: string; name: string; milestoneCount: number }>;
  entries: AgencyReportEntry[];
  pending: boolean;
};

function useDevRealData(teamId: string, userId: string): RealData {
  const clientsQuery = useAgencyClientsQuery(teamId);
  const projectsQuery = useAgencyProjectsQuery(teamId);
  const tasksQuery = useAgencyProjectTasksForChooserQuery(teamId);
  const templatesQuery = useAgencyProjectTemplatesQuery(teamId);
  const entriesQuery = useAgencyTimeEntriesQuery(teamId, 1, 50);
  const membersQuery = useQuery({
    ...orpc.team.members.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });

  const clients = useMemo(
    () => (clientsQuery.data?.items ?? []).map((c) => ({ id: c.id, name: c.name })),
    [clientsQuery.data?.items],
  );
  const projects = useMemo(
    () =>
      (projectsQuery.data?.items ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        clientId: (p as { clientId?: string }).clientId ?? "",
        clientName: (p as { clientName?: string }).clientName ?? "",
      })),
    [projectsQuery.data?.items],
  );
  const tasks = useMemo(
    () =>
      (tasksQuery.items ?? []).map((t) => ({
        id: t.id,
        title: t.title,
        projectId: t.projectId,
      })),
    [tasksQuery.items],
  );
  const members = useMemo(
    () => (membersQuery.data?.items ?? []).map(toAgencyMemberOption),
    [membersQuery.data?.items],
  );
  const templates = useMemo(
    () =>
      (templatesQuery.data?.items ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        milestoneCount: t.milestoneCount,
      })),
    [templatesQuery.data?.items],
  );
  const entries = useMemo(
    () => (entriesQuery.data?.items ?? []) as unknown as AgencyReportEntry[],
    [entriesQuery.data?.items],
  );

  return {
    teamId,
    userId,
    clients,
    projects,
    tasks,
    members,
    templates,
    entries,
    pending:
      clientsQuery.isPending ||
      projectsQuery.isPending ||
      tasksQuery.isPending ||
      templatesQuery.isPending ||
      entriesQuery.isPending ||
      membersQuery.isPending,
  };
}

function RealProjectCreateEntry({ real }: { real: RealData }) {
  const [open, setOpen] = useState(false);
  return (
    <GalleryCard
      title="New project"
      source="features/projects/agency-project-create-dialog-view.tsx"
      trigger="Projects → New project button"
      onOpen={() => setOpen(true)}
    >
      <AgencyProjectCreateDialog
        open={open}
        onOpenChange={setOpen}
        teamId={real.teamId}
        clients={real.clients}
      />
    </GalleryCard>
  );
}

function RealTaskCreateEntry({ real }: { real: RealData }) {
  const [open, setOpen] = useState(false);
  const project = real.projects[0] ?? null;
  return (
    <GalleryCard
      title="Create task"
      source="features/time-tracking/agency-task-create-dialog-view.tsx"
      trigger="Task chooser → Create task"
      onOpen={() => setOpen(true)}
    >
      {project ? (
        <AgencyTaskCreateDialog
          open={open}
          onOpenChange={setOpen}
          teamId={real.teamId}
          projectId={project.id}
        />
      ) : (
        <RealHint>No projects in this team yet — create one in Tracker first.</RealHint>
      )}
    </GalleryCard>
  );
}

function RealChooserProjectCreateEntry({ real }: { real: RealData }) {
  const [open, setOpen] = useState(false);
  return (
    <GalleryCard
      title="Create project (chooser)"
      source="features/time-tracking/agency-task-chooser-project-create-dialog-view.tsx"
      trigger="Task chooser → New project"
      onOpen={() => setOpen(true)}
    >
      <AgencyTaskChooserProjectCreateDialog
        open={open}
        onOpenChange={setOpen}
        teamId={real.teamId}
        clients={real.clients}
        templates={real.templates}
      />
    </GalleryCard>
  );
}

function RealMyTasksEditEntry({ real }: { real: RealData }) {
  const [open, setOpen] = useState(false);
  const task = real.tasks[0] ?? null;
  const project = task ? real.projects.find((p) => p.id === task.projectId) : null;
  return (
    <GalleryCard
      title="Edit task"
      source="features/task-management/my-tasks-rail/agency-my-tasks-edit-dialog-view.tsx"
      trigger="My Tasks rail → task edit (pencil)"
      onOpen={() => setOpen(true)}
    >
      {task ? (
        <AgencyMyTasksEditDialog
          open={open}
          onOpenChange={setOpen}
          teamId={real.teamId}
          task={task as unknown as Parameters<typeof AgencyMyTasksEditDialog>[0]["task"]}
          projectLabel={project ? `${project.clientName} / ${project.name}`.trim() : "Your tasks"}
          members={real.members}
        />
      ) : (
        <RealHint>No open tasks in this team yet — create one in Tracker first.</RealHint>
      )}
    </GalleryCard>
  );
}

function RealEntryLinksEntry({ real }: { real: RealData }) {
  const [open, setOpen] = useState(false);
  const entry = real.entries[0] ?? null;
  return (
    <GalleryCard
      title="Entry links"
      source="features/time-tracking/agency-time-entry-links-dialog.tsx"
      trigger="Tracker entry row → link (hover/rail icon)"
      onOpen={() => setOpen(true)}
    >
      {entry ? (
        <AgencyTimeEntryLinksDialog
          open={open}
          onOpenChange={setOpen}
          links={(entry as { links?: Array<{ id: string; url: string }> }).links ?? []}
          onSave={async (urls) => {
            await useAgencyTimeTrackingStore
              .getState()
              .updateEntry(
                buildAgencyTimeEntryLinksUpdatePayload(entry as never, real.teamId, urls),
              );
          }}
        />
      ) : (
        <RealHint>No time entries yet — track some time in Tracker first.</RealHint>
      )}
    </GalleryCard>
  );
}

function RealReportDetailsEntry({ real }: { real: RealData }) {
  const [open, setOpen] = useState(false);
  const entries = real.entries.slice(0, 10);
  return (
    <GalleryCard
      title="Report entry details"
      source="features/reports/agency-report-entry-details-dialog-view.tsx"
      trigger="Reports → grouped xN row → details"
      onOpen={() => setOpen(true)}
    >
      {entries.length > 0 ? (
        <AgencyReportEntryDetailsDialog
          open={open}
          onOpenChange={setOpen}
          teamId={real.teamId}
          entries={entries}
          title="Your recent entries"
        />
      ) : (
        <RealHint>No time entries yet — track some time in Tracker first.</RealHint>
      )}
    </GalleryCard>
  );
}

function RealGaugeDetailEntry({ userId }: { userId: string }) {
  const profile = useAgencyMemberProfile(userId);
  return (
    <GalleryCard
      title="Gauge detail"
      source="features/member-profile/member-profile-gauge-detail-dialog.tsx"
      trigger="Member profile → stat plate click"
      onOpen={() => profile.openGauge("period")}
    >
      <MemberProfileGaugeDetailDialog
        detail={profile.gaugeDetail}
        onClose={profile.closeGauge}
        onPrimaryAction={profile.runGaugePrimaryAction}
        onFocusDay={profile.focusGaugeDay}
      />
    </GalleryCard>
  );
}

function RealSettingsEntry({ teamId }: { teamId: string }) {
  const [open, setOpen] = useState(false);
  const teamQuery = useQuery({
    ...teamDetailQueryOptions(teamId),
    enabled: Boolean(teamId),
  });
  return (
    <GalleryCard
      title="Settings"
      source="features/team/views/team-settings-modal-view.tsx"
      trigger="Sidebar team control → Settings"
      onOpen={() => setOpen(true)}
    >
      <TeamSettingsModal
        open={open}
        onOpenChange={setOpen}
        team={teamQuery.data ?? null}
        onRefetchWorkspace={async () => {
          await teamQuery.refetch();
        }}
      />
    </GalleryCard>
  );
}

function useDevCanvasWorkspaceId() {
  const brainsQuery = useQuery(canvasBrainsListQueryOptions());
  return brainsQuery.data?.items[0]?.id ?? "";
}

function RealKnowledgeCreateEntry({ real }: { real: RealData }) {
  const requestCreateKind = useWorkspaceKnowledgeStore((s) => s.requestCreateKind);
  const canvasWorkspaceId = useDevCanvasWorkspaceId();
  return (
    <GalleryCard
      title="Knowledge create"
      source="features/workspace-knowledge/canvas-knowledge-create-dialog-view.tsx"
      trigger="Canvas right-click → create knowledge"
      onOpen={() => requestCreateKind("note")}
    >
      <CanvasKnowledgeCreateDialog
        canvasWorkspaceId={canvasWorkspaceId}
        teamId={real.teamId}
        resolveBoardPoint={() => ({ x: 0, y: 0 })}
        onCreateDocument={() => {}}
      />
    </GalleryCard>
  );
}

function findWorkspaceTaskContainer(
  nodes: WorkspaceNode[],
  sourceNodeId: string,
  blockId: string,
): { tasks: WorkspaceTask[] } | null {
  const node = nodes.find((entry) => entry.id === sourceNodeId);
  if (!node) return null;
  for (const tab of node.tabs ?? []) {
    for (const block of tab.blocks ?? []) {
      if (block.id !== blockId) continue;
      if (block.type === "task-list" || block.type === "eisenhower-matrix") {
        return { tasks: block.tasks as WorkspaceTask[] };
      }
    }
  }
  return null;
}

function RealWorkspaceEntries() {
  const canvasWorkspaceId = useDevCanvasWorkspaceId();
  const ws = useWorkspaceQuery({ canvasWorkspaceId });
  const navigate = useNavigate();
  const [sourcesOpen, setSourcesOpen] = useState(false);

  useEffect(() => {
    void ws.preloadWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- preload once on mount
  }, []);

  const firstNode = ws.nodes[0] ?? null;
  const orchestrator = ws.nodes.find((node) => node.nodeType === "orchestrator") ?? null;

  const mutateTask = (item: WorkspaceCollectedTask, mutator: (task: WorkspaceTask) => void) => {
    ws.updateNodes((draft) => {
      const container = findWorkspaceTaskContainer(draft, item.sourceNodeId, item.blockId);
      const task = container?.tasks.find((entry) => entry.id === item.task.id);
      if (task) mutator(task);
    });
  };
  const removeTask = (item: WorkspaceCollectedTask) => {
    ws.updateNodes((draft) => {
      const container = findWorkspaceTaskContainer(draft, item.sourceNodeId, item.blockId);
      if (!container) return;
      const index = container.tasks.findIndex((entry) => entry.id === item.task.id);
      if (index >= 0) container.tasks.splice(index, 1);
    });
  };
  const addTask = (sourceNodeId: string) => {
    ws.updateNodes((draft) => {
      const node = draft.find((entry) => entry.id === sourceNodeId);
      const block = node?.tabs
        ?.flatMap((tab) => tab.blocks ?? [])
        .find((entry) => entry.type === "task-list" || entry.type === "eisenhower-matrix");
      if (!block || (block.type !== "task-list" && block.type !== "eisenhower-matrix")) return;
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `task-${Date.now()}`;
      (block.tasks as WorkspaceTask[]).push({
        id,
        text: "New task",
        completed: false,
        urgency: 5,
        importance: 5,
        estimateMinutes: 30,
      } as WorkspaceTask);
    });
  };

  return (
    <>
      <GalleryCard
        title="Node editor"
        source="features/workspace/workspace-editor-modal.tsx"
        trigger="Canvas node → Create/Edit node"
        onOpen={() => {
          if (firstNode) ws.openEditNode({ nodeId: firstNode.id });
        }}
      >
        {ws.isWorkspaceInitialLoading ? (
          <RealHint>Loading your workspace…</RealHint>
        ) : firstNode ? (
          <RealHint>Opens your node “{firstNode.title || "Untitled node"}” for editing.</RealHint>
        ) : (
          <RealHint>No canvas nodes yet — create one on the Canvas first.</RealHint>
        )}
        <WorkspaceEditorModal
          availableBlocks={ws.editorBlockOptions}
          content={ws.nodeDraft.content}
          featuredBlocks={ws.nodeDraft.featuredBlocks}
          mode={ws.editorMode}
          nodeType={ws.nodeDraft.nodeType}
          open={ws.editorOpen}
          tint={ws.nodeDraft.tint}
          title={ws.nodeDraft.title}
          valid={ws.isDraftValid}
          onClose={ws.closeEditor}
          onSubmit={ws.submitNodeEditor}
          onFeaturedBlocksChange={(featuredBlocks) => ws.patchNodeDraft({ featuredBlocks })}
          onContentChange={(content) => ws.patchNodeDraft({ content })}
          onNodeTypeChange={(nodeType) => ws.patchNodeDraft({ nodeType })}
          onTintChange={(tint) => ws.patchNodeDraft({ tint })}
          onTitleChange={(title) => ws.patchNodeDraft({ title })}
        />
      </GalleryCard>

      <GalleryCard
        title="Orchestrator sources"
        source="features/workspace/node/blocks/workspace-orchestrator-sources-modal.tsx"
        trigger="Orchestrator node → Manage sources"
        onOpen={() => setSourcesOpen(true)}
      >
        {orchestrator ? (
          <WorkspaceOrchestratorSourcesModal
            open={sourcesOpen}
            onOpenChange={setSourcesOpen}
            orchestratorNode={orchestrator}
            allNodes={ws.nodes}
            onConnect={(standardNodeId) =>
              ws.connectNodePair({
                orchestratorNodeId: orchestrator.id,
                standardNodeId,
              })
            }
            onDisconnect={(standardNodeId) =>
              ws.disconnectNodePair({
                orchestratorNodeId: orchestrator.id,
                standardNodeId,
              })
            }
            onMutateTask={mutateTask}
            onRemoveTask={removeTask}
            onAddTask={addTask}
            onNavigateToSource={(sourceNodeId) => {
              setSourcesOpen(false);
              void navigate({ to: "/node/$id", params: { id: sourceNodeId } });
            }}
          />
        ) : (
          <RealHint>
            {ws.isWorkspaceInitialLoading
              ? "Loading your workspace…"
              : "No orchestrator node in your workspace yet — create one on the Canvas first."}
          </RealHint>
        )}
      </GalleryCard>
    </>
  );
}

function RealMoneyEntries({ teamId }: { teamId: string }) {
  const money = useAgencyMoneySurface(teamId);

  const openBillsDialog = () => {
    const markable = money.bills.rows.find(
      (row): row is typeof row & { canMarkPaid: boolean } =>
        "canMarkPaid" in row && row.canMarkPaid === true,
    );
    if (markable) {
      money.bills.onMarkPaid(markable.id);
      return;
    }
    const payable = money.bills.rows.find(
      (row): row is typeof row & { canRecordPayment: boolean } =>
        "canRecordPayment" in row && row.canRecordPayment === true,
    );
    if (payable) {
      money.bills.onOpenPayment(payable.id);
      return;
    }
    money.bills.createMenu.onOpenInvoice();
  };

  return (
    <>
      <GalleryCard
        title="Money settings"
        source="features/money/agency-money-settings-dialog-view.tsx"
        trigger="Money → Settings (rules/currency/formulas)"
        onOpen={() => money.moneySettings.onOpenChange(true)}
      >
        <MoneySettingsDialog settings={money.moneySettings} />
      </GalleryCard>

      <GalleryCard
        title="Expense create"
        source="features/money/agency-money-expense-dialogs-view.tsx"
        trigger="Money → Bills → Expenses filter → Add expense"
        onOpen={() => money.bills.expensesPanel.onOpenCreate()}
      >
        <AgencyMoneyExpenseDialogs panel={money.bills.expensesPanel} />
      </GalleryCard>

      <GalleryCard
        title="Bills dialogs"
        source="features/money/agency-money-bills-dialogs-view.tsx"
        trigger="Money → bill row → Collect/Pay actions"
        onOpen={openBillsDialog}
      >
        <AgencyMoneyBillsDialogs bills={money.bills} />
        <RealHint>
          Opens mark-paid on your first outstanding bill, else record-payment, else create-invoice.
        </RealHint>
      </GalleryCard>
    </>
  );
}

export function DevRealGallery({ teamId, userId }: { teamId: string; userId: string }) {
  const real = useDevRealData(teamId, userId);

  return (
    <ul className="mt-4 list-none rounded-xl border border-default bg-card px-4 p-0">
      {real.pending ? <li className="py-3 text-xs text-muted">Loading your team data…</li> : null}
      <RealProjectCreateEntry real={real} />
      <RealTaskCreateEntry real={real} />
      <RealChooserProjectCreateEntry real={real} />
      <RealMyTasksEditEntry real={real} />
      <RealEntryLinksEntry real={real} />
      <RealReportDetailsEntry real={real} />
      <RealGaugeDetailEntry userId={userId} />
      <RealSettingsEntry teamId={teamId} />
      <RealKnowledgeCreateEntry real={real} />
      <RealWorkspaceEntries />
      <RealMoneyEntries teamId={teamId} />
    </ul>
  );
}

export function DevRealTeamPicker({
  teamId,
  onTeamChange,
}: {
  teamId: string;
  onTeamChange: (teamId: string) => void;
}) {
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  if (!user) {
    return <p className="text-xs text-muted">Sign in to load real data.</p>;
  }
  return <DevRealTeamControls teamId={teamId} onTeamChange={onTeamChange} />;
}

export function useDevRealUser() {
  const session = authClient.useSession();
  return session.data?.user ?? null;
}

export function useDevRealTeams() {
  const user = useDevRealUser();
  const teamsQuery = useQuery({ ...teamListQueryOptions(), enabled: Boolean(user) });
  const teams = useMemo(() => teamsQuery.data?.items ?? [], [teamsQuery.data?.items]);
  return { user, teams };
}

export function DevRealModeNotice() {
  return (
    <div className="mt-4 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-xs text-highlighted">
      Real data mode — dialogs read from your team and actions write for real (create, save,
      collect/pay). Sample mode is read-only mock data.
      <Button type="button" size="sm" variant="ghost" className="ml-2 h-7 px-2 text-xs" asChild>
        <a href="/agency/">Open Tracker</a>
      </Button>
    </div>
  );
}
