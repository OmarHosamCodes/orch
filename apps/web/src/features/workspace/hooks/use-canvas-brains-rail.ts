import { useLocation, useNavigate } from "@/lib/navigation";

import {
  canvasWorkspaceHref,
  canvasWorkspaceIdFromPath,
} from "@/features/workspace/canvas-workspace-path";
import {
  useCanvasBrainCreate,
  useCanvasBrainsList,
} from "@/features/workspace/hooks/use-canvas-brains";
import type { CanvasBrainsRailViewProps } from "@/features/workspace/canvas-brains-rail-view";

export function useCanvasBrainsRail(onNavigate?: () => void): CanvasBrainsRailViewProps {
  const location = useLocation();
  const navigate = useNavigate();
  const list = useCanvasBrainsList();
  const create = useCanvasBrainCreate((brain) => {
    onNavigate?.();
    void navigate(canvasWorkspaceHref(brain.id));
  });

  return {
    items: list.items,
    activeWorkspaceId: canvasWorkspaceIdFromPath(location.pathname),
    onNavigate,
    create,
  };
}
