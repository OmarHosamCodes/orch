import { useState, type ReactNode } from "react";
import { ArrowRight, Bell, Layers, Settings, Users } from "lucide-react";

import { AgencyProjectCreateDialogView } from "@/features/projects/agency-project-create-dialog-view";
import { AgencyTaskCreateDialogView } from "@/features/time-tracking/agency-task-create-dialog-view";
import { AgencyTaskChooserProjectCreateDialogView } from "@/features/time-tracking/agency-task-chooser-project-create-dialog-view";
import { AgencyMyTasksEditDialogView } from "@/features/task-management/my-tasks-rail/agency-my-tasks-edit-dialog-view";
import { AgencyTimeEntryLinksDialog } from "@/features/time-tracking/agency-time-entry-links-dialog";
import { AgencyReportEntryDetailsDialogView } from "@/features/reports/agency-report-entry-details-dialog-view";
import { MemberProfileGaugeDetailDialog } from "@/features/member-profile/member-profile-gauge-detail-dialog";
import { AgencySettingsDialogShell } from "@/features/shared/agency-settings-dialog-shell";
import { CanvasKnowledgeCreateDialogView } from "@/features/workspace-knowledge/canvas-knowledge-create-dialog-view";
import { WorkspaceEditorModal } from "@/features/workspace/workspace-editor-modal";
import { WorkspaceOrchestratorSourcesModal } from "@/features/workspace/node/blocks/workspace-orchestrator-sources-modal";
import { MoneySettingsDialog } from "@/features/money/agency-money-settings-dialog-view";
import { AgencyMoneyExpenseDialogs } from "@/features/money/agency-money-expense-dialogs-view";
import { AgencyMoneyBillsDialogs } from "@/features/money/agency-money-bills-dialogs-view";
import { Button } from "@/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/ui/tabs";
import { useTeamStore } from "@/features/team/team-store";
import {
  DevRealGallery,
  DevRealModeNotice,
  DevRealTeamPicker,
  useDevRealTeams,
} from "@/pages/dev-dialogs-real";
import { DialogInputsSection } from "@/pages/dev-dialogs-inputs";

export function GalleryCard({
  title,
  source,
  trigger,
  onOpen,
  children,
}: {
  title: string;
  source: string;
  trigger: string;
  onOpen: () => void;
  children: ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 border-b border-default py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-highlighted">{title}</h2>
        <p className="mt-0.5 text-xs text-muted">{trigger}</p>
        <p className="mt-0.5 truncate font-mono text-[11px] text-muted">{source}</p>
      </div>
      <Button type="button" size="sm" variant="secondary" onClick={onOpen}>
        Open
      </Button>
      {children}
    </li>
  );
}

function ProjectCreateEntry() {
  const [open, setOpen] = useState(false);
  const [projectName, setProjectName] = useState("Website refresh");
  const [mode, setMode] = useState<"normal" | "journey">("normal");
  const [clientId, setClientId] = useState("acme");
  const [iconKey, setIconKey] = useState<string | null>("briefcase");
  const [milestones, setMilestones] = useState([
    { key: "m1", title: "Kickoff", assignedToTeam: true, assigneeUserIds: [] as string[] },
  ]);
  const clients = [
    { id: "acme", name: "Acme Co" },
    { id: "north", name: "Northwind" },
  ];
  return (
    <GalleryCard
      title="New project"
      source="features/projects/agency-project-create-dialog-view.tsx"
      trigger="Projects → New project button"
      onOpen={() => setOpen(true)}
    >
      <AgencyProjectCreateDialogView
        open={open}
        onOpenChange={setOpen}
        clients={clients}
        viewModel={
          {
            formId: "dev-project-create",
            mode,
            setMode,
            clientId,
            setClientId,
            projectName,
            setProjectName,
            iconKey,
            setIconKey,
            milestones,
            formError: null,
            isJourneyMode: mode === "journey",
            members: [],
            isMembersLoading: false,
            selectedClient: clients.find((client) => client.id === clientId) ?? null,
            clientLocked: false,
            updateMilestone: (key: string, patch: Record<string, unknown>) => {
              setMilestones((rows) =>
                rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
              );
            },
            addMilestone: () => {
              setMilestones((rows) => [
                ...rows,
                {
                  key: `m${rows.length + 1}`,
                  title: "",
                  assignedToTeam: true,
                  assigneeUserIds: [],
                },
              ]);
            },
            removeMilestone: (key: string) => {
              setMilestones((rows) =>
                rows.length <= 1 ? rows : rows.filter((row) => row.key !== key),
              );
            },
            handleSubmit: (e: Event) => e.preventDefault(),
            canSubmit: true,
            isProjectMutationPending: false,
          } as any
        }
      />
    </GalleryCard>
  );
}

