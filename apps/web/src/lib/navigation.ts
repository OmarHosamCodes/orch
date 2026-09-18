import {
  Link as TanStackLink,
  Navigate as TanStackNavigate,
  useNavigate as useTanStackNavigate,
  useRouterState,
} from "@tanstack/react-router";
import {
  createElement,
  forwardRef,
  useCallback,
  useMemo,
  type ComponentProps,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

type NavigateOptions = {
  replace?: boolean;
  state?: unknown;
};

export type AppNavigate = {
  (to: string, options?: NavigateOptions): Promise<void> | void;
  (delta: number): void;
};

export function useNavigate(): AppNavigate {
  const navigate = useTanStackNavigate();

  return useCallback(
    ((to: string | number, options?: NavigateOptions) => {
      if (typeof to === "number") {
        window.history.go(to);
        return;
      }

      return navigate({
        href: to,
        replace: options?.replace,
        state: options?.state as never,
      });
    }) as AppNavigate,
    [navigate],
  );
}

type SetURLSearchParams = (
  nextInit:
    | URLSearchParams
    | Record<string, string>
    | string
    | ((prev: URLSearchParams) => URLSearchParams),
  navigateOpts?: { replace?: boolean },
) => void;

export function useSearchParams(): [URLSearchParams, SetURLSearchParams] {
  const searchStr = useRouterState({
    select: (state) => state.location.searchStr,
  });
  const navigate = useTanStackNavigate();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const hash = useRouterState({
    select: (state) => state.location.hash,
  });

  const searchParams = useMemo(() => new URLSearchParams(searchStr), [searchStr]);

  const setSearchParams = useCallback<SetURLSearchParams>(
    (nextInit, navigateOpts) => {
      const previous = new URLSearchParams(searchStr);
      let next: URLSearchParams;
      if (typeof nextInit === "function") {
        next = nextInit(new URLSearchParams(previous));
      } else if (typeof nextInit === "string") {
        next = new URLSearchParams(nextInit.startsWith("?") ? nextInit.slice(1) : nextInit);
      } else if (nextInit instanceof URLSearchParams) {
        next = new URLSearchParams(nextInit);
      } else {
        next = new URLSearchParams(nextInit);
      }

      const query = next.toString();
      const href = `${pathname}${query ? `?${query}` : ""}${hash || ""}`;
      void navigate({
        href,
        replace: navigateOpts?.replace ?? false,
      });
    },
    [hash, navigate, pathname, searchStr],
  );

  return [searchParams, setSearchParams];
}

export function useLocation() {
  return useRouterState({
    select: (state) => ({
      pathname: state.location.pathname,
      search: state.location.searchStr,
      hash: state.location.hash,
      state: state.location.state as unknown,
      key: state.location.href,
    }),
  });
}

export function collectRouteParams(
  matches: ReadonlyArray<{ params?: Record<string, unknown> }>,
): Record<string, string> {
  const params: Record<string, string> = {};
  for (const match of matches) {
    const next = match.params;
    if (!next) continue;
    for (const [key, value] of Object.entries(next)) {
      if (typeof value === "string") params[key] = value;
    }
  }
  return params;
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string>>() {
  const params = useRouterState({
    select: (state) => collectRouteParams(state.matches),
  });
  return params as T;
}

export function useNavigationType(): "POP" | "PUSH" | "REPLACE" {
  // Shell transitions only special-case POP; default PUSH keeps enter animations.
  useRouterState({ select: (state) => state.location.href });
  return "PUSH";
}

type AppLinkActiveOptions = {
  exact?: boolean;
  includeSearch?: boolean;
  includeHash?: boolean;
};

type AppLinkProps = {
  to: string;
  replace?: boolean;
  state?: unknown;
  children?: ReactNode;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLAnchorElement>) => void;
  className?: string;
  target?: string;
  rel?: string;
  role?: string;
  title?: string;
  id?: string;
  activeOptions?: AppLinkActiveOptions;
  "aria-label"?: string;
  "aria-current"?: ComponentProps<"a">["aria-current"];
  "aria-haspopup"?: ComponentProps<"a">["aria-haspopup"];
  "aria-expanded"?: boolean | "true" | "false";
  "aria-controls"?: string;
};

export const Link = forwardRef<HTMLAnchorElement, AppLinkProps>(function Link(
  { to, replace, state, children, onClick, activeOptions, ...rest },
  ref,
) {
  return createElement(
    TanStackLink,
    {
      ...rest,
      ref,
      to,
      replace,
      state: state as never,
      onClick,
      activeOptions,
    } as never,
    children,
  );
});

type AppNavigateProps = {
  to: string;
  replace?: boolean;
  state?: unknown;
};

export function Navigate({ to, replace, state }: AppNavigateProps) {
  return createElement(TanStackNavigate, {
    href: to,
    replace,
    state: state as never,
  } as never);
}

export { Outlet } from "@tanstack/react-router";
