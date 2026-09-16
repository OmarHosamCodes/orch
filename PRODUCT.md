# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Knowledge workers — researchers, analysts, PMs, founders — managing complex, interconnected information across projects. They use Orch during focused work sessions on desktop, often for hours at a time. Their job to be done is to externalize thinking onto a spatial canvas, structure it into nodes and blocks, and collaborate with an AI agent that can read and mutate the workspace alongside them.

The Canvas surface is for spatial knowledge work — the user is exploring, organizing, and reshaping ideas. The Agency surface is for time and operations tracking — the user is structured and execution-focused there.

## Product Purpose

Orch is a you-only Eclipse companion. Agency and Canvas are tools it drives — time and operations on Agency, spatial knowledge on Canvas — while Orch keeps working after you leave the tab, remembers you, and asks you to confirm Agency writes.

Success looks like leaving a turn mid-flight, coming back to Eclipse in a needs-you mood with a one-liner, and opening the same run — Canvas already applied, Agency still waiting for Approve.

## Positioning

Orch unifies spatial knowledge work and agency operations under one product with a you-only Eclipse companion above both surfaces. Canvas is the spatial knowledge plane; Agency is Clockify-adjacent time, reports, and management. Canvas and knowledge writes apply immediately. Agency writes stay confirm-only. Conversation becomes inspectable work, not a side chat bolted onto either surface alone.

## Operating Context

- **Canvas** (`/canvas`): MagicBento-style spatial board; workspaces are user-scoped with team-sharable nodes as the Agency bridge; node pages (`/node/:id`) are the polished block editors; board cards stay summaries.
- **Agency**: Tracker (time entries, My Tasks rail), Reports (live and created), Management (Resourcing, People, Money), member profiles, and related ops — absolute path URLs with filter/protocol search params retained.
- **Workspace agent:** Eclipse pet (~48px, corner) plus one overlay panel (Chat | Inbox | History). No Ask/Plan/Agent tags. No model picker. Durable server-owned runs. Canvas/knowledge apply immediately; Agency confirms in-thread or via inbox.
- **Authenticated shell**: Shared left sidebar rail plus connected top bar for Canvas and Agency.
- **Production**: Hosted on Railway (Postgres; Redis for server-side persistence/cache).

## Capabilities and Constraints

- Bun monorepo (`apps/web`, `apps/server`, shared packages); product features follow the golden-file layer pattern (Agency Time Tracking is the exemplar).
- Timer and time-entry state persist on the server (DB/Redis), survive refresh, and stay editable mid-tracking with durable saves — not browser/device storage.
- Agency Tracker/Reports aim for Clockify UI/UX and action parity unless explicitly directed otherwise; waste marks apply only to the targeted entry.
- Agent Canvas/knowledge writes apply immediately. Agency writes go through pending proposals, then human Approve/Reject.
- Browser/Vite code must not import the `@orch/agent` barrel (use `@orch/agent/types` or `@orch/agent/model-routing`); Hono server remains the API for auth, oRPC, uploads, and live WS.
- Environment access goes through `@orch/env` / web helpers — never raw `process.env` in app code.
- Canvas chrome stays off the plane; Agency and Canvas share one Eclipse companion.

## Brand Commitments

Calm, precise, premium. Three words: quiet instrument. The interface should feel like a well-made tool a serious operator trusts — Apple/Linear quiet luxury, not a flashy AI product trying to impress. Voice is direct, plain-spoken, technically precise. No exclamation marks, no marketing puffery, no "magical" or "delightful" copy. The agent speaks the same way: useful, specific, never performative.

Emotionally: confidence without strain. Users should feel in control of a powerful instrument that respects their attention. Marketing may use editorial confidence and photographic depth; the product stays quiet and dense on demand.

Brand constraints (anti-references):

- **SaaS-cream cliché.** No purple gradient heroes, hero-metric-with-sparkline cards, identical icon-and-heading card grids, or "Built for modern teams" template energy.
- **AI-product slop.** No neon glows, gradient text, sparkle-everywhere decoration, robot mascot avatars, or animated orbs. Orch is a you-only Eclipse companion — disc + bite-dot from the favicon — not a robot personality.
- **Enterprise heaviness.** No Salesforce/Jira density, no nested tabs of nested tabs, no dropdowns with 30 options, no chrome-heavy navigation that competes with the canvas.
- **Flat zinc-only UI.** No paper-thin hairline-only surfaces with zero tonal depth. Premium depth comes from a surface ladder and photographic light, not decorative drop shadows on every card.
- **Violet-as-wallpaper.** Operator Violet is the brand accent for selection and chrome, used sparingly. Primary CTAs stay monochrome. Do not flood surfaces with violet.

## Evidence on Hand

- `PRODUCT.md` — this product record (impeccable product-schema 1).
- `DESIGN.md` — incumbent design system and visual tokens for Orch.

No customer testimonials, case studies, press quotes, or fabricated metrics are on hand. Future work must not invent them.

## Product Principles

1. **The canvas is the product.** Chrome serves the spatial surface. Panels, rails, and modals get out of the way when the user is thinking on the board. Overhead that does not help that work does not ship.
2. **Show the work, not the magic.** Agent reads, fetches, and mutations stay visible as plain factual traces. Tool calls are working notes users can inspect — not performance.
3. **Speed is a feature.** Prefer real results over decorative waiting. Stream when possible; confirm durable state without flicker or silent drops.
4. **Quiet by default, dense on demand.** The default surface is calm and uncrowded. Density appears where operators earn it (tables, dense panels, tool traces) — neither decorate emptiness nor crowd dense space.
5. **Two registers within one product.** Canvas is spatial and exploratory; Agency is structured and execution-shaped. Marketing may be cinematic; the product stays light and precise. Shared language, different dialects — do not homogenize them.

## Accessibility & Inclusion

- WCAG 2.1 AA across all product surfaces. Contrast, focus visibility, keyboard navigation are non-negotiable.
- Full keyboard control of the agent rail, canvas pan/zoom, and node interactions. Spatial tools must not become unusable for keyboard-only users.
- Respect `prefers-reduced-motion` for shell destination chrome (instant snap, no filter animation), streaming animations, marketing motion (aurora, blur text, magnet), and any canvas transitions.
- Text in tool traces and agent messages must remain selectable and screen-reader-readable. Tool call summaries should make sense as plain prose, not just visual badges.
