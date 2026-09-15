# Web Speed and Hydration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut first-load JS/CSS/fonts and post-hydrate GPU work so marketing/login hydrate as documents and Agency/Canvas reach interactive without changing product UX.

**Architecture:** Surgical edits in files that already own the behavior. One 15-line `scheduleIdle` helper for the three remaining FX call sites. Remove `liquid-gooey` entirely and use CSS selection/badge surfaces; no liquid fallback or replacement animation. No FirstPaintPolicy module, no new oRPC chrome batch, no RSC rewrite. Start already always installs `tanStackRouterCodeSplitter` (`component` / `error` / `notFound`); `pendingComponent` and loaders stay on the eager route module — do not add a redundant `enableCodeSplitting` flag. Design: [`docs/superpowers/specs/2026-09-15-web-speed-hydration-design.md`](../specs/2026-09-15-web-speed-hydration-design.md).

**Tech Stack:** TanStack Start + Vite 8, React 19, TanStack Query, Bun test, existing `bun run perf` / Lighthouse harness.

## Global Constraints

- Default PR branch is `dev`.
- Bun only (`bun test`, `bun run check`, `bun run check-types`); never npm/pnpm/yarn.
- Do not SSR Tracker, live Reports, Canvas, node, or object day/board trees (`ssr: false` stays).
- Prerender only `/`, `/privacy`, `/terms`, `/login`. Production `/` is still live SSR (`railway-ssr-server.mjs` only statically serves paths containing `.`); measure LCP against the live document, not `dist/client/index.html`.
- Hono in `apps/server` stays the API; Start owns the document.
- Agency URLs stay absolute (`/agency`, `/agency/dashboard`, …). Keep `from`/`to`/`focus`/`alertId`.
- Dark-only: keep `html.dark` and the two-statement inline script.
- Product fonts: Poppins + IBM Plex Arabic. Do not reintroduce `next-themes`.
- Remove `liquid-gooey` entirely; retain a readable CSS active-selection rect and static notification badge.
- `seedIfNotNewer` in `boot-chrome.ts` must not overwrite query data newer than boot start.
- Views stay golden-file presentational. New helper lives in `apps/web/src/lib/`, not `utils.ts`.
- Browser/Vite must not import `@orch/agent` barrel.
- Conventional commits (`perf:`, `fix:`, `chore:`). One commit per task.
- After add/delete/move of in-scope source files: `node scripts/generate-golden-file-inventory.mjs` then `bun run check:golden`.
- Do not add Playwright component tests. Unit-test logic with `bun test`. Perf uses `bun run perf`.

---

## File structure

| Path | Responsibility |
|------|----------------|
| `apps/web/src/lib/schedule-idle.ts` | One idle scheduler used by FX deferral. |
| `apps/web/src/lib/schedule-idle.test.ts` | Cancel + fallback timeout. |
| `apps/web/src/index.css` | Drop unused `@fontsource`; retarget Merriweather rules to `--font-sans`. |
| `apps/web/package.json` | Remove unused font packages, `framer-motion`, and `liquid-gooey`. |
| `apps/web/src/routes/__root.tsx` | Grain off marketing; preload Poppins 500 for LCP. |
| `apps/web/src/features/app-shell/app-shell.tsx` | Mount grain only inside the authenticated shell; idle-mount agent host. |
| `apps/web/vite.config.ts` | Unchanged for splitting (already on). Measure `?tsr-split=` chunks in Task 5. |
| `apps/web/src/components/marketing/landing-hero.tsx` | Lazy FibreArc after idle; no dead `hero-reveal`. |
| `apps/web/src/features/auth/login-page.tsx` | Lazy Scanner after idle. |
| `apps/web/src/routes/login.tsx` | No `AuthProvider` (avoids Agency live / client-reset / Sentry). |
| `apps/web/src/lib/authenticated-boot.ts` | Prefetch `billing.state` after session. |
| `apps/web/perf/global-setup.mjs` | No email/password clicks; optional `PERF_STORAGE_STATE`.
| `apps/web/src/features/app-shell/shell-liquid-nav.tsx` | CSS-only active selection rect; retain measurement and registration APIs. |
| `apps/web/src/features/app-shell/shell-liquid-badge.tsx` | CSS-only notification badge. |
| `apps/web/src/lib/boot-chrome.ts` | Speculative parallel chrome when preferred team is known. |
| `apps/web/src/lib/boot-chrome.test.ts` | Parallelism + discard-on-mismatch. |
| `apps/web/src/features/shared/agency-segment-boot.ts` | Dashboard range parallel; Money `moneySettings.get`. |
| `apps/web/src/lib/sentry.ts` | `tracesSampleRate: 0.1` in production. |
| `apps/web/perf/routes.mjs` | Absolute Agency paths. |
| `docs/ssr-migration-tanstack-start.md` | Point Sentry note at tanstack integration (already wired). |

**Out of this plan:** RSC rewrite, new chrome batch RPC, committed grain raster asset, lazy-loading every Agency page module by hand, raising Lighthouse budgets without a new baseline.

---

### Task 1: Record first-load JS before changing anything

**Files:**
- Modify: none (read-only measure; paste numbers into the PR description)
- Test: none

**Interfaces:**
- Consumes: `apps/web` production build output under `apps/web/dist` / `apps/web/.output/public`
- Produces: a written inventory of gzip JS for `/` and `/login` used by later tasks as the before number

- [ ] **Step 1: Production-build web**

Run from repo root:

```bash
bun --cwd apps/web run build
```

Expected: exit 0. Assets under `apps/web/dist/client` or `apps/web/.output/public` (use whichever the build prints).

