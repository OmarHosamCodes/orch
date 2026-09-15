# Web speed and hydration — synthesized design

> Arena 2026-09-15. Base: candidate 2 (surgical edits). Candidate 1 (`/tmp/arena-web-speed/candidate-1/` first-paint module) arrived after the first synthesis draft; screened and still rejected. Grafts from grounding plus later explorer findings.

## Problem

Orch web (TanStack Start + Vite) still fails its own S-grade budgets. Last measured marketing LCP is ~12.5s (July 2026 `apps/web/perf/baseline.json`). This branch already made hydration honest (dark-only) and filters cheap. First load is not blazing: unused `@fontsource` CSS, eager WebGL, grain canvas on every document, liquid-gooey on first shell paint, boot chrome waterfall, stale perf URLs, Sentry traces at 100%. The shell also carries unnecessary GPU/filter complexity in its active-selection and notification chrome.

Hard constraints: do not SSR Tracker/Reports day grids; prerender only `/`, `/privacy`, `/terms`, `/login`; Hono stays the API; Poppins + IBM Plex Arabic; retain readable CSS shell selection and badge chrome after removing `liquid-gooey`; `seedIfNotNewer` must not clobber live cache; Agency absolute paths; golden-file layers; Bun only.

Production `/` is live SSR. `railway-ssr-server.mjs` only statically serves paths containing `.`, so prerendered `dist/client/index.html` is not what Railway serves for `/`.

## Usage (caller's view)

Product engineers keep importing the same components. Speed is default.

```tsx
// landing-hero.tsx — FibreArc is a lazy chunk, mounted after idle (never SSR)
<DeferredFibreArc … />

// login-page.tsx — Scanner lazy + idle; login route has no AuthProvider
<Suspense fallback={null}>{showFx ? <Scanner … /> : null}</Suspense>

// shell-liquid-nav.tsx — CSS active-selection rect
```

```bash
bun run perf:ci   # absolute Agency paths; marketing CI without Google storageState
```

## Shape

Surgical edits in files that already own the behavior. One 15-line helper, `scheduleIdle` in `apps/web/src/lib/schedule-idle.ts`, because four FX call sites would otherwise copy `requestIdleCallback` policy.

TanStack Start **already** always registers `tanStackRouterCodeSplitter`. Default split list is `component` / `errorComponent` / `notFoundComponent`. `pendingComponent` and loaders stay on the eager route module. Splits are transform-time `?tsr-split=` virtual modules even though `routeTree.gen.ts` looks static. Do **not** add `router.experimental.enableCodeSplitting` or a top-level `autoCodeSplitting` flag — both are no-ops or omitted from `tanstackStart()` schema.

Grain CSS already applies only to `.app-shell*`. Do not put grain on `body`. Do not generate a 256² data URL on marketing: move `<GlobalGrain />` from `__root.tsx` into `AppShell`. Remove `liquid-gooey` instead of replacing it with another filter/morph library; the measured selection rectangle and badge pill remain CSS-only.

Landing LCP is `font-medium` (500). Preload Poppins 500, not only 600. Drop the unused `hero-reveal` animation class (no `@keyframes`).

FibreArc must not be in the SSR HTML. `usePrefersReducedMotion` is `false` on the server, so a static canvas hydrates-mismatch reduced-motion users. Idle-mount with `showFx` starting `false` is the fix; do not change the hook's SSR default.

Login must not wrap `AuthProvider`. That provider statically imports Agency live, authenticated client reset, and Sentry. `LoginPage` already uses `authClient.useSession()`.

Boot: when `preferredTeamId` is set, start team-scoped chrome RPCs in parallel with `team.list`; discard speculative results if `resolveBootTeamId` differs. Sequential path stays for first visit. Zustand `selectedTeamId` is empty on SSR, so the parallel path is for client navigations. `seedIfNotNewer` unchanged. Prefetch `billing.state` in `loadAuthenticatedShell` so the Agency boot gate is not blocked on a cold billing query.

