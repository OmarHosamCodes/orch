import { Plus, Trash2 } from "lucide-react";

import { AgencyMemberChooser } from "@/features/shared/choosers/agency-member-chooser";
import { AgencySearchSelect } from "@/features/shared/agency-search-select";
import { agencyInputPlaceholderClass, agencyLabelClass } from "@/features/shared/agency-ui";
import {
  AgencyCompactDialog,
  AgencyCompactDialogBody,
  AgencyCompactDialogFooter,
  AgencyCompactDialogForm,
  AgencyCompactDialogHeader,
  AgencyCompactDialogMeta,
} from "@/features/shared/dialog-kit/agency-compact-dialog-shell";
import { AgencyIdentityField } from "@/features/shared/dialog-kit/agency-identity-field";
import { AgencyKitReveal } from "@/features/shared/dialog-kit/agency-kit-reveal";
import { AgencyModeSegment } from "@/features/shared/dialog-kit/agency-mode-segment";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { cn } from "@/lib/utils";
import {
  type AgencyClientOption,
  type AgencyProjectCreateDialogViewModel,
  type ProjectCreateMode,
} from "./hooks/use-agency-project-create-dialog";

const CREATE_MODE_OPTIONS: Array<{ value: ProjectCreateMode; label: string }> = [
  { value: "normal", label: "Normal" },
  { value: "journey", label: "Journey" },
];

type AgencyProjectCreateDialogViewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: AgencyClientOption[];
  viewModel: AgencyProjectCreateDialogViewModel;
};

export function AgencyProjectCreateDialogView({
  open,
  onOpenChange,
  clients,
  viewModel,
}: AgencyProjectCreateDialogViewProps) {
  const {
    formId,
    mode,
    setMode,
    clientId,
    setClientId,
    projectName,
    setProjectName,
    iconKey,
    setIconKey,
    milestones,
    formError,
    isJourneyMode,
    members,
    isMembersLoading,
    selectedClient,
    clientLocked,
    updateMilestone,
    addMilestone,
    removeMilestone,
    handleSubmit,
    canSubmit,
    isProjectMutationPending,
  } = viewModel;

  return (
    <AgencyCompactDialog
      open={open}
      onOpenChange={onOpenChange}
      size={isJourneyMode ? "lg" : "sm"}
      showCloseButton={!isProjectMutationPending}
    >
      <AgencyCompactDialogHeader
        title="New project"
        description={
          isJourneyMode ? "Define milestones and assignees to seed the project journey." : undefined
        }
        badge={
          <AgencyModeSegment
            aria-label="Project type"
            value={mode}
            options={CREATE_MODE_OPTIONS}
            onChange={setMode}
            disabled={isProjectMutationPending}
          />
        }
      />
      <AgencyCompactDialogForm id={formId} onSubmit={(event) => void handleSubmit(event)}>
        <AgencyCompactDialogBody>
          <AgencyIdentityField
            id={`${formId}-name`}
            value={projectName}
            onChange={setProjectName}
            placeholder="Project name"
            autoFocus
            disabled={isProjectMutationPending}
            iconKey={iconKey}
            onIconChange={setIconKey}
            aria-label="Project name"
          />

          <AgencyCompactDialogMeta>
            {!clientLocked ? (
              <AgencySearchSelect
                id={`${formId}-client`}
                value={clientId}
                onValueChange={setClientId}
                options={clients.map((client) => ({ value: client.id, label: client.name }))}
                placeholder="Client"
                searchPlaceholder="Search clients…"
                disabled={clients.length === 0 || isProjectMutationPending}
                aria-label="Client"
                variant="chip"
              />
            ) : selectedClient ? (
              <span className="inline-flex h-8 max-w-full items-center rounded-full border border-default bg-elevated px-2.5 text-xs font-semibold text-highlighted">
                <span className="truncate">{selectedClient.name}</span>
              </span>
            ) : null}
          </AgencyCompactDialogMeta>

          <AgencyKitReveal open={isJourneyMode}>
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between gap-2">
                <p className={agencyLabelClass}>Milestones</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-full px-2.5 text-xs"
                  onClick={addMilestone}
                  disabled={isProjectMutationPending}
                >
                  <Plus className="size-3.5" />
                  Add milestone
                </Button>
              </div>

              <div className="space-y-2">
                {milestones.map((row, index) => (
                  <div
                    key={row.key}
                    className="rounded-2xl border border-default bg-elevated/60 p-2.5"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-muted">
                        Milestone {index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 rounded-full p-0 text-muted hover:text-error"
                        onClick={() => removeMilestone(row.key)}
                        disabled={milestones.length <= 1 || isProjectMutationPending}
                        aria-label={`Remove milestone ${index + 1}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <Input
                        value={row.title}
                        onChange={(e) => updateMilestone(row.key, { title: e.target.value })}
                        placeholder="Milestone title"
                        disabled={isProjectMutationPending}
                        className={cn(
                          "h-8 rounded-lg border-default bg-default text-xs",
                          agencyInputPlaceholderClass,
                        )}
                        aria-label={`Milestone ${index + 1} title`}
                      />
                      <AgencyMemberChooser
                        mode="multiple"
                        assignedToTeam={row.assignedToTeam}
                        selectedUserIds={row.assigneeUserIds}
                        onAssignedToTeamChange={(assignedToTeam) =>
                          updateMilestone(row.key, {
                            assignedToTeam,
                            assigneeUserIds: assignedToTeam ? [] : row.assigneeUserIds,
                          })
                        }
                        onSelectedUserIdsChange={(assigneeUserIds) =>
                          updateMilestone(row.key, {
                            assignedToTeam: false,
                            assigneeUserIds,
                          })
                        }
                        members={members}
                        loading={isMembersLoading}
                        disabled={isProjectMutationPending}
                        triggerVariant="stack"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {formError ? (
                <p className="text-xs font-semibold text-error" role="alert">
                  {formError}
                </p>
              ) : null}
            </div>
          </AgencyKitReveal>
        </AgencyCompactDialogBody>
        <AgencyCompactDialogFooter>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isProjectMutationPending}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={!canSubmit} form={formId}>
            Create project
          </Button>
        </AgencyCompactDialogFooter>
      </AgencyCompactDialogForm>
    </AgencyCompactDialog>
  );
}