function TaskCreateEntry() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Design review");
  const [iconKey, setIconKey] = useState<string | null>("check");
  return (
    <GalleryCard
      title="Create task"
      source="features/time-tracking/agency-task-create-dialog-view.tsx"
      trigger="Task chooser → Create task"
      onOpen={() => setOpen(true)}
    >
      <AgencyTaskCreateDialogView
        open={open}
        onOpenChange={setOpen}
        viewModel={
          {
            formId: "dev-task-create",
            title,
            setTitle,
            iconKey,
            setIconKey,
            canSubmit: title.trim().length > 0,
            isPending: false,
            handleSubmit: (e: Event) => e.preventDefault(),
          } as any
        }
      />
    </GalleryCard>
  );
}

function ChooserProjectCreateEntry() {
  const [open, setOpen] = useState(false);
  const [projectName, setProjectName] = useState("New website");
  return (
    <GalleryCard
      title="Create project (chooser)"
      source="features/time-tracking/agency-task-chooser-project-create-dialog-view.tsx"
      trigger="Task chooser → New project"
      onOpen={() => setOpen(true)}
    >
      <AgencyTaskChooserProjectCreateDialogView
        open={open}
        onOpenChange={setOpen}
        viewModel={
          {
            formId: "dev-chooser-project",
            projectName,
            setProjectName,
            clientId: "",
            setClientId: () => {},
            colorHueId: "hue-1",
            setColorHueId: () => {},
            iconKey: "folder",
            setIconKey: () => {},
            templateId: "",
            setTemplateId: () => {},
            palette: [{ id: "hue-1", label: "Blue", dark: "#3b82f6" }],
            clients: [{ id: "acme", name: "Acme Co" }],
            templates: [],
            canSubmit: projectName.trim().length > 0,
            isPending: false,
            handleSubmit: (e: Event) => e.preventDefault(),
          } as any
        }
      />
    </GalleryCard>
  );
}

function MyTasksEditEntry() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Landing copy");
  return (
    <GalleryCard
      title="Edit task"
      source="features/task-management/my-tasks-rail/agency-my-tasks-edit-dialog-view.tsx"
      trigger="My Tasks rail → task edit (pencil)"
      onOpen={() => setOpen(true)}
    >
      <AgencyMyTasksEditDialogView
        open={open}
        onOpenChange={setOpen}
        canEditRecords
        viewModel={
          {
            formId: "dev-task-edit",
            projectLabel: "Acme Co / Website",
            members: [],
            title,
            setTitle,
            iconKey: "check",
            setIconKey: () => {},
            assignedToTeam: true,
            setAssignedToTeam: () => {},
            assigneeUserIds: [],
            setAssigneeUserIds: () => {},
            estimateMinutes: null,
            setEstimateMinutes: () => {},
            isOwner: false,
            billableRateDraft: "",
            setBillableRateDraft: () => {},
            billableRateCurrency: "USD",
            setBillableRateCurrency: () => {},
            parentRateAmount: null,
            parentRateCurrency: "USD",
            effectiveRateAmount: null,
            effectiveRateCurrency: "USD",
            agencyCurrency: "USD",
            ratePreviewAmount: null,
            canSubmit: title.trim().length > 0,
            pending: false,
            editError: null,
            handleSubmit: (e: Event) => e.preventDefault(),
            onCancel: () => setOpen(false),
          } as any
        }
      />
    </GalleryCard>
  );
}

