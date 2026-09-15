import { CloudOff } from "lucide-react";
import { useState } from "react";

import { shellFocusRingClass, shellLabelClass } from "@/features/app-shell/app-shell-ui";
import { useAgencySyncDetails } from "@/features/shared/agency-sync";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";

type AgencySubtitleBreadcrumbProps = {
  teamId: string;
};

/** Agency sync failure control — only mounts when queries are in error. */
export function AgencySubtitleBreadcrumb({ teamId }: AgencySubtitleBreadcrumbProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const syncDetails = useAgencySyncDetails(teamId);

  if (!teamId || syncDetails.state !== "error") return null;

  return (
    <Popover open={detailsOpen} onOpenChange={setDetailsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-error transition-colors hover:bg-error/10",
            shellFocusRingClass,
          )}
          aria-label={`${syncDetails.label}. Show sync details`}
          aria-expanded={detailsOpen}
          title={syncDetails.label}
        >
          <CloudOff className="size-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" size="form" className="space-y-3 p-3">
        <div className="space-y-1">
          <p className={shellLabelClass}>Sync status</p>
          <p className="text-sm font-semibold text-highlighted">{syncDetails.label}</p>
          <p className="text-xs leading-relaxed text-muted">{syncDetails.description}</p>
        </div>

        {syncDetails.errors.length > 0 ? (
          <div className="space-y-2">
            <p className={shellLabelClass}>Failed sources</p>
            <ul className="space-y-2">
              {syncDetails.errors.map((error) => (
                <li key={`${error.label}-${error.message}`} className="border-t border-border py-2">
                  <p className="text-xs font-semibold text-highlighted">{error.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted break-words">
                    {error.message}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
