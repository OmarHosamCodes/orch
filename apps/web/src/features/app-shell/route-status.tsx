import { AlertTriangle } from "lucide-react";

import { Link } from "@/lib/navigation";

import { Dithered404 } from "@/components/ui/dithered-404";
import { LogoLoader } from "@/features/app-shell/components/logo-loader";
import { Button } from "@/ui/button";
import { SurfaceShimmer } from "@/ui/skeleton";

type RoutePendingProps = {
  label?: string;
  /** `logo` is cold boot only — in-shell waits stay on one surface shimmer. */
  variant?: "logo" | "surface";
};

export function RoutePending({ label = "Loading", variant = "surface" }: RoutePendingProps) {
  if (variant === "logo") {
    return <LogoLoader placement="slot" label={label} />;
  }

  return <SurfaceShimmer className="h-full min-h-0 rounded-[inherit]" label={label} />;
}

type RouteErrorProps = {
  message?: string;
  error?: unknown;
  reset?: () => void;
};

function routeErrorDetail(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.length > 0) return error;
  return null;
}

export function RouteError({ message = "Something went wrong.", error, reset }: RouteErrorProps) {
  const detail = routeErrorDetail(error);
  return (
    <div className="flex h-full min-h-0 items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col items-center text-center" role="alert">
        <span
          aria-hidden="true"
          className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive"
        >
          <AlertTriangle className="size-5" />
        </span>
        <h2 className="mt-4 text-xl font-semibold tracking-tight text-highlighted">{message}</h2>
        <p className="mt-2 text-sm text-muted">Trying again usually fixes it.</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={reset ?? (() => window.location.reload())}
          >
            Try again
          </Button>
          <Button type="button" size="sm" variant="outline" asChild>
            <Link to="/canvas">Back to Canvas</Link>
          </Button>
        </div>
        {detail && import.meta.env.DEV ? (
          <details className="mt-4 w-full rounded-xl border border-default bg-elevated/40 px-3 py-2 text-left">
            <summary className="cursor-pointer text-xs font-medium text-muted hover:text-highlighted">
              Error details
            </summary>
            <p className="mt-2 font-mono text-xs break-all text-muted">{detail}</p>
          </details>
        ) : null}
      </div>
    </div>
  );
}

type NotFoundStateProps = {
  title?: string;
  description?: string;
  backLabel?: string;
};

export function NotFoundState({
  title = "Page not found",
  description = "We couldn’t find that page.",
  backLabel = "Back to Canvas",
}: NotFoundStateProps) {
  return (
    <div className="relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden bg-background px-6 py-16 text-foreground">
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
        <div className="relative h-44 w-full max-w-xs sm:h-52">
          <Dithered404 className="opacity-70" interactive={false} />
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">{description}</p>
        <Link
          to="/canvas"
          className="mt-6 inline-flex h-9 items-center rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          {backLabel}
        </Link>
      </div>
    </div>
  );
}

export function RouteNotFound() {
  return <NotFoundState />;
}