- [ ] **Step 2: List JS chunks and gzip sizes**

```bash
python3 - <<'PY'
from pathlib import Path
import gzip
roots = [Path("apps/web/dist/client"), Path("apps/web/.output/public"), Path("apps/web/dist")]
root = next((p for p in roots if p.exists()), None)
print("root", root)
if not root:
    raise SystemExit("no dist")
files = sorted(root.rglob("*.js"), key=lambda p: p.stat().st_size, reverse=True)[:25]
for p in files:
    raw = p.read_bytes()
    print(f"{len(gzip.compress(raw))/1024:7.1f} KB gzip  {p.relative_to(root)}")
PY
```

Expected: a ranked list. Record the largest 10 in the PR.

- [ ] **Step 3: Grep whether marketing-critical names sit in the largest chunks**

```bash
python3 - <<'PY'
from pathlib import Path
needles = [b"liquid-gooey", b"FibreArc", b"exceljs", b"@xyflow/react", b"WorkspaceAgent"]
roots = [Path("apps/web/dist/client"), Path("apps/web/.output/public"), Path("apps/web/dist")]
root = next((p for p in roots if p.exists()), None)
for p in root.rglob("*.js"):
    data = p.read_bytes()
    hits = [n.decode() for n in needles if n in data]
    if hits:
        print(p.name, hits)
PY
```

Expected: honest inventory. Start already code-splits `component` via `?tsr-split=` virtual modules even though `routeTree.gen.ts` looks static. Task 5 only interprets this grep; it does not flip a plugin flag.

- [ ] **Step 4: Commit nothing**

This task is measurement only.

---

### Task 2: Strip unused font CSS

**Files:**
- Modify: `apps/web/src/index.css:1-9`, `apps/web/src/index.css:344-346`, `apps/web/src/index.css:529-533`, `apps/web/src/index.css:690-699`, `apps/web/src/index.css:839-847`, `apps/web/src/index.css:1138-1142`
- Modify: `apps/web/src/routes/__root.tsx` (preload Poppins 500)
- Modify: `apps/web/src/components/marketing/landing-hero.tsx` (drop dead `hero-reveal` class)
- Modify: `apps/web/package.json` (remove five `@fontsource*` deps)
- Test: visual on `/`, `/login`, `/privacy`, `/terms`, `/agency` rail labels

**Interfaces:**
- Consumes: `--font-sans` already `"Poppins", "IBM Plex Sans Arabic", …`
- Produces: CSS that no longer `@import`s Lato/Merriweather/Roboto; shell labels use `--font-sans`

- [ ] **Step 1: Remove fontsource imports**

In `apps/web/src/index.css` delete lines 4–8:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@import "tw-shimmer";
```

- [ ] **Step 1b: Preload the LCP weight**

Landing H1 is `font-medium` (500). In `apps/web/src/routes/__root.tsx` `head.links`, add a second preload (same `as`/`type`/`crossOrigin`) for `/fonts/poppins-latin-500-normal.woff2` **before** the 600 preload so LCP can use it. Keep 600.

Also delete `[animation:hero-reveal_1.2s_ease-out_both]` from the landing H1. There is no `@keyframes hero-reveal` in `index.css`; the class is a no-op.

- [ ] **Step 2: Point leftover theme-pack tokens at product fonts**

Replace:

```css
  --font-lato: Lato, sans-serif;
  --font-merriweather: Merriweather, serif;
  --font-roboto-mono: Roboto Mono, monospace;
```

with:

```css
  --font-lato: var(--font-sans);
  --font-merriweather: var(--font-sans);
  --font-roboto-mono: var(--font-mono);
```

Replace the nested `:root` block at ~529:

```css
  :root {
    --font-heading: var(--font-sans);
    --font-body: var(--font-sans);
    --font-mono: var(--font-mono);
  }
```

Replace the three `font-family: var(--font-merriweather)` rules (team card name, rail row label, context crumb current) with `font-family: var(--font-sans)`.

- [ ] **Step 3: Drop unused packages**

In `apps/web/package.json` remove:

```json
"@fontsource-variable/ibm-plex-sans": "^5.3.0",
"@fontsource-variable/merriweather": "^5.2.6",
"@fontsource-variable/roboto": "^5.3.0",
"@fontsource-variable/roboto-mono": "^5.2.9",
"@fontsource/lato": "^5.2.7",
```

Then:

```bash
bun install
```

Expected: lockfile updates; `bun run check-types` still passes.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/index.css apps/web/src/routes/__root.tsx apps/web/src/components/marketing/landing-hero.tsx apps/web/package.json bun.lock
git commit -m "$(cat <<'EOF'
perf(web): drop unused fontsource CSS from the document

EOF
)"
```

---

### Task 3: Add `scheduleIdle`

**Files:**
- Create: `apps/web/src/lib/schedule-idle.ts`
- Create: `apps/web/src/lib/schedule-idle.test.ts`

**Interfaces:**
- Consumes: `window.requestIdleCallback` when present, else `setTimeout(fn, 1)`
- Produces: `scheduleIdle(callback: () => void): () => void` (cancel)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, test } from "bun:test";

import { scheduleIdle } from "./schedule-idle";

