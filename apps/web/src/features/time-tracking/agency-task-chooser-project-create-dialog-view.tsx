import { AgencySearchSelect } from "@/features/shared/agency-search-select";
import {
  AgencyCompactDialog,
  AgencyCompactDialogBody,
  AgencyCompactDialogFooter,
  AgencyCompactDialogForm,
  AgencyCompactDialogHeader,
  AgencyCompactDialogMeta,
} from "@/features/shared/dialog-kit/agency-compact-dialog-shell";
import { AgencyIdentityField } from "@/features/shared/dialog-kit/agency-identity-field";
import { Button } from "@/ui/button";
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
    iconKey,
    setIconKey,
    templateId,
    setTemplateId,
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
    <AgencyCompactDialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      showCloseButton={!isPending}
    >
      <AgencyCompactDialogHeader title="Create project" />
      <AgencyCompactDialogForm id={formId} onSubmit={(event) => void handleSubmit(event)}>
        <AgencyCompactDialogBody>
          <AgencyIdentityField
            id={`${formId}-name`}
            value={projectName}
            onChange={setProjectName}
            placeholder="Project name"
            autoFocus
            disabled={isPending}
            iconKey={iconKey}
            onIconChange={setIconKey}
            colorHueId={colorHueId}
            onColorHueChange={setColorHueId}
            projectId="draft"
            aria-label="Project name"
          />

          <AgencyCompactDialogMeta>
            <AgencySearchSelect
              id={`${formId}-client`}
              value={clientId}
              onValueChange={setClientId}
              options={clientOptions}
              placeholder="Client"
              searchPlaceholder="Search clients…"
              disabled={clients.length === 0 || isPending}
              aria-label="Client"
              variant="chip"
            />
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
              variant="chip"
            />
          </AgencyCompactDialogMeta>
        </AgencyCompactDialogBody>
        <AgencyCompactDialogFooter>
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
        </AgencyCompactDialogFooter>
      </AgencyCompactDialogForm>
    </AgencyCompactDialog>
  );
}
