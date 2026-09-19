import { useCanvasKnowledgeCreate } from "@/features/workspace-knowledge/hooks/use-canvas-knowledge-create";
import { CanvasKnowledgeCreateDialogView } from "@/features/workspace-knowledge/canvas-knowledge-create-dialog-view";

type CanvasKnowledgeCreateDialogContainerProps = {
  canvasWorkspaceId: string;
  teamId?: string | null;
  resolveBoardPoint: () => { x: number; y: number } | null;
  onCreateDocument: (point?: { x: number; y: number }) => void;
};

export function CanvasKnowledgeCreateDialogContainer({
  canvasWorkspaceId,
  teamId,
  resolveBoardPoint,
  onCreateDocument,
}: CanvasKnowledgeCreateDialogContainerProps) {
  const view = useCanvasKnowledgeCreate({
    canvasWorkspaceId,
    teamId,
    resolveBoardPoint,
    onCreateDocument,
  });
  return <CanvasKnowledgeCreateDialogView {...view} />;
}