describe("scheduleIdle", () => {
  test("returns a no-op cancel when window is undefined", () => {
    const cancel = scheduleIdle(() => {
      throw new Error("must not run");
    });
    expect(typeof cancel).toBe("function");
    cancel();
  });

  test("uses requestIdleCallback when present and cancel stops the callback", () => {
    const handles: number[] = [];
    const cancelled: number[] = [];
    const originalIdle = globalThis.requestIdleCallback;
    const originalCancel = globalThis.cancelIdleCallback;
    globalThis.requestIdleCallback = ((cb: IdleRequestCallback) => {
      const id = 7;
      handles.push(id);
      queueMicrotask(() =>
        cb({ didTimeout: false, timeRemaining: () => 10 } as IdleDeadline),
      );
      return id;
    }) as typeof requestIdleCallback;
    globalThis.cancelIdleCallback = ((id: number) => {
      cancelled.push(id);
    }) as typeof cancelIdleCallback;

    let ran = 0;
    const cancel = scheduleIdle(() => {
      ran += 1;
    });
    cancel();
    expect(handles).toEqual([7]);
    expect(cancelled).toEqual([7]);

    globalThis.requestIdleCallback = originalIdle;
    globalThis.cancelIdleCallback = originalCancel;
    expect(ran).toBe(0);
  });
});
```

Fix the IdleDeadline line if the test file has a syntax error: `as IdleDeadline)`.

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test apps/web/src/lib/schedule-idle.test.ts
```

Expected: FAIL with module not found.

- [ ] **Step 3: Write implementation**

```ts
export function scheduleIdle(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(() => {
      callback();
    });
    return () => window.cancelIdleCallback(id);
  }

  const timeoutId = window.setTimeout(callback, 1);
  return () => window.clearTimeout(timeoutId);
}
```

- [ ] **Step 4: Run tests**

```bash
bun test apps/web/src/lib/schedule-idle.test.ts
```

Expected: PASS. If the first test runs the callback in jsdom/bun (window exists), change it to assert cancel works with `setTimeout` fallback instead of assuming no window.

- [ ] **Step 5: Golden inventory**

```bash
node scripts/generate-golden-file-inventory.mjs
bun run check:golden
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/schedule-idle.ts apps/web/src/lib/schedule-idle.test.ts docs/golden-file-source-inventory.md
git commit -m "$(cat <<'EOF'
perf(web): add a shared idle scheduler for deferred FX

EOF
)"
```

---

### Task 4: Generate grain only inside AppShell

**Files:**
- Modify: `apps/web/src/routes/__root.tsx` (remove `GlobalGrain`)
- Modify: `apps/web/src/features/app-shell/app-shell.tsx` (mount `GlobalGrain`)

**Interfaces:**
- Consumes: existing `GlobalGrain` and `.app-shell` CSS that already reads `--orch-grain-image`
- Produces: marketing/login no longer run the 256² canvas loop

- [ ] **Step 1: Remove grain from root**

Delete the `GlobalGrain` import and `<GlobalGrain />` from `apps/web/src/routes/__root.tsx`. Keep Toaster and Scripts.

- [ ] **Step 2: Mount grain in AppShell**

At top of `apps/web/src/features/app-shell/app-shell.tsx`:

```ts
import { GlobalGrain } from "@/components/global-grain";
```

Inside the returned `div.app-shell`, as the first child:

```tsx
<GlobalGrain />
```

- [ ] **Step 3: Confirm CSS still only paints shell surfaces**

`apps/web/src/index.css` ~1078–1086 must still target `.app-shell`, `.app-shell__rail`, `.app-shell__context-bar`, `.app-shell__drawer-static` — not `body`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes/__root.tsx apps/web/src/features/app-shell/app-shell.tsx
git commit -m "$(cat <<'EOF'
perf(web): skip grain generation on marketing documents

EOF
)"
```

---

### Task 5: Prove Start splitting; do not flip a flag

**Files:**
- None unless the Task 1 grep shows `liquid-gooey` / FibreArc / `@xyflow` in the `/` entry. Then only lazy at call sites (Tasks 6–9). Do **not** edit `apps/web/vite.config.ts`.

**Interfaces:**
- Consumes: Task 1 gzip inventory and `apps/web/dist` after `bun --cwd apps/web run build`
- Produces: a written verdict in the PR: which chunks are `?tsr-split=` vs eager `pendingComponent`

Start **already** always registers `tanStackRouterCodeSplitter`. Default split list is `component`, `errorComponent`, `notFoundComponent`. `loader` and `pendingComponent` stay on the eager route module. `tanstackStart()` input schema **omits** top-level `autoCodeSplitting`. `routeTree.gen.ts` still looks static; splits are transform-time `?tsr-split=` virtual modules.

- [ ] **Step 1: Confirm the plugin is already on**

```bash
rg -n "tanStackRouterCodeSplitter|enableCodeSplitting|autoCodeSplitting" node_modules/@tanstack/start-plugin-core/dist apps/web/vite.config.ts
```

Expected: splitter registered by Start regardless of vite config. Do not add `router.experimental.enableCodeSplitting` — it is a no-op on this version.

- [ ] **Step 2: Repeat Task 1 grep on the existing build**

```bash
python3 - <<'PY'
from pathlib import Path
root = Path("apps/web/dist/client/assets")
needles = ("liquid-gooey", "FibreArc", "ogl", "@xyflow", "exceljs", "assistant-ui")
for p in sorted(root.glob("*.js"))[:80]:
    text = p.read_text(errors="ignore")
    hits = [n for n in needles if n in text]
    if hits:
        print(f"{p.name} {p.stat().st_size} {hits}")
