import { useCanvasKnowledgeCreateMenu } from "@/features/workspace-knowledge/hooks/use-canvas-knowledge-create-menu";
import { CanvasKnowledgeCreateMenuView } from "@/features/workspace-knowledge/canvas-knowledge-create-menu-view";

type CanvasKnowledgeCreateMenuContainerProps = {
  canvasWorkspaceId: string;
  teamId?: string | null;
  onCreateDocument: (point: { x: number; y: number }) => void;
};

export function CanvasKnowledgeCreateMenuContainer({
  canvasWorkspaceId,
  teamId,
  onCreateDocument,
}: CanvasKnowledgeCreateMenuContainerProps) {
  const view = useCanvasKnowledgeCreateMenu({ canvasWorkspaceId, teamId, onCreateDocument });
  return <CanvasKnowledgeCreateMenuView {...view} />;
}
