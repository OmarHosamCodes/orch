import { useEffect, useState, type ReactNode } from "react";

import { SHELL_CONTENT_IN_MS } from "@/features/app-shell/shell/shell-boot";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";
import { SurfaceShimmer } from "@/ui/skeleton";

type ShellBootSurfaceProps = {
  booting: boolean;
  label: string;
  children: ReactNode;
  className?: string;
  /** Fill the parent (Tracker / canvas). Off lets document-scroll pages grow and scroll. */
  fill?: boolean;
};

export function ShellBootSurface({
  booting,
  label,
  children,
  className,
  fill = true,
}: ShellBootSurfaceProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [loaderVisible, setLoaderVisible] = useState(booting);
  const [loaderExiting, setLoaderExiting] = useState(false);

  useEffect(() => {
    if (booting) {
      setLoaderVisible(true);
      setLoaderExiting(false);
      return;
    }

    if (!loaderVisible) return;

    if (reducedMotion) {
      setLoaderVisible(false);
      setLoaderExiting(false);
      return;
    }

    setLoaderExiting(true);
    const timeoutId = window.setTimeout(() => {
      setLoaderVisible(false);
      setLoaderExiting(false);
    }, SHELL_CONTENT_IN_MS);

    return () => window.clearTimeout(timeoutId);
  }, [booting, loaderVisible, reducedMotion]);

  const occupyViewport = fill || booting || loaderVisible;

  return (
    <div
      className={cn(
        "relative min-h-0",
        occupyViewport ? "flex h-full min-h-full flex-col" : "min-h-full",
        className,
      )}
    >
      <div
        className={cn(
          fill && "flex min-h-0 flex-1 flex-col",
          booting ? "invisible pointer-events-none" : undefined,
        )}
      >
        {children}
      </div>
      {loaderVisible ? (
        <div
          className={cn(
            "z-[1]",
            booting ? "absolute inset-0 flex min-h-full flex-1 flex-col" : "absolute inset-0",
            loaderExiting &&
              "pointer-events-none opacity-0 transition-opacity duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-out)]",
          )}
        >
          <SurfaceShimmer className="h-full min-h-0 flex-1 rounded-[inherit]" label={label} />
        </div>
      ) : null}
    </div>
  );
}
