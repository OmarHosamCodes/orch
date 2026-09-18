# First-run onboarding — delay create, three-pillar primer

> Shape + architect sketch. **Do not implement until the brief is confirmed.**
> Visitor mode: Operate. Visual world: incumbent `DESIGN.md` (quiet instrument). Seed key `b5f79dfa` assigned structure 7.

## Grounding (how)

The Create agency CTA is broken because the account already has its one Agency before the user ever taps it.

1. Better Auth `user.create.after` (`packages/auth/src/user-create-after.ts`) calls `ensurePersonalAgency`, which names `{user.name}'s agency` and `findOrCreatePersonalTeam`.
2. `_authenticated` boot (`apps/web/src/lib/authenticated-boot.ts`) calls `ensurePersonal` again whenever `teams.items.length === 0`.
3. `createTeam` (`packages/api/src/routers/team/service.ts`) forbids a second membership: `"This account already has an Agency."`
4. Team hub (`app-shell-team-hub-view.tsx`) always renders **Create agency**.
5. Invitees already have a membership, so they cannot create either.
6. Default post-login route is `/canvas`. Canvas is user-scoped; Agency routes need a team + billing snapshot.

Slice 1 made auto-create the entitlement bootstrap. Slice 3 made trial solo (invite during trial is seat checkout, not a member insert). The hub create dialog still asks “Who should join?” — that must not be the first-run last step.

Settled discovery: **delay** auto-create; **three pillars** (Canvas / Agency / Orch); **everyone once** (founders and new invitees). Existing members with a team are grandfathered complete.

---

## Shape brief

### 1. Job and audience

A first-time signed-in operator (founder creating the workspace, or an invitee joining one) lands with an account and no mental model of Orch. They need to see the three product surfaces, then take one ownership action: name the Agency, or open the Agency they were invited into. Mode is **Operate** — the tool should disappear into the task. Not a marketing carousel.

### 2. Outcome and proof

Primary action: **Create agency** (zero memberships) or **Open {agency}** (already a member). Success: first-run marked complete on the user; founders have exactly one team via `team.create` (trial billing inserted there); invitees enter that team; hub **Create agency** is hidden once `membershipCount >= 1`. Proof is live product frames of Canvas, Agency Tracker, and the Orch composer — not stock illustration. Product-specific truth: one Agency per account; leftover Canvas still works with zero teams; trial is solo.

### 3. Selected direction

**Visual authority:** inherit `DESIGN.md`. Dark product, operator-violet accent, Poppins, shadcn primitives, photographic depth. Do not replace the world.

**Seven structures (content/task, not worlds):**

1. Linear sequential slides (welcome → copy decks → form).
2. In-shell coach marks on live leftover Canvas.
3. Notion-style three-card “what will you use” chooser.
4. HyperCard stack (visible buttons, back trail).
5. Zoo / lobe map of three territories.
6. ClickUp/Dropbox Get Started checklist docked in the app.
7. **Assigned (seed `b5f79dfa`): instrument primer** — a quiet full-bleed stage; each step is a live, non-interactive snapshot of the real surface plus one operator sentence and a depth/progress mark; the last card is the only form.

**Challengers weighed (audience identification × product clarity):** HyperCard loses identification (agency operators are not HyperCard natives). Zoo map loses Operate clarity (lobe color vs instrument tokens). Assigned 7 wins. Standing category default (Linear 18-step workspace wizard) is available if you ask for it; it is not recommended.

**Sequence:** Welcome (account already done) → Canvas → Agency → Orch → Create / Open. Skip tour jumps to the last card, not out of the product. Skip create (founders only) lands leftover `/canvas` and leaves hub Create agency visible.

**Focal moment:** naming the Agency after seeing why it exists.

**Implementation consequence:** stop silent `ensurePersonal` on signup and boot; add a user `onboardingCompletedAt`; gate first-run to `/welcome`; create only through existing `createTeam`.

### 4. Scope and boundaries

- Fidelity: production first-run, four primer cards + one action card.
- Breadth: authenticated first session only. Not a redesign of Canvas, Agency, or Orch.
- Named target: `apps/web/src/routes/_authenticated/welcome.tsx` + `apps/web/src/features/first-run/`.
- Untouched: DESIGN.md, leftover Canvas node cap, Polar customer-on-signup, `createTeam` one-membership invariant, Agency paywall copy, trial-is-solo invites.
- Anti-goals: auto-create on signup; Create agency when already a member; invite step on first-run; “Pro” copy; ClickUp rainbow checklist; in-product coach marks that fight empty Agency chrome; a second create path that bypasses `createTeam`.

### 5. States and ranges

