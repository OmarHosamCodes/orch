import { useCanvasBrainsRail } from "@/features/workspace/hooks/use-canvas-brains-rail";
import { CanvasBrainsRailView } from "@/features/workspace/canvas-brains-rail-view";

export function CanvasBrainsRailContainer({ onNavigate }: { onNavigate?: () => void }) {
  const viewModel = useCanvasBrainsRail(onNavigate);
  return <CanvasBrainsRailView {...viewModel} />;
}