function EntryLinksEntry() {
  const [open, setOpen] = useState(false);
  return (
    <GalleryCard
      title="Entry links"
      source="features/time-tracking/agency-time-entry-links-dialog.tsx"
      trigger="Tracker entry row → link (hover/rail icon)"
      onOpen={() => setOpen(true)}
    >
      <AgencyTimeEntryLinksDialog
        open={open}
        onOpenChange={setOpen}
        links={[]}
        onSave={() => setOpen(false)}
      />
    </GalleryCard>
  );
}

function ReportDetailsEntry() {
  const [open, setOpen] = useState(false);
  return (
    <GalleryCard
      title="Report entry details"
      source="features/reports/agency-report-entry-details-dialog-view.tsx"
      trigger="Reports → grouped xN row → details"
      onOpen={() => setOpen(true)}
    >
      <AgencyReportEntryDetailsDialogView
        open={open}
        onOpenChange={setOpen}
        viewModel={
          {
            title: "Website refresh — entries",
            description: "Sample empty state; live rows come from the report query.",
            entriesEmpty: true,
            onClose: () => setOpen(false),
          } as any
        }
        renderGroupRow={() => null as any}
      />
    </GalleryCard>
  );
}

function GaugeDetailEntry() {
  const [open, setOpen] = useState(false);
  return (
    <GalleryCard
      title="Gauge detail"
      source="features/member-profile/member-profile-gauge-detail-dialog.tsx"
      trigger="Member profile → stat plate click"
      onOpen={() => setOpen(true)}
    >
      <MemberProfileGaugeDetailDialog
        detail={
          open
            ? ({
                key: "period",
                title: "Period hours",
                metric: "42:10:00",
                shortLabel: "This month",
                explain: "Sample detail model for the dev gallery.",
                ratio: 0.7,
                tone: "constructive",
                streakSegments: [],
                stats: [
                  { label: "Logged", value: "42h" },
                  { label: "Target", value: "60h" },
                ],
                weekBarRatios: [0.4, 0.7, 0.9],
                rowsHeading: null,
                rows: [],
                emptyLabel: "No rows in the sample.",
                rowOverflowLabel: null,
                monthPaceVisual: null,
                streakVisual: null,
                primaryAction: null,
              } as any)
            : null
        }
        onClose={() => setOpen(false)}
        onPrimaryAction={() => setOpen(false)}
      />
    </GalleryCard>
  );
}

function SettingsShellEntry() {
  const [open, setOpen] = useState(false);
  const [pane, setPane] = useState<"general" | "members">("general");
  return (
    <GalleryCard
      title="Settings"
      source="features/shared/agency-settings-dialog-shell.tsx"
      trigger="Team settings / User settings gear"
      onOpen={() => setOpen(true)}
    >
      <AgencySettingsDialogShell
        open={open}
        onOpenChange={setOpen}
        title="Settings"
        description="Shared settings chrome"
        pane={pane}
        onPaneChange={setPane}
        navItems={[
          { id: "general", label: "General", icon: Settings },
          { id: "members", label: "Members", icon: Users },
        ]}
        paneTitle={pane === "general" ? "General" : "Members"}
      >
        <p className="mt-2 text-sm text-muted">
          Sample pane content. Real panes render team / user settings forms here.
        </p>
      </AgencySettingsDialogShell>
    </GalleryCard>
  );
}

function KnowledgeCreateEntry() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Sample card");
  const [visibility, setVisibility] = useState<"private" | "team">("private");
  return (
    <GalleryCard
      title="Knowledge create"
      source="features/workspace-knowledge/canvas-knowledge-create-dialog-view.tsx"
      trigger="Canvas right-click → create knowledge"
      onOpen={() => setOpen(true)}
    >
      <CanvasKnowledgeCreateDialogView
        open={open}
        surface="note"
        title={title}
        visibility={visibility}
        teamSelected
        status="open"
        recommendation=""
        sourceUrl=""
        pinKind="agency.project"
        pinQuery=""
        pinOptions={[]}
        selectedPinId={null}
        aboutOptions={[]}
        aboutId={null}
        unplaced={[]}
        pending={false}
        error={null}
        pendingLabel={null}
        canUploadSource={false}
        onOpenChange={setOpen}
        onTitleChange={setTitle}
        onVisibilityChange={setVisibility}
        onStatusChange={() => {}}
        onRecommendationChange={() => {}}
        onSourceUrlChange={() => {}}
        onSourceFileChange={() => {}}
        onPinKindChange={() => {}}
        onPinQueryChange={() => {}}
        onSelectPin={() => {}}
        onAboutIdChange={() => {}}
        onPlaceUnplaced={() => {}}
        onRemoveUnplaced={() => {}}
        onSubmit={() => setOpen(false)}
      />
    </GalleryCard>
  );
}