- Welcome copy: one sentence. Name field: 1–80 chars; default `{name}'s agency` (reuse `ensurePersonalAgency` naming helper as a pure function, do not call ensure).
- Primer frames: three; each one headline + one sentence.
- Loading: creating agency (labor illusion: “Opening your agency”).
- Error: name empty / `FORBIDDEN` already-has-agency (should be unreachable if hub is gated) / network.
- Invitee last card: no name field.
- Existing users with any membership: SQL backfill `onboarding_completed_at = created_at`.
- Refresh mid-tour: restart tour (step index is client-only).
- Deep link `/agency/*` with zero teams: redirect `/welcome`.
- Deep link `/agency/*` with team but first-run incomplete (invitee): `/welcome` then Open.

### 6. Interaction and layout

Distraction-free stage (no sidebar, no team hub, no global Orch dock). Desktop: photographic frame dominates; copy + primary CTA sit in a narrow operator column. Mobile: frame collapses to a still; CTA in the thumb zone. One primary button per card (`Continue` / `Create agency` / `Open {name}`). Secondary: `Skip` on primer cards only. Keyboard: Enter advances; Escape does not dump them into a broken hub. Motion: morph between cards (shared-border radius, no circular reveal); keep card radius during morph.

### 7. Constraints and open decisions (do not invent)

- Golden file: schema → `onboarding` service `(actorUserId, input)` → router `.parse()` → hook → container → view.
- Views: typed props only. No oRPC in views.
- `ensurePersonal` remains for **seeds and tests**, not product boot.
- First-run create does **not** open the three-step hub dialog (mark / invite / currency). Name + default currency is enough; mark can wait for settings.
- Unresolved (confirm or correct): after create, land `/agency/tracker` vs leftover `/canvas`. Sketch default: `/agency/tracker` for founders, invited team’s `/agency/tracker` for invitees.

---

## Architecture sketches

Arena runners (`claude-fable-5-1-thinking-max`, `gpt-5.6-sol-max`, `grok-4.6-fast-xhigh`, `claude-opus-5-thinking-xhigh`) are not in this session’s allowed subagent list. Two structurally distinct candidates were sketched in-thread instead.

### Candidate A — Dedicated `/welcome` primer (route-gated)

First-run is a route, not a chrome overlay. Boot stops creating teams. One server module owns “should this user see first-run?”

**Usage**

```ts
// _authenticated loader (no ensurePersonal)
const firstRun = await getFirstRun(actorUserId, {});
if (firstRun.status !== "done" && location.pathname !== "/welcome") {
  throw redirect({ href: "/welcome" });
}

// last card, founder
await createTeam(actorUserId, { name });
await markFirstRunComplete(actorUserId, {});
// navigate /agency/tracker

// last card, invitee
await markFirstRunComplete(actorUserId, {});
// navigate /agency/tracker with joinTeam.id selected
```

**Module map**

| Layer | Owner |
|---|---|
| `user.onboardingCompletedAt` | `packages/db/src/schema/auth.ts` + migration |
| `getFirstRun` / `markFirstRunComplete` | `packages/api/src/routers/onboarding/service.ts` |
| `onboarding.get` / `onboarding.complete` | thin `protectedProcedure` router |
| `createTeam` | existing team service (only create path) |
| `personalAgencyName(userName)` | extract from `ensure-personal-agency.ts` (pure) |
| Feature UI | `apps/web/src/features/first-run/` golden split |
| Boot | `_authenticated` loader: drop `ensurePersonal`; redirect incomplete → `/welcome` |
| Hub | hide Create agency when `teams.length >= 1` |
| Auth hook | Polar customer stays; drop `registerPersonalAgencyOnUserCreate` from `apps/server/src/app.ts` |

**Types**

```ts
export type FirstRunStatus = "tour" | "create" | "join" | "done";

export type FirstRunSession = {
  status: FirstRunStatus;
  completedAt: string | null;
  membershipCount: number;
  joinTeam: { id: string; name: string } | null;
  defaultAgencyName: string;
};

export async function getFirstRun(
  actorUserId: string,
  input: Record<string, never>,
): Promise<FirstRunSession> {
  void actorUserId;
  void input;
  throw new Error("not implemented");
}

export async function markFirstRunComplete(
  actorUserId: string,
  input: Record<string, never>,
): Promise<FirstRunSession> {
  void actorUserId;
  void input;
  throw new Error("not implemented");
}

export function personalAgencyName(userName: string): string {
  void userName;
  throw new Error("not implemented");
}

export function resolveFirstRunStatus(input: {
  completedAt: Date | null;
  teams: Array<{ id: string; name: string }>;
}): FirstRunStatus {
  void input;
  throw new Error("not implemented");
}
```

Policy hidden behind `getFirstRun`: grandfathering is a migration, not a client check; invitee vs founder is `membershipCount`; tour vs last card is client step state.

**Red flags:** none if boot/hub/auth all call `getFirstRun` / `createTeam` instead of inventing local rules. Leakage if the web loader re-implements “empty teams ⇒ create”.

### Candidate B — In-shell overlay on leftover Canvas

Zero-team users boot into `/canvas`. A modal/sheet tours fake Agency/Orch because those surfaces cannot render without a team. Create is the existing hub dialog.

