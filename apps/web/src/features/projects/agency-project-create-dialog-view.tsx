import { Plus, Trash2 } from "lucide-react";

import { AgencyEntityIconPickerView } from "@/features/shared/agency-entity-icon-picker-view";
import { AgencyMemberChooser } from "@/features/shared/choosers/agency-member-chooser";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Input } from "@/ui/input";
import {
  agencyFormFieldClass,
  agencyFormLabelClass,
  agencyInputPlaceholderClass,
  agencyLabelClass,
} from "@/features/shared/agency-ui";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,44rem)] gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="space-y-1 border-b border-default px-5 py-4 text-left">
          <DialogTitle className="text-base font-bold text-highlighted">New project</DialogTitle>
          <DialogDescription className="text-xs text-muted">
            {isJourneyMode
              ? "Define milestones and assignees to seed the project journey."
              : "Create a simple project with client and name."}
          </DialogDescription>
        </DialogHeader>

        <form
          id={formId}
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => void handleSubmit(e)}
        >
          <div className="space-y-4 overflow-y-auto px-5 py-4">
            <div className="inline-flex rounded-full border border-default bg-elevated p-1">
              {CREATE_MODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    "rounded-full px-3 py-1 text-[11px] font-bold transition-colors",
                    mode === option.value
                      ? "bg-default text-highlighted"
                      : "text-muted hover:text-highlighted",
                  )}
                  aria-pressed={mode === option.value}
                  disabled={isProjectMutationPending}
                  onClick={() => {
                    setMode(option.value);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {!clientLocked ? (
                <div className={agencyFormFieldClass}>
                  <label htmlFor={`${formId}-client`} className={agencyFormLabelClass}>
                    Client
                  </label>
                  <select
                    id={`${formId}-client`}
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="h-9 w-full rounded-xl border border-default bg-background px-2.5 text-sm"
                    disabled={clients.length === 0 || isProjectMutationPending}
                  >
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : selectedClient ? (
                <div className={agencyFormFieldClass}>
                  <span className={agencyFormLabelClass}>Client</span>
                  <p className="truncate text-sm font-semibold text-highlighted">
                    {selectedClient.name}
                  </p>
                </div>
              ) : null}

              <div className={cn(agencyFormFieldClass, clientLocked ? "sm:col-span-2" : "")}>
                <label htmlFor={`${formId}-name`} className={agencyFormLabelClass}>
                  Project name
                </label>
                <Input
                  id={`${formId}-name`}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Project name"
                  autoFocus
                  disabled={isProjectMutationPending}
                  className={cn(
                    "h-9 rounded-xl border-default bg-default text-sm",
                    agencyInputPlaceholderClass,
                  )}
                />
              </div>
            </div>

            <div className={agencyFormFieldClass}>
              <span id={`${formId}-icon-label`} className={agencyFormLabelClass}>
                Icon
              </span>
              <AgencyEntityIconPickerView
                name={projectName}
                value={iconKey}
                onChange={setIconKey}
                disabled={isProjectMutationPending}
                labelledBy={`${formId}-icon-label`}
              />
            </div>

            {isJourneyMode ? (
              <div className="space-y-2">
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

                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_11rem]">
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
            ) : null}
          </div>

          <DialogFooter className="border-t border-default px-5 py-4 sm:justify-end">
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