Money prefetch: `moneySettings.get` only (no period). Period bills/scoreboard stay on the page.

Dashboard: `resolveDefaultDashboardRangePreset(null)` is `last30`. The page Outlet mounts under the boot shimmer, so disable the dashboard `useQuery` until tenure policy is settled.

Perf: `/marketplace` and `/billing` have no route modules. Login UI is Google-only and `/sign-in/email` is in Better Auth `disabledPaths`. Do not click the removed email form.

## Synthesis decision

Base is candidate 2 (zero new subsystem, in-place owners). Candidate 1 is a real second shape: `@/lib/first-paint` with `decideGpuMount` (`ssr` | `reduced-motion` | `before-idle` | `allowed`), a document idle latch, and four wrappers (`FibreArcFx`, `ScannerFx`, `LiquidFx`, `FirstPaintGrain`). Red-flag screen: not shallow (policy is hidden), not temporal. Rejected anyway:

- Public surface copies FibreArc / Scanner / liquid-gooey prop bags (`FibreArcFxProps`, compound `LiquidFx.Item`) — pass-through of library APIs plus a new name for every call site.
- Session-wide idle latch would remount GPU on the first Agency paint after login without a second wait; that also fights Task 9 (agent dock must idle-mount on the shell, not inherit a latch already flipped on `/login`).
- Committed `grain-256.png` blocks this round on an asset; candidate 2 keeps runtime grain on AppShell only.
- `liquid-gooey` lazy + context for `Item` is unnecessary now that shell chrome is CSS-only; removing the dependency is smaller and eliminates its filter/GPU cost entirely.
- Four call sites do not justify a GPU dumping ground. `scheduleIdle` is the shared policy; wrappers stay at the owners.

Grafted from grounding, explorers, and candidate 1’s usage notes:

- `scheduleIdle` helper (four FX sites).
- Grain stays shell-only; skip marketing generation instead of a body-level webp.
- Idle-mount `WorkspaceAgentHost` so the assistant-ui chunk is not requested on first shell paint (candidate 1 left this untouched; we still defer it).
- Code-splitting is already on; measure `?tsr-split=` chunks instead of flipping a flag.
- Never mount Scanner with `speed={0}` — that still loads ogl (candidate 1). Idle + `showFx` starting false.
- Remove `liquid-gooey` from shell owners, `apps/web/package.json`, `bun.lock`, `DESIGN.md`, and `PRODUCT.md`; retain only the measured CSS active-selection rectangle and static badge.
- Rejected: FirstPaintPolicy module, new chrome oRPC batch, RSC rewrite, Money scoreboard prefetch in boot.

## Tradeoffs accepted

- We accept a committed later static grain texture if AppShell canvas TBT is still high, in exchange for not blocking this plan on asset production.
- We accept 10% Sentry traces in exchange for less main-thread tax.
- We accept a possible extra dashboard fetch when tenure range ≠ the default range after policy loads (prefetch default, then tenure if different).
- We accept marketing-only `perf:ci` until a Google `PERF_STORAGE_STATE` exists.

## Alternatives considered

- First-paint policy module (`FibreArcFx` / `ScannerFx` / `LiquidFx` / `FirstPaintGrain`): rejected after the package landed. Callers would learn a new GPU API; latch ownership fights agent-dock idle; grain PNG is out of scope.
- Batch `boot.getShellChrome` oRPC: rejected this round. Parallelize inside `loadBootShellChrome` first.
- Runtime grain on every route: rejected. Marketing does not even paint grain.
- Enable `router.experimental.enableCodeSplitting`: rejected after explorers showed Start already always installs the splitter.

## Open questions

- After Tasks 6–9, does AppShell still land in `/` chunks? Only then lazy `_authenticated`'s component.
- Visual pass on rail labels after dropping Merriweather.

## Next implementation step

Task 1 of `docs/superpowers/plans/2026-09-15-web-speed-hydration.md`: production build and record first-load JS for `/` and `/login`.