PY
```

Expected: authenticated FX may still sit in `_authenticated` / AppShell chunks, not in the smallest marketing entry. If FibreArc or `ogl` is in a marketing-named chunk, Task 6/7 must lazy them. If `liquid-gooey` is in a marketing chunk, Task 8. Do **not** invent a second splitter.

- [ ] **Step 3: Commit nothing**

This task is measurement. A later follow-up may lazy `_authenticated`'s `component` only if AppShell still lands in `/` after Tasks 6–9.

---

### Task 6: Defer FibreArc on landing

**Files:**
- Modify: `apps/web/src/components/marketing/landing-hero.tsx`

**Interfaces:**
- Consumes: `scheduleIdle`, `usePrefersReducedMotion`, default export of `fibre-arc.tsx`
- Produces: first landing JS parse without the FibreArc shader module

- [ ] **Step 1: Replace the static FibreArc import**

```tsx
import { lazy, Suspense, useEffect, useState } from "react";

import { LandingAuthActions } from "@/components/marketing/landing-auth-actions";
import { MarketingBrandLockup } from "@/components/marketing/marketing-brand-lockup";
import { scheduleIdle } from "@/lib/schedule-idle";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { Link } from "@/lib/navigation";

const FibreArc = lazy(() => import("@/components/originkit/ui/fibre-arc"));
```

Remove `import FibreArc from "@/components/originkit/ui/fibre-arc"`.

- [ ] **Step 2: Idle-mount inside `LandingHero`**

Keep existing props. Add:

```tsx
  const [showFx, setShowFx] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;
    return scheduleIdle(() => setShowFx(true));
  }, [reducedMotion]);
```

Wrap the FibreArc branch:

```tsx
      {!reducedMotion && showFx ? (
        <div className="pointer-events-none absolute inset-0 z-0 opacity-45" aria-hidden="true">
          <Suspense fallback={null}>
            <FibreArc
              background="#000000"
              baseColor="#363244"
              accentColor="#5b5bd6"
              highlight="#f4f4f5"
              density={16}
              speed={30}
              direction={40}
              hover={68}
              reach={23}
              bundle={{ curve: 36, spread: 85, thickness: 109, comb: 170 }}
            />
          </Suspense>
        </div>
      ) : (
        <div
          className="pointer-events-none absolute inset-0 opacity-100"
          style={{ background: "var(--marketing-accent-glow)" }}
          aria-hidden="true"
        />
      )}
```

`showFx` starts `false`, so SSR and the first client render both paint the glow fallback. That is required: `usePrefersReducedMotion` returns `false` on the server (`typeof window === "undefined"`), so a static FibreArc would hydrate-mismatch reduced-motion users. Do not SSR FibreArc. Do not change the hook's SSR default in this task.

H1 and auth actions stay as they are so LCP can be the heading. Do not restore `[animation:hero-reveal_…]` (removed in Task 2; there are no keyframes).

- [ ] **Step 3: Rebuild and confirm FibreArc is not in the landing entry chunk** (same grep as Task 1).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/marketing/landing-hero.tsx
git commit -m "$(cat <<'EOF'
perf(web): load landing WebGL after first paint

EOF
)"
```

---

### Task 7: Defer Scanner on login

**Files:**
- Modify: `apps/web/src/features/auth/login-page.tsx`
- Modify: `apps/web/src/routes/login.tsx`

**Interfaces:**
- Consumes: `scheduleIdle`, default export of `Scanner.tsx`, `authClient.useSession` (already used by `useLoginPage`)
- Produces: login JS parse without `ogl` until idle; login graph without Agency live / client-reset

- [ ] **Step 1: Lazy-import Scanner**

Replace `import Scanner from "@/components/marketing/bits/Scanner"` with:

```tsx
import { lazy, Suspense, useEffect, useState } from "react";
import { scheduleIdle } from "@/lib/schedule-idle";

const Scanner = lazy(() => import("@/components/marketing/bits/Scanner"));
```

Keep other imports. Add idle state next to `usePrefersReducedMotion`:

```tsx
  const [showFx, setShowFx] = useState(false);
  useEffect(() => {
    if (reducedMotion) return;
    return scheduleIdle(() => setShowFx(true));
  }, [reducedMotion]);
```

Wrap the Scanner block:

```tsx
      <div className="pointer-events-none absolute inset-0 opacity-35" aria-hidden="true">
        {showFx ? (
          <Suspense fallback={null}>
            <Scanner
              color1="#6b7280"
              color2="#5b5bd6"
              color3="#f2f2f5"
              speed={reducedMotion ? 0 : 0.5}
              sweepSpeed={reducedMotion ? 0 : 0.25}
              sweepWidth={1.6}
              sweepFalloff={6}
              scale={1.5}
              frequency={2}
              ripple={0.22}
              bandDensity={11}
              lineSharpness={5.5}
              glow={0.22}
              scanDirection="vertical"
              colorSpread={0.7}
              brightness={0.85}
              contrast={1.15}
              softness={1.4}
              vignette={0.45}
              scanline
              grain
              grainIntensity={0.05}
              opacity={0.7}
              mouseInteraction={!reducedMotion}
              mouseRadius={0.5}
              mouseStrength={0.35}
            />
          </Suspense>
        ) : null}
      </div>
```

Loader redirect behavior stays unchanged. `showFx` starts `false` so login SSR never mounts Scanner (same reduced-motion hydration rule as Task 6).

- [ ] **Step 2: Drop `AuthProvider` from the login route**

`LoginPage` already calls `authClient.useSession()` via `useLoginPage`. Wrapping login in `AuthProvider` statically pulls `agency-live-connection`, `authenticated-client-reset` (Zustand team store), and Sentry into the login graph.

In `apps/web/src/routes/login.tsx`:

```tsx
function LoginRoute() {
  return <LoginPage />;
}
```

