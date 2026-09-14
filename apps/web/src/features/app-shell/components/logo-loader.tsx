import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { logoLoaderStatus } from "@/features/app-shell/components/logo-loader-status";
import { getBrandAssetHref, getLogoAnimationHref } from "@/lib/favicon";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

type LogoLoaderProps = {
  label?: string;
  placement?: "page" | "slot";
};

export function LogoLoader({ label = "Opening Orch", placement = "page" }: LogoLoaderProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 400);
    return () => window.clearInterval(id);
  }, []);

  const status = logoLoaderStatus(label, elapsedMs);
  const markHref = reducedMotion ? getBrandAssetHref("favicon") : getLogoAnimationHref();

  const body = (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "flex flex-col items-center justify-center gap-5 bg-default",
        placement === "page" ? "fixed inset-0 z-[80]" : "h-full min-h-0 w-full",
      )}
    >
      <img src={markHref} alt="" className="size-20 select-none" draggable={false} />
      <p className="text-sm text-muted-foreground">{status}</p>
      <div className="h-px w-32 overflow-hidden bg-border" aria-hidden>
        <div className="logo-loader-bar h-full w-1/3 bg-foreground" />
      </div>
    </div>
  );

  if (placement === "page") {
    return createPortal(body, document.body);
  }

  return body;
}
