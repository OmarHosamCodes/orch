import { cn } from "@/lib/utils";

const surfaceShimmerSweepClass =
  "shimmer shimmer-bg pointer-events-none absolute inset-0 rounded-[inherit] bg-muted/50 text-foreground motion-reduce:animate-none";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "shimmer shimmer-bg rounded-2xl bg-muted text-foreground motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}

function SkeletonGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("shimmer-container", className)} {...props} />;
}

type SurfaceShimmerProps = React.ComponentProps<"div"> & {
  label?: string;
  overlay?: boolean;
};

function SurfaceShimmer({
  className,
  label = "Loading",
  overlay = false,
  ...props
}: SurfaceShimmerProps) {
  return (
    <div
      data-slot="surface-shimmer"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      className={cn(
        "overflow-hidden",
        overlay
          ? "pointer-events-none absolute inset-0 z-10 rounded-[inherit]"
          : "relative min-h-64 w-full min-w-0 flex-1 rounded-surface bg-muted/40",
        className,
      )}
      {...props}
    >
      <div className={surfaceShimmerSweepClass} aria-hidden />
    </div>
  );
}

export { Skeleton, SkeletonGroup, SurfaceShimmer };
