import { Button } from "@/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Input } from "@/ui/input";
import { AgencySearchSelect } from "@/features/shared/agency-search-select";
import {
  agencyFocusRingClass,
  agencyFormFieldClass,
  agencyFormLabelClass,
  agencyInputPlaceholderClass,
} from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import type { AgencyTaskChooserProjectCreateDialogViewModel } from "@/features/time-tracking/hooks/use-agency-task-chooser-project-create-dialog";

type AgencyTaskChooserProjectCreateDialogViewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewModel: AgencyTaskChooserProjectCreateDialogViewModel;
};

export function AgencyTaskChooserProjectCreateDialogView({
  open,
  onOpenChange,
  viewModel,
}: AgencyTaskChooserProjectCreateDialogViewProps) {
  const {
    formId,
    projectName,
    setProjectName,
    clientId,
    setClientId,
    colorHueId,
    setColorHueId,
    templateId,
    setTemplateId,
    palette,
    clients,
    templates,
    canSubmit,
    isPending,
    handleSubmit,
  } = viewModel;

  const clientOptions = clients.map((client) => ({
    value: client.id,
    label: client.name,
  }));

  const templateOptions = templates.map((template) => ({
    value: template.id,
    label: template.name,
    description:
      template.milestoneCount > 0
        ? `${template.milestoneCount} milestone${template.milestoneCount === 1 ? "" : "s"}`
        : undefined,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="space-y-1 border-b border-default px-5 py-4 text-left">
          <DialogTitle className="text-base font-bold text-highlighted">Create project</DialogTitle>
        </DialogHeader>

        <form id={formId} onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-4 px-5 py-4">
            <div className={agencyFormFieldClass}>
              <label htmlFor={`${formId}-name`} className={agencyFormLabelClass}>
                Project name
              </label>
              <Input
                id={`${formId}-name`}
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="Project name"
                autoFocus
                disabled={isPending}
                className={cn(
                  "h-9 rounded-xl border-default bg-default font-sans text-sm",
                  agencyInputPlaceholderClass,
                )}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className={agencyFormFieldClass}>
                <label htmlFor={`${formId}-client`} className={agencyFormLabelClass}>
                  Client
                </label>
                <AgencySearchSelect
                  id={`${formId}-client`}
                  value={clientId}
                  onValueChange={setClientId}
                  options={clientOptions}
                  placeholder="Select client"
                  searchPlaceholder="Search clients…"
                  disabled={clients.length === 0 || isPending}
                  aria-label="Client"
                />
              </div>

              <div className={agencyFormFieldClass}>
                <label htmlFor={`${formId}-template`} className={agencyFormLabelClass}>
                  Template
                </label>
                <AgencySearchSelect
                  id={`${formId}-template`}
                  value={templateId}
                  onValueChange={setTemplateId}
                  options={templateOptions}
                  emptyOption={{ value: "", label: "No template" }}
                  placeholder="No template"
                  searchPlaceholder="Search templates…"
                  disabled={isPending}
                  aria-label="Template"
                />
              </div>
            </div>

            <div className={agencyFormFieldClass}>
              <span id={`${formId}-color-label`} className={agencyFormLabelClass}>
                Color
              </span>
              <div
                className="grid grid-cols-6 gap-2 rounded-surface border border-default bg-default p-2.5 sm:grid-cols-12"
                role="radiogroup"
                aria-labelledby={`${formId}-color-label`}
              >
                {palette.map((hue) => (
                  <button
                    key={hue.id}
                    type="button"
                    role="radio"
                    aria-checked={colorHueId === hue.id}
                    aria-label={hue.label}
                    disabled={isPending}
                    className={cn(
                      "size-6 rounded-sm border border-transparent",
                      agencyFocusRingClass,
                      colorHueId === hue.id &&
                        "ring-2 ring-ring ring-offset-2 ring-offset-background",
                    )}
                    style={{ backgroundColor: hue.dark }}
                    onClick={() => setColorHueId(hue.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-default px-5 py-4 sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
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
