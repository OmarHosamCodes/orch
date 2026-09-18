import { forwardRef, lazy, Suspense } from "react";

import { SurfaceShimmer } from "@/ui/skeleton";
import type {
  InfiniteCanvasHandle,
  InfiniteCanvasProps,
} from "@/features/workspace/canvas/infinite-canvas";
export type { InfiniteCanvasHandle } from "@/features/workspace/canvas/infinite-canvas";

const InfiniteCanvasLazy = lazy(async () => {
  const module = await import("@/features/workspace/canvas/infinite-canvas");
  return { default: module.InfiniteCanvas };
});

export const LazyInfiniteCanvas = forwardRef<InfiniteCanvasHandle, InfiniteCanvasProps>(
  function LazyInfiniteCanvas(props, ref) {
    return (
      <Suspense fallback={<SurfaceShimmer className="h-full min-h-0" label="Opening canvas" />}>
        <InfiniteCanvasLazy {...props} ref={ref} />
      </Suspense>
    );
  },
);