Remove the `AuthProvider` import. `markAuthSessionReady` still fires from the 6s timeout in `apps/web/src/lib/auth-client.ts`. Keep `AuthProvider` on `_authenticated.tsx` only.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/auth/login-page.tsx apps/web/src/routes/login.tsx
git commit -m "$(cat <<'EOF'
perf(web): load login Scanner after first paint

EOF
)"
```

---

### Task 8: Remove liquid-gooey and keep CSS chrome

**Files:**
- Modify: `apps/web/src/features/app-shell/shell-liquid-nav.tsx`
- Modify: `apps/web/src/features/app-shell/shell-liquid-badge.tsx`
- Modify: `apps/web/package.json`
- Modify: `DESIGN.md`
- Modify: `PRODUCT.md`

**Interfaces:**
- Consumes: existing measured selection rectangle and registration context
- Produces: CSS-only active navigation selection and notification badge; no `liquid-gooey` dependency or runtime chunk

- [ ] **Step 1: Delete the `liquid-gooey` import and render path**

In `shell-liquid-nav.tsx`, remove `Liquid`, `Liquid.Item`, and `usePrefersReducedMotion` imports. Keep `SelectionRect`, `measureSelectionRect`, `registerItem`, `ResizeObserver`, scroll remeasurement, and the context API because `app-shell-rail-items.tsx` and context-bar callers still need to register the active target. When `rect` exists, always render the existing static selection `div`:

```tsx
{rect ? (
  <div
    className="pointer-events-none absolute z-0 bg-sidebar-accent motion-reduce:transition-none"
    style={{
      left: rect.x,
      top: rect.y,
      width: rect.width,
      height: rect.height,
      borderRadius: rect.radius,
    }}
    aria-hidden
  />
) : null}
```

Do not add a replacement morph animation, idle gate, or new package. The selected row remains readable and the active rectangle continues to follow resize, scroll, and route changes through the existing measurement code.

- [ ] **Step 2: Make the notification badge CSS-only**

In `shell-liquid-badge.tsx`, remove `Liquid` and `usePrefersReducedMotion` imports. Replace the conditional Liquid branch with one always-static `span` using the existing reduced-motion classes, preserving `visible`, `children`, `className`, positioning, colors, and accessibility.

- [ ] **Step 3: Remove the dependency and stale product claims**

Remove `"liquid-gooey": "^0.2.1"` from `apps/web/package.json`, run `bun install`, and confirm `bun.lock` no longer contains the package. Update `DESIGN.md` and `PRODUCT.md` to describe the active destination and notification badge as CSS/static surfaces, removing claims that they use liquid-gooey. Do not change the prohibition on liquid glass.

- [ ] **Step 4: Verify no source or lockfile references remain**

```bash
rg -n "liquid-gooey|<Liquid|Liquid\.Item" --glob '!node_modules/**' --glob '!graphify-out/**' .
```

Expected: no matches. Re-run the build inventory from Task 1 and confirm the package is absent from every client chunk.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/app-shell/shell-liquid-nav.tsx apps/web/src/features/app-shell/shell-liquid-badge.tsx apps/web/package.json bun.lock DESIGN.md PRODUCT.md
git commit -m "$(cat <<'EOF'
perf(web): remove liquid-gooey from shell chrome

EOF
)"
```

---

### Task 9: Idle-mount WorkspaceAgentHost

**Files:**
- Modify: `apps/web/src/features/app-shell/app-shell.tsx`

**Interfaces:**
- Consumes: `scheduleIdle`, existing `WorkspaceAgentHost` lazy boundary
- Produces: assistant-ui chunk is not requested until idle (rendering `<WorkspaceAgentHost />` starts the lazy import)

- [ ] **Step 1: Gate the host**

```tsx
import { useEffect, useState, type ReactNode } from "react";
import { scheduleIdle } from "@/lib/schedule-idle";
```

Inside `AppShell`:

```tsx
  const [agentReady, setAgentReady] = useState(false);
  useEffect(() => scheduleIdle(() => setAgentReady(true)), []);
```

Replace `<WorkspaceAgentHost />` with `{agentReady ? <WorkspaceAgentHost /> : null}`.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/app-shell/app-shell.tsx
git commit -m "$(cat <<'EOF'
perf(web): delay Orch dock chunk until the shell is idle

