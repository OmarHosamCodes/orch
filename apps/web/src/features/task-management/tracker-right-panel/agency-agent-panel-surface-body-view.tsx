import { Bot } from "lucide-react";

import { agencyEmptyPanelClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

export function AgencyAgentPanelSurfaceBodyView() {
  return (
    <div className={cn(agencyEmptyPanelClass, "h-full items-center justify-center gap-3 px-6")}>
      <Bot className="size-10 text-muted" strokeWidth={1.5} aria-hidden />
      <p className="text-center text-sm text-muted">Agent panel coming soon.</p>
    </div>
  );
}
