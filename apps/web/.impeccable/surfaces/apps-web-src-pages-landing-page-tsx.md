---
version: 1
slug: "apps-web-src-pages-landing-page-tsx"
primary_target: "apps/web/src/pages/landing-page.tsx"
related_targets:
  [
    "apps/web/src/components/marketing/landing-hero.tsx",
    "apps/web/src/components/marketing/landing-auth-actions.tsx",
    "apps/web/src/components/marketing/marketing-brand-lockup.tsx",
  ]
---

# `/` landing — Persuade

**Mode:** Persuade  
**Approved comp:** None. The shipped hero implementation and `DESIGN.md` are the source of truth for this surface.

**Audience / job:** Agency operator or knowledge worker evaluating Orch. Understand Canvas + Agency OS + visible agent, then create an account. Returning users sign in.

**Action:** Continue and Sign in both open `/login`, the unified Google auth screen for new and returning users. Authenticated: Open workspace → `/canvas`.

**Proof:** The hero states the product promise directly; detailed product proof belongs inside the authenticated workspace. No invented logos or metrics.

**Direction:** Single Orch hero. A compact brand lockup and auth action frame a centered manifesto and two auth actions over one restrained WebThreads atmosphere. The root route ends at the hero: no feature index, pricing block, footer, or in-page hash navigation.

**Memorable moment:** The quiet WebThreads field gives the hero depth while the monochrome CTA keeps the next action obvious.

**Constraints:** Established DESIGN.md world. Use Orch shadcn tokens, Poppins, monochrome CTAs, and Operator Violet only as a restrained atmosphere accent. Motion is limited to the WebThreads field and must degrade under `prefers-reduced-motion`. The shared `--orch-grain-image` supplies static 256px pixel noise to painted surfaces; do not add a second route-specific grain layer. No copied reference styling, icon-card grid, gradient text, liquid glass, emerald spotlight, Magnet, pricing markup, or footer on `/`.

## Comp inventory

| Region                    | Medium                                                 |
| ------------------------- | ------------------------------------------------------ |
| Hero atmosphere           | WebThreads, with shared surface-owned grain texture   |
| Lockup                    | Existing MarketingBrandLockup                          |
| Headline / sub            | Semantic HTML; Poppins already loaded                  |
| Primary / secondary CTAs  | shadcn Button + Link (not raster)                      |

No raster production entries. Do not trace invented comp nav or glass.

**Unresolved:** None for this pass.