EOF
)"
```

---

### Task 10: Parallel boot chrome when the preferred team is known

**Files:**
- Modify: `apps/web/src/lib/boot-chrome.ts:58-81`
- Modify: `apps/web/src/lib/boot-chrome.test.ts`
- Modify: `apps/web/src/lib/authenticated-boot.ts`

**Interfaces:**
- Consumes: existing `BootChromeClient`, `resolveBootTeamId`, `settleOrNull`, `NOTIFICATION_LIST_LIMIT`, `orpc.billing.state.queryOptions`
- Produces: same `BootShellChrome` shape; speculative team-scoped RPCs discarded if resolved id differs; billing.state in the query cache before the Agency page mounts

- [ ] **Step 1: Write the failing test**

Add inside `describe("loadBootShellChrome"`:

```ts
  test("starts team-scoped chrome with team.list when a preferred team is set", async () => {
    let listReleased = false;
    let unreadStartedBeforeListResolved = false;
    const client = fakeChromeClient({
      teams: async () => {
        await new Promise((resolve) => setTimeout(resolve, 40));
        listReleased = true;
        return teams;
      },
      unreadCount: async ({ teamId }) => {
        unreadStartedBeforeListResolved = !listReleased;
        expect(teamId).toBe("team-b");
        return unread;
      },
    });

    const chrome = await loadBootShellChrome(client, "team-b");
    expect(chrome.teamId).toBe("team-b");
    expect(unreadStartedBeforeListResolved).toBe(true);
  });

  test("discards speculative chrome when preferred team is not in the list", async () => {
    const requested: string[] = [];
    const client = fakeChromeClient({
      unreadCount: async ({ teamId }) => {
        requested.push(teamId);
        return unread;
      },
    });

    const chrome = await loadBootShellChrome(client, "team-missing");
    expect(chrome.teamId).toBe("team-a");
    expect(chrome.unread).toEqual(unread);
    expect(requested.includes("team-a")).toBe(true);
  });
```

- [ ] **Step 2: Run tests — the first new test should fail**

```bash
bun test apps/web/src/lib/boot-chrome.test.ts
```

Expected: FAIL `unreadStartedBeforeListResolved` is false (today waits on `team.list`).

- [ ] **Step 3: Implement parallel path**

Replace `loadBootShellChrome` body with:

```ts
export async function loadBootShellChrome(
  client: BootChromeClient,
  preferredTeamId?: string | null,
): Promise<BootShellChrome> {
  const speculativeTeamId = preferredTeamId || undefined;

  if (!speculativeTeamId) {
    let teams: BootTeams;
    try {
      teams = await client.team.list();
    } catch {
      return emptyChrome();
    }
    const teamId = resolveBootTeamId(teams.items, preferredTeamId);
    if (!teamId) {
      return { ...emptyChrome(), teams };
    }
    const [unread, notifications, timer] = await Promise.all([
      settleOrNull(client.notifications.unreadCount({ teamId })),
      settleOrNull(client.notifications.list({ teamId, limit: NOTIFICATION_LIST_LIMIT })),
      settleOrNull(client.agencyOps.timer.getActive({ teamId })),
    ]);
    return { teams, teamId, unread, notifications, timer };
  }

  const [teamsResult, unreadGuess, notificationsGuess, timerGuess] = await Promise.all([
    settleOrNull(client.team.list()),
    settleOrNull(client.notifications.unreadCount({ teamId: speculativeTeamId })),
    settleOrNull(
      client.notifications.list({ teamId: speculativeTeamId, limit: NOTIFICATION_LIST_LIMIT }),
    ),
    settleOrNull(client.agencyOps.timer.getActive({ teamId: speculativeTeamId })),
  ]);

  if (teamsResult == null) {
    return emptyChrome();
  }

  const teamId = resolveBootTeamId(teamsResult.items, preferredTeamId);
  if (!teamId) {
    return { ...emptyChrome(), teams: teamsResult };
  }

  if (teamId === speculativeTeamId) {
    return {
      teams: teamsResult,
      teamId,
      unread: unreadGuess,
      notifications: notificationsGuess,
      timer: timerGuess,
    };
  }

  const [unread, notifications, timer] = await Promise.all([
    settleOrNull(client.notifications.unreadCount({ teamId })),
    settleOrNull(client.notifications.list({ teamId, limit: NOTIFICATION_LIST_LIMIT })),
    settleOrNull(client.agencyOps.timer.getActive({ teamId })),
  ]);
  return { teams: teamsResult, teamId, unread, notifications, timer };
}
```

Do not change `seedBootChromeQueries`. `_authenticated` reads `useTeamStore.getState().selectedTeamId` in the loader — that is `""` on SSR (Zustand persist is client-only). The parallel path helps client navigations after a team is selected, not the first SSR document.

- [ ] **Step 4: Re-run tests**

```bash
bun test apps/web/src/lib/boot-chrome.test.ts
```

Expected: PASS, including existing clobber/null tests.

- [ ] **Step 5: Seed `billing.state` in the authenticated loader**

Agency `useAgencyBootGate` waits on `billingQuery.isPending`. Chrome never seeds it. In `loadAuthenticatedShell`, after `fetchSession` resolves with a user, prefetch billing in parallel with remaining chrome — do not wait for chrome before starting billing.

```ts
  const sessionPromise = input.fetchSession();
  const chromePromise = input.fetchChrome(preferredTeamId);
  const session = await sessionPromise;
  const billingPromise = session
    ? input.queryClient.prefetchQuery({
        ...orpc.billing.state.queryOptions(),
        staleTime: 5 * 60 * 1000,
      })
    : Promise.resolve();
  const [chrome] = await Promise.all([chromePromise, billingPromise]);
```

Keep the existing signed-out redirect before seeding chrome. Import `orpc` from `@/lib/orpc`. Swallow billing prefetch errors (gate will refetch).

If this forces a larger rewrite of `loadAuthenticatedShell`, keep session+chrome `Promise.all` as today and `await prefetchQuery` only after a successful session — still better than the page hitting billing cold. Prefer the overlap version.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/boot-chrome.ts apps/web/src/lib/boot-chrome.test.ts apps/web/src/lib/authenticated-boot.ts
git commit -m "$(cat <<'EOF'
perf(web): overlap shell chrome RPCs with team.list

EOF
)"
```

---

### Task 11: Flatten dashboard boot; prefetch Money settings

**Files:**
- Modify: `apps/web/src/features/shared/agency-segment-boot.ts`
- Modify: `apps/web/src/features/dashboard/hooks/use-agency-dashboard-surface.ts`
- Modify: `apps/web/src/pages/agency-dashboard-page.tsx`
- Modify: `apps/web/src/features/shared/agency-segment-filters.tsx` (expose tenure-policy pending)

**Interfaces:**
- Consumes: existing `ensureSyncedQuery`, `orpc.agencyOps.tenure.policy.get`, `orpc.agencyOps.reports.dashboard`, `orpc.agencyOps.moneySettings.get`
- Produces: dashboard policy and default-range dashboard query in one `Promise.all`; page query disabled until tenure policy is settled; Money pane warms settings

- [ ] **Step 1: Extract the calendar-month fallback already in `resolveDashboardRange`**

Keep `resolveDashboardRange` for tenure. Add beside it:

```ts
function calendarMonthDashboardRange(now = new Date()) {
  const endIso = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
  ).toISOString();
  return {
    from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString(),
    to: endIso,
  };
}
```

Match the existing fallback in `resolveDashboardRange` (last 30 days vs calendar month). **Do not invent a new default.** Copy the exact `from`/`to` currently returned when preset is not tenure (the `now - 29 days` block at lines 78–83). Name the helper `defaultDashboardRange` and move that block into it so both the parallel prefetch and the tenure fallback share one function.

- [ ] **Step 2: Parallel dashboard boot**

Replace `case "dashboard"` with:

```ts
    case "dashboard": {
      const defaultRange = defaultDashboardRange();
      const [policyData] = await Promise.all([
        ensureSyncedQuery(
          queryClient,
          orpc.agencyOps.tenure.policy.get.queryOptions({ input: { teamId } }),
          "cold",
        ),
        ensureSyncedQuery(
          queryClient,
          orpc.agencyOps.projects.list.queryOptions({ input: { teamId } }),
          "cold",
        ),
        ensureSyncedQuery(
          queryClient,
          orpc.agencyOps.reports.dashboard.queryOptions({
            input: { teamId, from: defaultRange.from, to: defaultRange.to },
          }),
          "cold",
        ),
      ]);
      const range = await resolveDashboardRange(queryClient, teamId);
      if (range.from !== defaultRange.from || range.to !== defaultRange.to) {
        await ensureSyncedQuery(
          queryClient,
          orpc.agencyOps.reports.dashboard.queryOptions({
            input: { teamId, from: range.from, to: range.to },
          }),
          "cold",
        );
      }
      void policyData;
      break;
    }
```

`resolveDashboardRange` already `ensureQueryData`s policy — the second call must hit cache (same query key).

- [ ] **Step 3: Money pane**

Replace `case "money": break` with:

```ts
    case "money":
      await ensureSyncedQuery(
        queryClient,
        orpc.agencyOps.moneySettings.get.queryOptions({ input: { teamId } }),
        "cold",
      );
      break;
```

Do not prefetch period scoreboard/bills here — they need the page period.

- [ ] **Step 4: Do not fetch last30 while tenure policy is still pending**

`resolveDefaultDashboardRangePreset(null)` is `"last30"`. `AgencyPage` still mounts `<Outlet />` under the boot shimmer, so the dashboard `useQuery` fires last30, then fires again when policy says tenure.

In `use-agency-time-range-filters.ts` return object, add:

```ts
isTenurePolicyPending: tenurePolicyQuery.isPending,
```

Expose it on both `kind: "timeRange"` providers in `agency-segment-filters.tsx` (`DashboardFiltersRoot` ~line 101 and the reports root ~line 310):

```ts
type AgencySegmentSurfaceFilters =
  | { kind: "timeRange"; applied: AgencyTimeRangeFilters; isTenurePolicyPending: boolean }
  | { kind: "list"; applied: AgencyListFiltersApplied }
  | { kind: "none"; applied: null };
```

```tsx
value={{
  kind: "timeRange",
  applied: timeRange.applied,
  isTenurePolicyPending: timeRange.isTenurePolicyPending,
}}
```

In `use-agency-dashboard-surface.ts` add `policyReady: boolean` to props:

```ts
  const dashboardQuery = useQuery({
    ...orpc.agencyOps.reports.dashboard.queryOptions({
      input: { teamId, from: range.from, to: range.to, /* existing filter ids */ },
    }),
    enabled: Boolean(teamId) && policyReady,
    placeholderData: keepPreviousData,
  });
```

In `agency-dashboard-page.tsx`:

```tsx
    <AgencyDashboardSurface
      teamId={teamId}
      filters={filters.applied}
      policyReady={!filters.isTenurePolicyPending}
      ...
    />
```

Do not change `resolveDefaultDashboardRangePreset` itself.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/shared/agency-segment-boot.ts apps/web/src/features/shared/use-agency-time-range-filters.ts apps/web/src/features/shared/agency-segment-filters.tsx apps/web/src/features/dashboard/hooks/use-agency-dashboard-surface.ts apps/web/src/pages/agency-dashboard-page.tsx
git commit -m "$(cat <<'EOF'
perf(web): overlap dashboard range queries and warm Money settings

EOF
)"
```

---

### Task 12: Cut Sentry traces and drop unused framer-motion

**Files:**
- Modify: `apps/web/src/lib/sentry.ts:47`
- Modify: `apps/web/package.json`

**Interfaces:**
- Consumes: existing `Sentry.init`
- Produces: production `tracesSampleRate: 0.1`; no `framer-motion` dependency

- [ ] **Step 1: Change sample rate**

```ts
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
```

- [ ] **Step 2: Confirm no `from "framer-motion"` imports**

```bash
rg "from [\"']framer-motion" apps/web/src
```

Expected: no matches. Then remove `"framer-motion": "^12.42.2"` from `apps/web/package.json` and `bun install`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/sentry.ts apps/web/package.json bun.lock
git commit -m "$(cat <<'EOF'
perf(web): sample Sentry traces and drop unused framer-motion

EOF
)"
```