**Rejected on red flags:** temporal decomposition (tour UI vs create dialog vs boot each own the policy); information leakage (empty-team meaning spread across overlay, hub, Agency paywall); shallow module (callers must know Agency is unusable until create). Overlay also fights Slice 3’s invite-in-create dialog.

### Synthesis decision

Ship **Candidate A**. Deep module (`getFirstRun` + existing `createTeam`) behind a small public surface. Dedicated route matches onboarding TTV and distraction-free rules. Candidate B is kept only as the anti-shape: do not tour inside a shell that cannot show Agency.

---

## File map (when implementing)

- Modify: `packages/db/src/schema/auth.ts` — `onboardingCompletedAt`
- Create: migration for column + backfill members
- Create: `packages/api/src/routers/onboarding/schemas.ts`, `service.ts`, `router.ts`, tests
- Modify: `packages/api/src/routers/index.ts` — mount `onboarding`
- Modify: `packages/api/src/routers/team/ensure-personal-agency.ts` — export pure `personalAgencyName`; keep `ensurePersonalAgency` for seeds
- Modify: `packages/auth/src/user-create-after.ts` — Polar only (no personal agency)
- Modify: `apps/server/src/app.ts` — stop registering personal agency on user create
- Modify: `apps/web/src/lib/authenticated-boot.ts` — no `ensurePersonal`; redirect incomplete first-run to `/welcome`
- Modify: `apps/web/src/routes/_authenticated.tsx` — drop ensurePersonal; allow `/welcome` without shell chrome
- Create: `apps/web/src/routes/_authenticated/welcome.tsx`
- Create: `apps/web/src/features/first-run/` container, hook, views, store
- Modify: team hub view — `canCreateAgency: membershipCount === 0`
- Modify: `authenticated-boot.test.ts`, team hub tests
- Modify: `docs/golden-file-source-inventory.md`

Seeds keep `ensurePersonalAgency` so local/dev users still get a team without the primer.

---

## Growth design audit (proposed flow, not current hub)

Current hub Create agency fails **Act** (CTA that 403s) and **Interpret** (account already has an unnamed-to-the-user agency). The audit below scores the proposed primer.

### Diagnostic summary

- **Context & objective:** First-run `/welcome` for B2B agency operators + invitees. Primary conversion: create the first Agency (or open the invited one).
- **Primary cognitive bottleneck:** Today the aha is stolen by silent provision, then the CTA lies. The primer restores Interpret (three surfaces) before Act (one field). Risk: four cards before the form can drain Ability if copy is clever or frames are decorative.

### 1. Psych

- **Motivation:** live product frames; account already created (endowed 20%).
- **Friction to avoid:** extra invite/currency/mark steps; jargon (“workspace”, “Pro”); shell chrome during tour.
- **Additions:** numbered depth 1–4; Continue; success “Agency is active”.
- **Subtractions:** hub Create agency for members; signup auto-create; Who should join.
- **Labor illusion:** “Opening your agency” while `createTeam` + trial billing insert.

### 2. B.I.A.S.

| Dimension | Status | Finding |
| :--- | :---: | :--- |
| Block | Pass (target) | Real UI frames, not vectors. Logo + one CTA. |
| Interpret | Pass (target) | One sentence per pillar in operator language. |
| Act | Pass (target) | Single CTA; name prefilled; invitees have no field. |
| Store | Pass (target) | Land Tracker with the named agency, not an empty hub. |

### 3. C.L.E.A.R. (proposed)

| Dimension | Score | Driver |
| :--- | :---: | :--- |
| C Copywriting | 4/5 | Outcome lines (“Track the work”, not “Agency module”). Keep sentence case, no exclamations. |
| L Layout | 4/5 | Frame-dominant; CTA in operator column / thumb zone. |
| E Emphasis | 5/5 | One accent button; no Skittles. |
| A Accessibility | 4/5 | shadcn Dialog/Button; 44px targets; errors in text. |
| R Reward | 4/5 | Morph between cards; create success is entering Tracker. |
| **Total** | **21/25** | |

- **Archetype:** Onboarding.
- **TTV:** four short cards + one field, under two minutes.
- **Gradual commitment:** account exists; Agency named after value.
- **Progress transparency:** 1 of 4 … last card is the action.

### 4. Triggers

| Breakdown | Trigger | Application |
| :--- | :--- | :--- |
| Silent provision killed Act | **IKEA Effect** | User names the Agency. |
| Four steps feel long | **Endowed Progress** | Welcome starts with account created. |
| Drop mid-tour | **Zeigarnik** | Visible remaining steps; Skip goes to last card. |
| Name-field fatigue | **Default Effect** | `{name}'s agency` prefilled. |
| Invitee confusion | **Default Effect** | No create; Open {team}. |

### Prioritized plan (after confirm)

**P1** Stop auto-create; add `getFirstRun`; hide Create agency when already a member; `/welcome` primer + create/open.

**P2** Live frames (real product stills or inert snapshots), morph, labor-illusion create.

**P3** Optional mark on last card; replay tour from settings (out of scope unless asked).
