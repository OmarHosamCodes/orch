import { useCanvasBrainsIndex } from "@/features/workspace/hooks/use-canvas-brains-index";
import { CanvasBrainsIndexView } from "@/features/workspace/canvas-brains-index-view";

export function CanvasBrainsIndexContainer() {
  const viewModel = useCanvasBrainsIndex();
  return <CanvasBrainsIndexView {...viewModel} />;
}
