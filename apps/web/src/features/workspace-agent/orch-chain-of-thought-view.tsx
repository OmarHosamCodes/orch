import {
  WorkspaceAgentThinkingActivityView,
  type WorkspaceAgentThinkingStep,
} from "@/features/workspace-agent/thinking-activity-view";

type OrchChainOfThoughtViewProps = {
  steps: WorkspaceAgentThinkingStep[];
  live: boolean;
};

export function OrchChainOfThoughtView({ steps, live }: OrchChainOfThoughtViewProps) {
  return <WorkspaceAgentThinkingActivityView steps={steps} live={live} />;
}
