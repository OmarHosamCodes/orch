import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useEffect, type ReactNode } from "react";

import { RouteError, RouteNotFound } from "@/features/app-shell/route-status";
import { subscribeThemeDomSync } from "@/stores/theme";
import { Toaster } from "@/ui/sonner";
import appCss from "@/index.css?url";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  errorComponent: () => <RouteError />,
  notFoundComponent: RouteNotFound,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1.0",
      },
      {
        name: "theme-color",
        content: "oklch(0.15 0.02 269.18)",
      },
      { title: "Orch" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      {
        rel: "preload",
        href: "/fonts/poppins-latin-600-normal.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
    ],
    scripts: [
      {
        children: `(function () {
  try {
    var stored = localStorage.getItem("orch-theme");
    var theme =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    var icon = document.querySelector('link[rel="icon"]');
    if (icon) {
      icon.href = theme === "light" ? "/favicon-light.svg" : "/favicon.svg";
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.content = theme === "light" ? "oklch(0.985 0.006 269)" : "oklch(0.15 0.02 269.18)";
    }
  } catch (_) {}
})();`,
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  useEffect(() => subscribeThemeDomSync(), []);

  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Toaster position="bottom-right" />
        {import.meta.env.DEV ? <TanStackRouterDevtools position="bottom-left" /> : null}
        {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
        <Scripts />
      </body>
    </html>
  );
}