function NodeEditorEntry() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Strategy lane");
  const [content, setContent] = useState("Sample summary");
  return (
    <GalleryCard
      title="Node editor"
      source="features/workspace/workspace-editor-modal.tsx"
      trigger="Canvas node → Create/Edit node"
      onOpen={() => setOpen(true)}
    >
      <WorkspaceEditorModal
        availableBlocks={[]}
        content={content}
        featuredBlocks={[]}
        mode="create"
        nodeType="standard"
        open={open}
        tint="neutral"
        title={title}
        valid={title.trim().length > 0}
        onClose={() => setOpen(false)}
        onSubmit={() => setOpen(false)}
        onFeaturedBlocksChange={() => {}}
        onContentChange={setContent}
        onNodeTypeChange={() => {}}
        onTintChange={() => {}}
        onTitleChange={setTitle}
      />
    </GalleryCard>
  );
}

function OrchestratorSourcesEntry() {
  const [open, setOpen] = useState(false);
  const node = {
    id: "orch-1",
    title: "Orchestrator",
    nodeType: "orchestrator",
    connections: [],
    tabs: [],
  } as any;
  return (
    <GalleryCard
      title="Orchestrator sources"
      source="features/workspace/node/blocks/workspace-orchestrator-sources-modal.tsx"
      trigger="Orchestrator node → Manage sources"
      onOpen={() => setOpen(true)}
    >
      <WorkspaceOrchestratorSourcesModal
        open={open}
        onOpenChange={setOpen}
        orchestratorNode={node}
        allNodes={[node]}
        onConnect={() => {}}
        onDisconnect={() => {}}
        onMutateTask={() => {}}
        onRemoveTask={() => {}}
        onAddTask={() => {}}
        onNavigateToSource={() => {}}
      />
    </GalleryCard>
  );
}

function MoneySettingsEntry() {
  const [open, setOpen] = useState(false);
  return (
    <GalleryCard
      title="Money settings"
      source="features/money/agency-money-settings-dialog-view.tsx"
      trigger="Money → Settings (rules/currency/formulas)"
      onOpen={() => setOpen(true)}
    >
      <MoneySettingsDialog
        settings={
          {
            open,
            onOpenChange: setOpen,
            title: "Money settings",
            description: "Sample settings state",
            pane: "rules",
            paneOptions: [
              { id: "rules", label: "Rules", description: "Who qualifies" },
              { id: "currency", label: "Currency", description: "Agency currency + FX" },
              { id: "formulas", label: "Formulas", description: "Chip formulas" },
            ],
            editor: null,
            status: "ready",
            rules: [],
            formulas: [],
            currency: { code: "USD" },
            memberOptions: [],
            ruleOptions: [],
            onPaneChange: () => {},
            onAddCustomRule: () => {},
            onAddCustomFormula: () => {},
            onSelect: () => {},
            onEditorChange: () => {},
            onEditorCancel: () => {},
            onEditorSave: () => {},
            canSaveEditor: false,
            isSaving: false,
            canEdit: true,
            onRetry: () => {},
          } as any
        }
      />
    </GalleryCard>
  );
}

