---
name: Orch
description: A spatial knowledge workspace with an embedded agent. Quiet instrument, photographic depth. Dual register — dark cinematic marketing, light precise product.
colors:
  operator-violet: "oklch(0.55 0.22 264.53)"
  operator-violet-dark: "oklch(0.58 0.21 260.84)"
  orchid-purple-brand: "#8b8be8"
  operator-violet-soft: "oklch(0.94 0.04 264)"
  ink: "oklch(0 0 0)"
  ink-muted: "oklch(0.44 0 0)"
  paper: "oklch(0.99 0 0)"
  paper-pure: "oklch(1 0 0)"
  surface-elevated: "oklch(0.94 0 0)"
  surface-muted: "oklch(0.97 0 0)"
  hairline: "oklch(0.92 0 0)"
  input-fill: "oklch(0.94 0 0)"
  ink-inverted: "oklch(1 0 0)"
  paper-inverted: "oklch(0 0 0)"
  surface-inverted: "oklch(0.14 0 0)"
  surface-inverted-elevated: "oklch(0.25 0 0)"
  surface-inverted-muted: "oklch(0.23 0 0)"
  hairline-inverted: "oklch(0.26 0 0)"
  ink-muted-inverted: "oklch(0.72 0 0)"
  state-success: "oklch(0.55 0.15 150)"
  state-success-dark: "oklch(0.72 0.17 145)"
  state-warning: "oklch(0.56 0.15 55)"
  state-warning-dark: "oklch(0.79 0.15 70)"
  state-error: "oklch(0.63 0.19 23.03)"
  state-error-dark: "oklch(0.69 0.2 23.91)"
  state-info: "oklch(0.55 0.21 255)"
  state-info-dark: "oklch(0.68 0.16 252)"
typography:
  display:
    fontFamily: "Poppins, IBM Plex Sans Arabic, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 7vw, 5.5rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Poppins, IBM Plex Sans Arabic, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 4vw, 3rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Poppins, IBM Plex Sans Arabic, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Poppins, IBM Plex Sans Arabic, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  body-lg:
    fontFamily: "Poppins, IBM Plex Sans Arabic, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Poppins, IBM Plex Sans Arabic, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.14em"
  mono:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  none: "0"
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  "2xl": "14.4px"
  "4xl": "20.8px"
  dense: "8px"
  control: "14.4px"
  shell: "16px"
  full: "9999px"
spacing:
  base: "4px"
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  section: "96px"
  section-lg: "144px"
  rail-collapsed: "3.25rem"
  rail-expanded: "15.5rem"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper-pure}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "32px"
  button-primary-hover:
    backgroundColor: "color-mix(in oklab, {colors.ink} 80%, transparent)"
    textColor: "{colors.paper-pure}"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  button-outline-hover:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.ink}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  button-ghost-hover:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.ink}"
  badge:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.control}"
    padding: "2px 8px"
    height: "20px"
  input:
    backgroundColor: "color-mix(in oklab, {colors.input-fill} 50%, transparent)"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "4px 10px"
    height: "32px"
  input-focus:
    backgroundColor: "color-mix(in oklab, {colors.input-fill} 50%, transparent)"
    textColor: "{colors.ink}"
  card:
    backgroundColor: "{colors.paper-pure}"
    textColor: "{colors.ink}"
    rounded: "{rounded.4xl}"
    padding: "20px"
  eyebrow:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    typography: "{typography.label}"
---

# Design System: Orch

## Overview

**Creative North Star: "Quiet instrument, photographic depth"**

Orch is a dual-register system. Marketing is atmospheric and spare: one hero, large type, generous air, and a restrained WebThreads field. Product uses one dark cool-zinc family with Orchid Purple from the logo (`#8B8BE8`) as its primary accent. Surfaces stay quiet; violet carries actions, focus, selection, and key data signals.

