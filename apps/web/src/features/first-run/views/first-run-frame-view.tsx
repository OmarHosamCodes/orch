import type { ReactNode } from "react";

import { LandingAgencyPreview } from "@/components/marketing/landing-agency-preview";
import { LandingAgentTrace } from "@/components/marketing/landing-agent-trace";
import { LandingWorkspaceVignette } from "@/components/marketing/landing-workspace-vignette";
import type { FirstRunPrimerFrame } from "@/features/first-run/first-run-copy";
import { cn } from "@/lib/utils";

type FirstRunFrameViewProps = {
  frame: FirstRunPrimerFrame;
  className?: string;
};

function PreviewStage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 items-center justify-center overflow-auto bg-background p-6 md:p-10",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FirstRunFrameView({ frame, className }: FirstRunFrameViewProps) {
  let still: ReactNode;
  switch (frame) {
    case "welcome":
    case "canvas":
      still = <LandingWorkspaceVignette className="h-full min-h-0 w-full rounded-none border-0" />;
      break;
    case "orch":
      still = (
        <PreviewStage>
          <LandingAgentTrace className="w-full max-w-3xl" />
        </PreviewStage>
      );
      break;
    case "agency":
      still = (
        <PreviewStage>
          <LandingAgencyPreview className="w-full max-w-5xl" />
        </PreviewStage>
      );
      break;
    default: {
      const exhaustive: never = frame;
      still = exhaustive;
    }
  }

  return (
    <div
      className={cn("pointer-events-none h-full min-h-0 overflow-hidden", className)}
      aria-hidden
    >
      {still}
    </div>
  );
}
