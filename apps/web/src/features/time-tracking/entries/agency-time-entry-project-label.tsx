import { AgencyEntityMark } from "@/features/shared/agency-entity-mark";
import { agencyWorkMetaClass } from "@/features/shared/agency-ui";
import { projectHueStyle } from "@/features/shared/project-palette";
import { cn } from "@/lib/utils";

type AgencyTimeEntryProjectLabelProps = {
  projectId: string;
  projectName: string;
  clientName?: string;
  taskTitle?: string;
  colorHueId?: number | null;
  taskIconKey?: string | null;
  projectIconKey?: string | null;
  format?: "project-client" | "task-project" | "task-client";
  className?: string;
};

export function AgencyTimeEntryProjectLabel({
  projectId,
  projectName,
  clientName,
  taskTitle,
  colorHueId,
  taskIconKey,
  projectIconKey,
  format = "project-client",
  className,
}: AgencyTimeEntryProjectLabelProps) {
  const projectStyle = projectHueStyle(projectId, colorHueId);
  const boundTaskTitle = taskTitle?.trim() || null;
  const markName =
    (format === "task-client" || format === "task-project") && boundTaskTitle
      ? boundTaskTitle
      : projectName;
  const markIconKey =
    (format === "task-client" || format === "task-project") && boundTaskTitle
      ? (taskIconKey ?? null)
      : (projectIconKey ?? null);

  if (format === "task-client") {
    if (!boundTaskTitle) {
      // Project-only entry: show project · client instead of a misleading "Task" placeholder.
      return (
        <span
          className={cn(
            "inline-flex min-w-0 items-center gap-1 truncate",
            agencyWorkMetaClass,
            className,
          )}
        >
          <AgencyEntityMark
            name={projectName}
            projectId={projectId}
            iconKey={projectIconKey}
            colorHueId={colorHueId}
          />
          <span
            className="truncate font-medium text-[var(--project-hue)] dark:text-[var(--project-hue-dark)]"
            style={projectStyle}
          >
            {projectName}
          </span>
          <span className="truncate">- {clientName || "General"}</span>
        </span>
      );
    }

    return (
      <span
        className={cn(
          "inline-flex min-w-0 items-center gap-1 truncate",
          agencyWorkMetaClass,
          className,
        )}
      >
        <AgencyEntityMark
          name={markName}
          projectId={projectId}
          iconKey={markIconKey}
          colorHueId={colorHueId}
        />
        <span
          className="truncate font-medium text-[var(--project-hue)] dark:text-[var(--project-hue-dark)]"
          style={projectStyle}
        >
          {boundTaskTitle}
        </span>
        <span className="truncate">- {clientName || "General"}</span>
      </span>
    );
  }

  if (format === "task-project") {
    return (
      <span
        className={cn(
          "inline-flex min-w-0 items-center gap-1 truncate",
          agencyWorkMetaClass,
          className,
        )}
      >
        <AgencyEntityMark
          name={markName}
          projectId={projectId}
          iconKey={markIconKey}
          colorHueId={colorHueId}
        />
        <span
          className="truncate font-medium text-[var(--project-hue)] dark:text-[var(--project-hue-dark)]"
          style={projectStyle}
        >
          {taskTitle ?? projectName}
        </span>
        <span className="truncate">- {projectName}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-1 truncate",
        agencyWorkMetaClass,
        className,
      )}
    >
      <AgencyEntityMark
        name={projectName}
        projectId={projectId}
        iconKey={projectIconKey}
        colorHueId={colorHueId}
      />
      <span
        className="truncate font-medium text-[var(--project-hue)] dark:text-[var(--project-hue-dark)]"
        style={projectStyle}
      >
        {projectName}
      </span>
      <span className="truncate">- {clientName}</span>
    </span>
  );
}