function ExpenseDialogsEntry() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"one_time" | "subscription">("one_time");
  const [name, setName] = useState("Notion");
  const [amount, setAmount] = useState("12");
  const [currency, setCurrency] = useState("USD");
  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [occurredTime, setOccurredTime] = useState("");
  const [amountMode, setAmountMode] = useState<"fixed" | "variable">("fixed");
  const [period, setPeriod] = useState("monthly");
  const [startsAt, setStartsAt] = useState("");
  return (
    <GalleryCard
      title="Expense create"
      source="features/money/agency-money-expense-dialogs-view.tsx"
      trigger="Money → Bills → Expenses filter → Add expense"
      onOpen={() => setOpen(true)}
    >
      <AgencyMoneyExpenseDialogs
        panel={
          {
            create: {
              open,
              onOpenChange: setOpen,
              formId: "dev-expense",
              title: "Add expense",
              kind,
              kindOptions: [
                { id: "one_time", label: "One-time" },
                { id: "subscription", label: "Subscription" },
              ],
              name,
              onNameChange: setName,
              onKindChange: setKind,
              kindLocked: false,
              amount,
              onAmountChange: setAmount,
              currency,
              currencyOptions: ["USD", "EGP"],
              onCurrencyChange: setCurrency,
              amountPreview: currency === "USD" ? "≈ EGP 580.00" : null,
              fxOverride: null,
              note,
              onNoteChange: setNote,
              errors: {},
              isPending: false,
              mode: "create",
              submitLabel: "Add",
              onSubmit: (e: Event) => e.preventDefault(),
              occurredAt,
              onOccurredAtChange: setOccurredAt,
              occurredTime,
              onOccurredTimeChange: setOccurredTime,
              amountMode,
              amountModeOptions: [
                { id: "fixed", label: "Fixed" },
                { id: "variable", label: "Variable" },
              ],
              onAmountModeChange: setAmountMode,
              period,
              periodOptions: [
                { id: "weekly", label: "Weekly" },
                { id: "monthly", label: "Monthly" },
              ],
              onPeriodChange: setPeriod,
              startsAt,
              onStartsAtChange: setStartsAt,
            },
            payment: {
              open: false,
              onOpenChange: () => {},
              formId: "dev-expense-payment",
              onSubmit: (e: Event) => e.preventDefault(),
              kind: "one_time",
              name: "Notion",
              heroLabel: "Amount due",
              heroValue: "EGP 12.00",
              heroHint: null,
              currency: "USD",
              amount: "",
              onAmountChange: () => {},
              validationMessage: null,
              isPending: false,
            },
          } as any
        }
      />
    </GalleryCard>
  );
}

function BillsConfirmEntry() {
  const [open, setOpen] = useState(false);
  const noop = () => {};
  // Closed dialogs still render on the server, so every sub-dialog needs a
  // complete shape even when shut.
  const closedConfirm = {
    open: false,
    onOpenChange: noop,
    amountLabel: "",
    partyName: "",
    isPending: false,
    onConfirm: noop,
  } as any;
  const closed = { open: false, onOpenChange: noop } as any;
  return (
    <GalleryCard
      title="Bills dialogs"
      source="features/money/agency-money-bills-dialogs-view.tsx"
      trigger="Money → bill row → Collect/Pay actions"
      onOpen={() => setOpen(true)}
    >
      <AgencyMoneyBillsDialogs
        bills={
          {
            isMutationPending: false,
            create: {
              ...closed,
              formId: "dev-bill-create",
              onSubmit: (e: Event) => e.preventDefault(),
              clientId: "",
              clients: [],
              onClientIdChange: noop,
              errors: {},
              periodStart: "",
              periodEnd: "",
              onPeriodStartChange: noop,
              onPeriodEndChange: noop,
              isPending: false,
            },
            adjustmentCreate: {
              ...closed,
              formId: "dev-adjustment-create",
              onSubmit: (e: Event) => e.preventDefault(),
              isSalaryPool: false,
              sectionKey: "extra",
              sectionOptions: [{ id: "extra", label: "Extra" }],
              onSectionKeyChange: noop,
              label: "",
              onLabelChange: noop,
              amount: "",
              onAmountChange: noop,
              errors: {},
              isPending: false,
            },
            payment: {
              ...closed,
              formId: "dev-bill-payment",
              onSubmit: (e: Event) => e.preventDefault(),
              partyName: "",
              referenceLabel: "",
              remainingLabel: "",
              currency: "USD",
              amount: "",
              onAmountChange: noop,
              validationMessage: null,
            },
            dismissConfirm: closedConfirm,
            preview: {
              ...closed,
              title: "",
              partyTitle: "",
              lines: [],
              allSelected: false,
              onSelectAllObligations: noop,
              onToggleObligationSelect: noop,
              exportMode: "combine",
              onExportModeChange: noop,
              documentKind: "invoice",
              periodLabel: "",
              documentLines: [],
              hoursLabel: "",
              dueLabel: "",
              onClose: noop,
              canExport: false,
              onExport: noop,
            },
            adjust: {
              ...closed,
              partyTitle: "",
              partyType: "client",
              statusLabel: "",
              lineSubtitle: "",
              isReady: false,
              obligationOptions: [],
              obligationId: "",
              onObligationIdChange: noop,
              tab: "pay",
              onTabChange: noop,
              remainingLabel: "",
              currency: "USD",
              amount: "",
              onAmountChange: noop,
              amountError: null,
              canRefund: false,
              kind: "discount",
              onKindChange: noop,
              note: "",
              onNoteChange: noop,
              isPending: false,
              onSubmit: noop,
            },
            markPaidConfirm: {
              open,
              onOpenChange: setOpen,
              amountLabel: "EGP 1,200.00",
              partyName: "Acme Co",
              isPending: false,
              onConfirm: () => setOpen(false),
            },
          } as any
        }
      />
    </GalleryCard>
  );
}