---

### Task 13: Point the perf harness at absolute Agency URLs

**Files:**
- Modify: `apps/web/perf/routes.mjs`
- Modify: `apps/web/perf/global-setup.mjs`

**Interfaces:**
- Consumes: current `ALL_ROUTES` entries; Better Auth session cookies
- Produces: paths that match TanStack file routes; auth setup that does not click a removed email/password form

- [ ] **Step 1: Replace stale query-param paths and drop dead routes**

In `ALL_ROUTES`:

```js
  {
    id: "agency-work",
    path: "/agency",
    tier: "agency",
    auth: true,
    ci: true,
    label: "Agency / Tracker",
  },
  {
    id: "agency-dashboard",
    path: "/agency/dashboard",
    tier: "agency",
    auth: true,
    ci: false,
    label: "Agency / Dashboard",
  },
  {
    id: "agency-clients",
    path: "/agency/clients",
    tier: "agency",
    auth: true,
    ci: false,
    label: "Agency / Clients",
  },
  {
    id: "agency-projects",
    path: "/agency/projects",
    tier: "agency",
    auth: true,
    ci: true,
    label: "Agency / Projects",
  },
  {
    id: "agency-reports",
    path: "/agency/reports",
    tier: "agency",
    auth: true,
    ci: true,
    label: "Agency / Reports",
  },
  {
    id: "agency-management",
    path: "/agency/management/resourcing",
    tier: "agency",
    auth: true,
    ci: false,
    label: "Agency / Management",
  },
```

