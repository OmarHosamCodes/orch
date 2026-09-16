import { useState, type ReactNode } from "react";
import { Settings, Users } from "lucide-react";

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

function GalleryCard({
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
    <section className="rounded-2xl border border-default bg-card p-4">
      <h2 className="text-sm font-semibold text-highlighted">{title}</h2>
      <p className="mt-0.5 font-mono text-[11px] break-all text-muted">{source}</p>
      <p className="mt-2 text-xs text-muted">
        Trigger: <span className="font-medium text-highlighted">{trigger}</span>
      </p>
      <Button type="button" size="sm" variant="secondary" className="mt-3" onClick={onOpen}>
        Open dialog
      </Button>
      {children}
    </section>
  );
}

function ProjectCreateEntry() {
  const [open, setOpen] = useState(false);
  const [projectName, setProjectName] = useState("Website refresh");
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
        clients={[{ id: "acme", name: "Acme Co" }]}
        viewModel={
          {
            formId: "dev-project-create",
            mode: "normal",
            setMode: () => {},
            clientId: "acme",
            setClientId: () => {},
            projectName,
            setProjectName,
            iconKey: "briefcase",
            setIconKey: () => {},
            milestones: [],
            formError: null,
            isJourneyMode: false,
            members: [],
            isMembersLoading: false,
            selectedClient: { id: "acme", name: "Acme Co" },
            clientLocked: true,
            updateMilestone: () => {},
            addMilestone: () => {},
            removeMilestone: () => {},
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
            iconKey: "check",
            setIconKey: () => {},
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
      title="Settings shell"
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
        visibility="private"
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
        onVisibilityChange={() => {}}
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
              kind: "one_time",
              kindOptions: [
                { id: "one_time", label: "One-time" },
                { id: "subscription", label: "Subscription" },
              ],
              name: "Notion",
              onNameChange: () => {},
              onKindChange: () => {},
              kindLocked: false,
              amount: "12",
              onAmountChange: () => {},
              currency: "USD",
              currencyOptions: ["USD", "EGP"],
              onCurrencyChange: () => {},
              amountPreview: null,
              fxOverride: null,
              note: "",
              onNoteChange: () => {},
              errors: {},
              isPending: false,
              mode: "create",
              submitLabel: "Add",
              onSubmit: (e: Event) => e.preventDefault(),
              occurredAt: "",
              onOccurredAtChange: () => {},
              occurredTime: "",
              onOccurredTimeChange: () => {},
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
      title="Bills confirm + adjust"
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
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <p className="text-[11px] font-bold tracking-[0.2em] text-muted uppercase">
        Development only
      </p>
      <h1 className="mt-2 text-2xl font-bold text-highlighted">Dialogs</h1>
      <p className="mt-2 max-w-prose text-sm text-muted">
        Every dialog with its production trigger. Sample props only — mutations are no-ops and
        close the dialog.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      </div>
    </main>
  );
}
