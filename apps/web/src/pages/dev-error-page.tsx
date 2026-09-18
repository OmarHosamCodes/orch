import { useState } from "react";
import { AlertCircle, Ghost, Loader2, RefreshCw } from "lucide-react";

import { Dithered404 } from "@/components/ui/dithered-404";
import { NotFoundState, RouteError, RouteNotFound, RoutePending } from "@/features/app-shell/route-status";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/ui/tabs";

const DEMO_ROUTE_ERROR = new Error("Loader failed with status 500.");

export function DevErrorPage() {
  const [tab, setTab] = useState("error");
  const [retryCount, setRetryCount] = useState(0);
  const handleDemoRetry = () => setRetryCount((count) => count + 1);

  return (
    <div className="space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-destructive/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-destructive uppercase">
                DEV BENCHMARK
              </span>
              <h1 className="text-2xl font-semibold tracking-tight text-highlighted">
                Error components
              </h1>
            </div>
            <p className="mt-2 max-w-prose text-sm text-muted">
              Route error, not-found, pending, and 404 components used across the app shell.
            </p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mt-6">
            <TabsTrigger value="error">Error</TabsTrigger>
            <TabsTrigger value="not-found">Not Found</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="404">404 Canvas</TabsTrigger>
          </TabsList>

          {tab === "error" ? (
            <section className="mt-8 space-y-6">
              {retryCount > 0 ? (
                <p className="font-mono text-xs text-muted">Try again pressed × {retryCount}</p>
              ) : null}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <AlertCircle className="size-4 text-destructive" />
                    RouteError
                  </CardTitle>
                  <CardDescription>
                    Headline, one recovery sentence, Try again plus an escape, details collapsed.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center p-6">
                  <RouteError error={DEMO_ROUTE_ERROR} reset={handleDemoRetry} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <AlertCircle className="size-4 text-destructive" />
                    Workspace failure
                  </CardTitle>
                  <CardDescription>
                    Mirrors the authenticated shell errorComponent with a custom message.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center p-6">
                  <RouteError
                    message="Couldn't open your workspace."
                    error={DEMO_ROUTE_ERROR}
                    reset={handleDemoRetry}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <AlertCircle className="size-4 text-destructive" />
                    Bare default
                  </CardTitle>
                  <CardDescription>
                    No props. Try again falls back to reloading the page.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center p-6">
                  <RouteError />
                </CardContent>
              </Card>
            </section>
          ) : null}

          {tab === "not-found" ? (
            <section className="mt-8 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Ghost className="size-4 text-muted-foreground" />
                    RouteNotFound
                  </CardTitle>
                  <CardDescription>
                    Full-page not-found state with dithered 404 mark and back link.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center p-6">
                  <RouteNotFound />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Ghost className="size-4 text-muted-foreground" />
                    NotFoundState with custom props
                  </CardTitle>
                  <CardDescription>
                    NotFoundState with custom title, description, and back label.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center p-6">
                  <NotFoundState title="Custom 404" description="This resource no longer exists." backLabel="Go home" />
                </CardContent>
              </Card>
            </section>
          ) : null}

          {tab === "pending" ? (
            <section className="mt-8 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Loader2 className="size-4 text-muted-foreground" />
                    RoutePending (surface variant)
                  </CardTitle>
                  <CardDescription>
                    Default surface shimmer used while loading route data.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center p-6">
                  <RoutePending label="Loading..." variant="surface" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Loader2 className="size-4 text-muted-foreground" />
                    RoutePending (logo variant)
                  </CardTitle>
                  <CardDescription>
                    Logo loader used during cold boot before the shell is ready.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center p-6">
                  <RoutePending label="Opening workspace" variant="logo" />
                </CardContent>
              </Card>
            </section>
          ) : null}

          {tab === "404" ? (
            <section className="mt-8 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <RefreshCw className="size-4 text-muted-foreground" />
                    Dithered404
                  </CardTitle>
                  <CardDescription>
                    Animated dithered 404 canvas component with interactive hover.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center p-6">
                  <div className="relative h-48 w-full max-w-xs">
                    <Dithered404 interactive={false} />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <RefreshCw className="size-4 text-muted-foreground" />
                    Dithered404 (interactive)
                  </CardTitle>
                  <CardDescription>
                    Same component with pointer-interactive particles.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center p-6">
                  <div className="relative h-48 w-full max-w-xs">
                    <Dithered404 interactive />
                  </div>
                </CardContent>
              </Card>
            </section>
          ) : null}
        </Tabs>
    </div>
  );
}
