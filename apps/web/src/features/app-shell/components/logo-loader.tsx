import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Loader } from "@/components/ui/loader";
import { logoLoaderSubtitle } from "@/features/app-shell/components/logo-loader-status";
import { cn } from "@/lib/utils";

type LogoLoaderProps = {
  label?: string;
  placement?: "page" | "slot";
};

export function LogoLoader({ label = "Opening Orch", placement = "page" }: LogoLoaderProps) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 400);
    return () => window.clearInterval(id);
  }, []);

  const subtitle = logoLoaderSubtitle(label, elapsedMs);

  const body = (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "bg-default",
        placement === "page" ? "fixed inset-0 z-[80]" : "h-full min-h-0 w-full",
      )}
    >
      <Loader
        className="h-full w-full"
        size={placement === "page" ? "lg" : "md"}
        subtitle={subtitle}
        title={label}
      />
    </div>
  );

  if (placement === "page") {
    return createPortal(body, document.body);
  }

  return body;
}