Shipped tokens live in `apps/web/src/index.css` (Vercel/tweakcn shadcn theme). Neutrals are achromatic zinc steps; the brand accent is Orchid Purple (`chart-2`). Depth comes from tonal steps and hairlines, not from shadow-on-every-card. Inspiration (synthesize, don't copy): Apple whitespace, Linear surface ladder, Vercel hero atmosphere only.

The system rejects category defaults. No purple gradient heroes, no animated orbs as brand, no gradient text, no glassmorphism-as-default, no AI neon. The agent is a tool. The canvas is the product.

**Key Characteristics:**

- Restrained color: dark zinc neutrals (`--background` / `--secondary` / `--muted` / `--border`) with Orchid Purple (`--primary`, `--chart-2`) as the brand accent. Keep violet concentrated on actions, focus, selection, heatmaps, soft glows, and the canvas minimap.
- Typographic hierarchy carries the system. `--font-sans`: Poppins for Latin, IBM Plex Sans Arabic for Arabic glyphs; IBM Plex Mono for tool traces and metrics.
- Surface ladder, not flat paper. Background → card → secondary/muted → border. Soft shadows only for true float (dialogs, popovers) via the theme shadow scale.
- Radii from `--radius` (`0.5rem`): controls use `rounded-2xl` (~14px); cards/dialogs use `radius-4xl` capped at 24px; dense tables pin `radius-dense` at 8px.
- Marketing stays focused: the root route is a single hero with one ambient WebThreads field and direct auth actions; product stays quiet. `prefers-reduced-motion` is mandatory.
- Global grain is ambient texture: every route receives a static 256px pixel-noise tile at low opacity, painted into background and shell surfaces through a shared CSS image token. It never sits above content.

## Colors

Dark cool-zinc neutrals with one violet accent. Runtime source: `:root` in `apps/web/src/index.css`.

### Primary

- **Orchid Purple** (`#8B8BE8` as `--primary` / `--chart-2`): The logo-derived brand accent. Actions, focus, selection, heatmaps, soft glows, canvas minimap, and marketing threads.

### Neutral

- **Ink** (`oklch(1 0 0)` / `--foreground`): Body text and headings.
- **Ink Muted** (`oklch(0.72 0 0)` / `--muted-foreground`): Secondary text and placeholders.
- **Paper** (`oklch(0 0 0)` / `--background`): Default page ground.
- **Paper Pure** (`oklch(0.14 0 0)` / `--card`): Cards and raised surfaces.
- **Surface Elevated** (`oklch(0.25 0 0)` / `--secondary`, `--accent`): Chrome fills, ghost hover, elevated wells.
- **Surface Muted** (`oklch(0.23 0 0)` / `--muted`): Soft recessed fills.
- **Hairline** (`oklch(0.26 0 0)` / `--border`): Default separators; inputs use `--input` (`oklch(0.32 0 0)`).

### Marketing surfaces

- **Paper Inverted** (`oklch(0 0 0)` / `--background`): Page / marketing hero ground.
- **Surface Inverted** (`oklch(0.14 0 0)` / `--card`): Raised dark panels.
- **Surface Inverted Elevated** (`oklch(0.25 0 0)` / `--secondary`): Higher dark fills; muted at `oklch(0.23 0 0)`.
- **Ink Inverted** / **Hairline Inverted**: `--foreground` / `--border` on dark (`oklch(1 0 0)` / `oklch(0.26 0 0)`).

### State

- **Success** (`oklch(0.72 0.17 145)`): Confirmations, healthy status. Semantic only — not the brand accent.
- **Warning** (`oklch(0.79 0.15 70)`): Caution.
- **Error** (`oklch(0.69 0.2 23.91)`): Failures, destructive (`--destructive`).
- **Info** (`oklch(0.68 0.16 252)`): Neutral system messages.

### Named Rules

**The One Voice Rule.** Orchid Purple is the action and focus voice. Keep it concentrated so the dark zinc surfaces remain calm.

**The Dark Ground Rule.** Page ground is black zinc (`oklch(0 0 0)`), with depth coming from tonal surface steps rather than wallpaper.

**The Tinted Accent Rule.** Neutrals stay achromatic zinc; chroma belongs to Orchid Purple and semantic state colors only.

**The Marketing Atmosphere Exception.** One restrained WebThreads field may sit behind the landing hero. It is not a product pattern or a reason to add animated wallpaper elsewhere.

## Typography

**English (Latin):** Poppins  
**Arabic:** IBM Plex Sans Arabic  
**Stack:** `"Poppins", "IBM Plex Sans Arabic", ui-sans-serif, system-ui, sans-serif` (`--font-sans`)  
**Mono:** IBM Plex Mono (`--font-mono`)

**Character:** Optical, bilingual, instrument-grade. Hierarchy from weight and size within one sans stack — never a second display face for product chrome.

### Hierarchy

- **Display** (`600`, `clamp(2.75rem, 7vw, 5.5rem)`, LH `1.05`, tracking `-0.03em`): Marketing heroes. Floor tracking ≥ `-0.04em`.
- **Headline** (`600`, `clamp(1.875rem, 4vw, 3rem)`, LH `1.1`, tracking `-0.025em`): Section openings, product page titles.
- **Title** (`600`, `1.125rem`, LH `1.3`): Panel and card titles.
- **Body** / **Body Large**: Reading text; cap prose at 65–75ch.
- **Label** (`600`, `0.6875rem`, tracking `0.14em`, uppercase): Sparse use. One deliberate kicker per page max on marketing; never an eyebrow on every section.
- **Mono** (`500`, `0.8125rem`): Tool calls, latencies, IDs, code.

### Named Rules

**The Bilingual Stack Rule.** Poppins covers Latin; IBM Plex Sans Arabic covers Arabic via unicode-range fallback. Hierarchy from weight and size within that stack.

**The Mono For Truth Rule.** Mono for what the system reports, never running prose or headings.

**The Eyebrow Restraint Rule.** Uppercase labels are rare. Identical section eyebrows across a page are banned.

## Elevation & Depth

Depth is a surface ladder first, hairlines second, shadow last. Product chrome uses opaque sidebar surfaces with a 1px hairline ring — not glass.

### Surface ladder (light)

1. Paper (`--background`)
2. Paper Pure (`--card` / `--popover`)
3. Surface Elevated (`--secondary` / `--accent`)
4. Surface Muted (`--muted`) + Hairline (`--border`)

### Surface ladder (dark / marketing)

1. Paper Inverted (`--background`)
2. Surface Inverted (`--card`)
3. Popover / elevated (`--popover`, `--secondary`, `--accent`)
4. Hairline Inverted (`--border`)

### Shadow vocabulary

Theme scale in `index.css` (HSL black, low opacity):

- **2xs / xs:** `0px 1px 2px` at ~9% — micro resting edge.
- **sm / default / md:** stacked 1–2px blurs at ~18% — quiet lift.
- **lg / xl:** taller offsets for dropdowns and sheets.
- **2xl:** stronger single blur for rare emphasis.
- **focus-ring:** `ring-3` at `ring/30` on controls — neutral `--ring`, not violet-by-default.
- **chrome-hairline:** `box-shadow: 0 0 0 1px var(--color-sidebar-border)` on app-shell chrome (not a drop shadow).

### Named Rules

**The Hairline First Rule.** Separation is hairline before tonal step before shadow.

**The No Ghost Cards Rule.** Never pair a `1px` border with a wide soft drop shadow as decoration. Pick one.

**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear for true float (dialogs, popovers, toasts) or brief state feedback.

### Ambient grain

`GlobalGrain` generates one static 256px pixel-noise tile and publishes it as `--orch-grain-image`. Background, card, sidebar, top-bar, drawer, and landing surfaces consume that image directly with a low-alpha tile, so grain stays beneath text and controls instead of becoming a fixed overlay. Keep it subtle so dialogs, canvas content, and dense tables remain readable.

## Components

Controls share `rounded-2xl` (~14.4px from `--radius`), medium weight, and monochrome primary fill. Philosophy: refined and restrained — instrument chrome, not marketing chrome.

### Buttons

- **Shape:** Soft squircle (`rounded-2xl`, ~14px) — not full pill on default shadcn buttons.
- **Primary:** `--primary` / `--primary-foreground` (Orchid Purple / deep ink), height `32px` default, `hover:bg-primary/80`.
- **Outline / Ghost / Secondary:** Hairline or transparent; hover fills `--muted` or secondary mix.
- **Focus:** `ring-3` + `ring-ring/30`; destructive variants use destructive ring tokens.

### Badges / Chips

- **Style:** `rounded-2xl`, height `20px`, `px-2`, medium `text-xs`.
- **State:** Default monochrome; semantic success/warning/destructive use tinted fills (`bg-success/10`, etc.). Filter pills follow the same quiet treatment.

### Cards / Containers

- **Corner Style:** `rounded-[min(var(--radius-4xl),24px)]` (~21px, cap 24px).
- **Background:** `--card` with `ring-1 ring-foreground/5` (dark: `/10`).
- **Shadow Strategy:** `shadow-sm` optional; prefer ring/hairline at rest.
- **Border:** Prefer ring over heavy border; no nested cards.
- **Internal Padding:** `--card-spacing` (~20px default / 16px `sm`).

### Inputs / Fields

- **Style:** Height `32px`, `rounded-2xl`, `bg-input/50`, transparent border until focus.
- **Focus:** Border shifts to `--ring` + neutral `ring-3` / `ring-ring/30` — subtle, not a heavy violet glow.
- **Error:** `aria-invalid` → destructive border + ring.

### Navigation

- **Marketing:** The root landing is one full-viewport hero with a compact brand lockup and auth action. It has no feature index, pricing block, or footer. Legal pages may retain the centered marketing footer. No sticky chrome by default.
- **Product:** Connected left rail + top context bar (`app-shell`). Active: Orchid Purple text + soft tint (`bg-sidebar-primary/10` or chart-2 mixes). Nested routes use a quiet 1px thread line — never a side-stripe. Rail collapsed `3.25rem` / expanded `15.5rem`.

### Authentication

Auth uses one screen for both new and returning users. A compact card hangs from a static lanyard using neutral `secondary`, `muted`, `background`, and `border` tokens over Scanner. Use the shared Card and Button components. The remembered-account action sends that email as Google `loginHint`; Continue with Google opens account selection without a hint. Better Auth creates or reuses the account through the same OAuth callback. There is no sign-up mode or public email/password endpoint. A signed HttpOnly cookie on the API host remembers the last successful Google account; the uncached `/api/auth/remembered-account` endpoint supplies the optional account row without exposing session credentials.

### Tool Trace (signature)

Label-scale tool name in mono, violet running indicator while live, hairline separator, mono body for args/results. Selectable. No badge soup.

### Marketing motion (register exception)

Allowed on marketing only, sparingly (≤3 animated pieces per page): the WebThreads hero field, a headline reveal, and a purposeful CTA response. The current root landing uses only the WebThreads field; the global grain is static. All motion degrades under `prefers-reduced-motion`. Product motion stays to shell rail easing (`--motion-ease-rail`) and short state transitions (`120–220ms`).

## Do's and Don'ts

### Do:

- **Do** use Orchid Purple (`--primary` / `--chart-2` / `#8B8BE8`) for actions, selection, heatmaps, soft glows, and chrome accents.
- **Do** walk the surface ladder (background → card → secondary/muted → border) before reaching for shadow.
- **Do** use Poppins + IBM Plex Sans Arabic (`--font-sans`) and IBM Plex Mono for system-reported truth.
- **Do** keep control radii on the `--radius` scale (`rounded-2xl` controls, `radius-4xl` cards); use full pills only for intentionally circular chrome (e.g. mobile nav trigger).
- **Do** put product nav in the rail/top-bar; make tool traces selectable and plain-prose-shaped.
- **Do** keep the root landing to one clear hero action and let the surface-owned grain remain a quiet background texture.
- **Do** respect `prefers-reduced-motion` for shell, marketing, and feedback animations.

### Don't:

- **Don't** invent a new palette — no Operator Cobalt revival, no purple-on-white SaaS gradients, no warm cream paper.
- **Don't** flood product UI with violet wallpaper or gradient text.
- **Don't** use liquid glass / `ui-liquid-glass-*` for overlays or Canvas chrome; use opaque shadcn surfaces + hairlines.
- **Don't** wrap everything in a card; nested cards are always wrong.
- **Don't** add a second grain/noise overlay to an individual route; use the shared `--orch-grain-image` surface token.
- **Don't** put an uppercase eyebrow on every section or orchestrate entrance sequences in product surfaces.
- **Don't** use side-stripe active indicators — use text + soft tint, or the quiet thread line for nested routes.
- **Don't** use em dashes in copy or UI text.
