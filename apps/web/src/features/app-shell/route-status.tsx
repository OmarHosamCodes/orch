import { Link } from "@/lib/navigation";

import { Dithered404 } from "@/components/ui/dithered-404";
import { LogoLoader } from "@/features/app-shell/components/logo-loader";
import { agencyErrorPanelClass } from "@/features/shared/agency-ui";

export function RoutePending({ label = "Loading" }: { label?: string }) {
  return <LogoLoader placement="slot" label={label} />;
}

export function RouteError({ message = "Something went wrong." }: { message?: string }) {
  return (
    <div className="flex h-full min-h-0 items-center justify-center p-6">
      <div className={agencyErrorPanelClass} role="alert">
        {message}
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
    <div className="orch-grain-surface relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden bg-background px-6 py-16 text-foreground">
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