export function DevDialogsPage() {
  const [mode, setMode] = useState<"sample" | "real">("sample");
  const { user, teams } = useDevRealTeams();
  const selectedTeamId = useTeamStore((s) => s.selectedTeamId);
  const setSelectedTeamId = useTeamStore((s) => s.setSelectedTeamId);
  const teamId = selectedTeamId || teams[0]?.id || "";

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-default pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary uppercase">
              DEV BENCHMARK
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-highlighted">Dialogs</h1>
          </div>
          <p className="mt-2 max-w-prose text-sm text-muted">
            Shared smart inputs, then every production dialog. Sample mode uses mock props; real-data
            mode reads your team. Payloads stay the same.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="default" size="sm" className="h-8 text-xs" asChild>
            <a href="/dev/dialogs">
              <Layers className="mr-1.5 size-3.5" />
              Dialogs
            </a>
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
            <a href="/dev/notifications">
              <Bell className="mr-1.5 size-3.5" />
              Notifications
            </a>
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
            <a href="/agency">
              Tracker
              <ArrowRight className="ml-1.5 size-3.5" />
            </a>
          </Button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Tabs value={mode} onValueChange={(value) => setMode(value as "sample" | "real")}>
          <TabsList>
            <TabsTrigger value="sample">Sample</TabsTrigger>
            <TabsTrigger value="real">Real data</TabsTrigger>
          </TabsList>
        </Tabs>
        {mode === "real" ? (
          <DevRealTeamPicker teamId={teamId} onTeamChange={setSelectedTeamId} />
        ) : null}
      </div>

      {mode === "real" ? <DevRealModeNotice /> : null}

      <DialogInputsSection />

      <section className="mt-10" aria-label="Dialogs">
        <h2 className="text-lg font-semibold text-highlighted">Production dialogs</h2>
        <p className="mt-1 max-w-prose text-sm text-muted">
          Compact creates are hero plus chips. Settings, gauges, node editor, and orchestrator keep
          their topologies; in-pane pickers use the kit.
        </p>
        {mode === "sample" ? <SampleGallery /> : null}
        {mode === "real" && user && teamId ? (
          <DevRealGallery teamId={teamId} userId={user.id} />
        ) : null}
        {mode === "real" && (!user || !teamId) ? (
          <p className="mt-6 text-sm text-muted">
            {!user ? "Sign in to load real data." : "No teams yet — create one first."}
          </p>
        ) : null}
      </section>
    </main>
  );
}

function SampleGallery() {
  return (
    <ul className="mt-4 list-none rounded-xl border border-default bg-card px-4 p-0">
      <ProjectCreateEntry />
      <TaskCreateEntry />
      <ChooserProjectCreateEntry />
      <MyTasksEditEntry />
      <EntryLinksEntry />
      <ReportDetailsEntry />
      <GaugeDetailEntry />
      <SettingsShellEntry />
      <KnowledgeCreateEntry />
      <NodeEditorEntry />
      <OrchestratorSourcesEntry />
      <MoneySettingsEntry />
      <ExpenseDialogsEntry />
      <BillsConfirmEntry />
    </ul>
  );
}