Delete the `marketplace` and `billing` entries. There is no `/marketplace` or `/billing` route module. Keep `billing-success` at `/billing/success` (`ci: false`). Keep landing/login/canvas.

- [ ] **Step 2: Stop clicking the removed email form**

Product login is Google-only. Better Auth also lists `/sign-in/email` in `disabledPaths`, so POSTing that endpoint will fail. Replace the Playwright clicks in `runGlobalSetup` with:

```js
  const existing = process.env.PERF_STORAGE_STATE;
  if (existing) {
    return existing;
  }

  try {
    await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
    const statePath = resolve(perfDir, ".auth", "storage-state.json");
    await context.storageState({ path: statePath });
    // Unauthenticated marketing routes still run. Auth routes need a prior Google session.
    if (process.env.PERF_REQUIRE_AUTH === "1") {
      throw new Error(
        "Login is Google-only and /api/auth/sign-in/email is disabled. Pass PERF_STORAGE_STATE to a Playwright storageState JSON captured after a real sign-in.",
      );
    }
    return statePath;
  } finally {
    await browser.close();
  }
```

Do not re-enable email/password in `packages/auth`. If `apps/web/perf/.auth/storage-state.json` already exists from a previous signed-in capture, reuse it and skip `/login`. Auth `ci: true` routes (canvas, agency) should be skipped in CI when no storage state with a session cookie exists — set their `ci` to `false` in the same edit if `PERF_STORAGE_STATE` is not part of CI secrets yet. Marketing/login stay `ci: true`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/perf/routes.mjs apps/web/perf/global-setup.mjs
git commit -m "$(cat <<'EOF'
chore(web): score Agency perf routes on absolute paths

EOF
)"
```

---

### Task 14: Gates and visual check

**Files:** none unless a gate fails

- [ ] **Step 1: Repo gates**

```bash
bun run check
bun run check-types
bun run check:conventions
bun test apps/web/src/lib/schedule-idle.test.ts apps/web/src/lib/boot-chrome.test.ts
```

Expected: all pass.

- [ ] **Step 2: Rebuild and compare gzip list to Task 1**

Same Python snippets. Marketing first JS should shrink; FibreArc and Scanner should not sit in the entry chunk, and `liquid-gooey` should be absent from all client chunks.

- [ ] **Step 3: Browser**

On desktop and a 390px viewport: `/` heading paints before WebGL; `/login` card paints before Scanner; `/agency` rail selection is a solid accent then the blob; grain only on the shell; Tracker still works; Orch dock appears after a beat.

- [ ] **Step 4: Optional local `bun run perf`** if Postgres + Chromium are available. Do not treat a failed S-grade budget as a task failure if the new report is still better than `baseline.json`; attach the report and leave budget tightening to a follow-up.

---

## Spec coverage

| Spec item | Task |
|-----------|------|
| Measure first-load JS | 1, 5, 14 |
| Unused fontsource + LCP font 500 + dead hero-reveal | 2 |
| `scheduleIdle` | 3, 6, 7, 9 |
| Grain off marketing | 4 |
| Prove Start splitter (already on; no flag) | 5 |
| FibreArc / Scanner idle + no SSR WebGL | 6, 7 |
| Login without AuthProvider live graph | 7 |
| Remove liquid-gooey | 8 |
| Agent dock idle | 9 |
| Chrome RPC overlap + billing.state seed | 10 |
| Dashboard / Money boot + no last30-during-policy | 11 |
| Sentry 0.1 + drop framer-motion | 12 |
| Perf absolute URLs + Google-only auth setup | 13 |
| Preserve ssr:false, prerender set, seedIfNotNewer | 10, global constraints |
| No FirstPaintPolicy module | all tasks |

## Placeholder scan

No TBD/TODO-without-code steps. Boot chrome discard path is specified. Money prefetch is `moneySettings.get` only. Task 5 commits nothing.

## Type consistency

- `scheduleIdle(callback: () => void): () => void`
- `loadBootShellChrome(client, preferredTeamId?)` return type unchanged (`BootShellChrome`)
- Start already splits via `?tsr-split=`; do not add `router.experimental.enableCodeSplitting`
- `AgencySegmentSurfaceFilters` timeRange kind gains `isTenurePolicyPending: boolean`
- `UseAgencyDashboardSurfaceProps` gains `policyReady: boolean`
