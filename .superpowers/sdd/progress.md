# SDD Progress

Plan: docs/superpowers/plans/2026-09-17-orch-saas-agency-slice-5-catalog.md
Branch: from-brainiac-to-orch (in place; no worktree)
Base: 8aace507 (plan committed)

Task 1: complete (commits 8aace507..2b158058, review Approved). Minors: leftover proSubscription names; apps/server/.env.example still old Pro id.
Task 2: complete (commits 2b158058..9820b8dc, review Approved). Minors: env restore not try/finally; no billing-queries slug test; landing/rail still say Pro (Tasks 3–4).
Task 3: complete (commits 9820b8dc..aee8b790, review Approved). Minors: inventory extra rows; landingUnlimitedCta untested; no visual check in implementer pass.
Task 4: complete (commits aee8b790..9c5dd062, review Approved after undefined→Leftover). Minors: mobile-only rail CTA; icon isPro status dot.
Task 5: complete (commits 9c5dd062..0abbde27, review Approved after mounting LandingPricing on / and Polar returnUrl /#pricing). Minors: hero owns main landmark; hash-scroll inner rAF; source-string mount test.
Whole-branch: Approved at 0abbde27. Minors wait: proSubscription names, mobile-only leftover CTA, hero main landmark, Railway POLAR_PRODUCT_AGENCY_UNLIMITED. Ready on from-brainiac-to-orch.

---

Plan: docs/superpowers/plans/2026-09-17-orch-saas-agency-slice-4-rbac.md
Branch: from-brainiac-to-orch (in place; no worktree)
Base: d04ec19e (plan committed)

Task 1: complete (commits d04ec19e..447f188f, review Approved). Minors: fixture orphan teams; unused lifetimePro flag.
Task 2: complete (commits 447f188f..b8ea7d91, review Approved). Important follow-ups: editor update/archive/contact untested; web must omit commercial keys on name-only update. Minors: unused polar stub in test.
Task 3: complete (commits b8ea7d91..2036011a, review Approved). Minors: tags/templates/journey untested; no editor-negative project rate test.
Task 4: complete (commits 2036011a..c4a6f76e, review Approved). Minors: no editor-positive summary test.
Task 5: complete (commits c4a6f76e..4c7a04ac, review Approved). Minors: weak TDD RED; Polar stub in test.
Task 6: complete (commits 4c7a04ac..9697b933, review Approved after canEditRecords consumed in my-tasks dialog). Minors: none.
Task 7: complete (commits 9697b933..29a5e3cd, review Approved). Type fix fad32edf; inventory 29a5e3cd. Pre-existing convention failures out of scope.
Whole-branch: Approved after 7f0c0159 (editor chrome, dashboard 403, tags/journey) and 4d2e18c1 (project-page Add task; viewer Orch self-summary). Minors wait: orphan fixtures, Polar stubs, task rate miss without insufficient_role, duplicate canEditRecords prop, viewer agent isTiming/filter/500-cap polish. Ready on from-brainiac-to-orch at 4d2e18c1.

---

Plan: docs/superpowers/plans/2026-09-17-orch-saas-agency-slice-3-seats-credits.md
Branch: from-brainiac-to-orch (in place; no worktree)
Base: e46c522a (plan committed)

Task 1: complete (commits e46c522a..ec8ab72c, review Approved). Minors: env isolation in billing.test.ts; TDD RED excerpt slightly misleading.
Task 2: complete (commits ec8ab72c..35fc42f5, review Approved after cancel/rollover tests). Minors: polar.teamId not validated; resolveTeamBillingSnapshot owner via global db.
Task 3: complete (commits 35fc42f5..34f5f0ea, review Approved). Minors: no existing-member role-only test; trial fixture raw seats=2; concurrent duplicate invite unique constraint.
Task 4: complete (commits 34f5f0ea..c995ecf7, review Approved). Important plan-mandated: multi-team billing uses first membership not turn.teamId (brief: canvas-style). Minors: orchMessages batch adding; no paid 51st orch_credits test; assertWithinLimit orchMessages untested. Polar conversation gate confirmed removed; only append+stream turn paths.
Task 5: complete (commits c995ecf7..fdd15bc3, review Approved after tx+conflict-target fix). Minors: no server product-routing test; empty checkoutId silent skip.
Task 6: complete (commits fdd15bc3..04eadad5, review Approved after confirm loop, dialog, checkoutKind, idempotency, plan-aware copy). Minors: none.
Task 7: complete (commits 04eadad5..610c6e7b, review Approved). Minors: checkout-success refresh not a Confirmed row; inventory regen churn.
Whole-branch: Approved after 08cdfd30 (server-derived seat quantity; Orch month rollover CAS). Plan-mandated leftover: canceled/revoked Polar snapshots keep stored paid plan (no downgrade). Ready on from-brainiac-to-orch at 08cdfd30.

---

Plan: docs/superpowers/plans/2026-09-17-orch-saas-agency-slice-2-volume-caps.md
Branch: from-brainiac-to-orch (in place; no worktree)
Base: e8d6256c (plan committed)

Task 1: complete (commits e8d6256c..51bd352f, review Approved after FOR UPDATE tx lock). Minors: none.
Task 2: complete (commits 51bd352f..083783d7, review Approved). Minors: none.
Task 3: complete (commits 083783d7..76267482, review Approved after title-merge race fix). Minors: none.
Task 4: complete (commits 76267482..442b2b53, review Approved). Minors: none.
Task 5: complete (commits 442b2b53..04282268, review Approved). Minors: none.
Task 6: complete (commits 04282268..69dbd4ce, review Approved). Minors: paid 50MB+1 upload not in slice test files (existing MAX_UPLOAD_BYTES 400).
Whole-branch: Approved after fixes 543e9777 (upload 403 before size; locked snapshot), 15260537 (applyPaidPlan on same tx), d0879502 (inventory billing-upload-route-order). Ready on from-brainiac-to-orch at d0879502.

---

Plan: docs/superpowers/plans/2026-08-14-orch-composer-reliability.md (then search, agency, canvas)

Task 1: complete (commits 17688e06..756f185c, review clean). Minors: enqueue-at-cap untested; cancel missing-id untested.
Task 2: complete (commits 756f185c..bbcdd812, review Approved after attachment-only + send-while-running fixes). Minors/plan-mandated: queue-at-cap silent ignore; DoD checks in Task 10; Enter-to-send while streaming may still be runtime-gated.
Task 3: complete (commits bbcdd812..675696af, review Approved after Important upsert-race / ownership / error-wrap fixes). Minors: redundant ownership queries on upsert; empty upsert still persists a row; no live Postgres CRUD tests.
Task 4: complete (commits 0c0e318c..44616369, review Approved after in-flight restore-chip suppression). Minors: no hook timing tests; redundant isBusy gate.
Task 5: complete (commits 65448d21..d3e931f6, review Ready). Minor: marker guard is if-not instead of exhaustive switch.
Task 6: complete (commits feaed779..729d3fef, review Approved after ComposerDraftBridge lastEmittedRef fix). Minors: projects query always-on when teamId set; no browser E2E.
Task 7: complete (commits 330f1616..4a463c9f, review Ready). Minors only.
Task 8: complete (commits bffc24c2..487bede6, review Ready). Minors only.
Task 9: complete (commits 8728469e..c13907a6, review Ready). Minors only.
Task 10: complete (verify slice: 26 unit tests pass; check / check-types / conventions / golden pass after inventory update). Browser smoke skipped (no authenticated session).

---

Plan: docs/superpowers/plans/2026-08-14-orch-thread-search-and-read-aloud.md

Search Task 1: complete (commits b092fdfd..96f1a11a, review Approved).
Search Task 2: complete (commits 96f1a11a..106e9097, review Ready).
Search Task 3: complete (commits 106e9097..e2b8b42f, review Ready).
Search Task 4: complete (commits e2b8b42f..3e559a90, review Ready).
Search Task 5: complete (commits 3e559a90..ae895d4c, review Approved).
Search Task 6: complete (commit 6db6bdf5 inventory). Browser smoke skipped.

---

Plan: docs/superpowers/plans/2026-08-14-agency-orch-ops.md

Agency Task 1: complete (commits 6db6bdf5..25d13b62, review Approved).
Agency Task 2: complete (commits 25d13b62..24c877c9, review Approved).
Agency Task 3: complete (commits 24c877c9..4f403a5b, review Approved).
Agency Task 4: complete (commits 4f403a5b..cf6713fb, review Approved).
Agency Task 5: complete (commits cf6713fb..646b07f8, review Approved).
Agency Task 6: complete (commits 646b07f8..b3a62d7e, review Approved).
Agency Task 7: complete (commits b3a62d7e..6b5b88fb, review Approved).
Agency Task 8: complete (commit 256e3366 inventory). Browser smoke skipped.

---

Plan: docs/superpowers/plans/2026-08-14-canvas-orch-scope.md

Canvas Task 1+2: complete (commits 256e3366..c4135377, review Approved). Important: agencyRef null clear untested.
Canvas Task 3: complete (commits c4135377..bc67b5ae, review Approved). Important: duplicate scoped note on Canvas-primary dual-surface turns.
Canvas Task 4: complete (commits bc67b5ae..6a07b0bc, review Approved). Important: sniper vs @ draft source asymmetry.
Canvas Task 5: complete (commit 7742ec35 inventory). Browser smoke skipped.

All four plans complete (composer, search, agency, canvas). Prompt library out of scope.

---

Plan: docs/superpowers/plans/2026-08-29-bills-tables.md

Task 1: complete (commits 45d3943e..4650b1a5, review Approved). Minors: tests couple to group builder; missing same-period non-carry uniqueness case; dead `if (!line)` after size===1.
Task 2: complete (commits 4650b1a5..615e2f48, review Approved after prop-boundary + golden inventory fix). Minors: onOpenRow still MoneyBillComposeDisplayRow; PersonBillsTable takes salaryPool on client table; status badge thinner than old chips; three unrelated inventory rows.
Task 3: complete (commits 615e2f48..f1ac3b51, review Approved after salary-pool visibility fix). Minors: salary footer can still render from cached pool on Clients/Adjustments; close-via-effect can flash one frame.
Task 4: complete (commits f1ac3b51..e7817511, review Approved). Minors: compact remaining inlined vs chrome helper; search+status cluster wraps earlier; Select value casts.
Task 5: complete (commits e7817511..474bdb50, review Approved after strip-item id selection). Minor: ExpenseStatusBadge nested ternary vs exhaustive switch in sheet.
Task 6: complete (verify only, no commits; 47 tests, types, golden pass; check/conventions fail only on 8 pre-existing non-Money files). Browser on worktree :7012 at 2534×1426. Salary pool and error state data-blocked.
Final review 45d3943e..474bdb50: With fixes (no Critical). Important: salary-pool leak, paid CTA mismatch, pending-adjustments missing from sheet, sheets not bottom on mobile, party not a Link. Fix pass in flight.
Fix pass: `4c448fba` (68 tests, types pass). Re-review of `45d3943e..4c448fba` in flight.
Re-review: five prior Importants fixed. New Important: unbounded mobile bottom sheet height. Cap-height fix in flight.
Height cap: `d7cd2ba4` (68 tests, types pass). Re-review of `45d3943e..d7cd2ba4` in flight.
Re-review: height cap Fixed. New Important: salary pool ignores status filter and labels partial as Outstanding. Fix in flight.
Salary-pool status: `c22009d0` (76 tests, types pass). Re-review of `45d3943e..c22009d0` in flight.
Re-review: salary-pool Fixed. Important: `use-money-detail-sheet-side.ts` missing from golden inventory. Inventory fix in flight.
Golden inventory: `31130250` (check:golden 1429, exit 0). Re-review of `45d3943e..31130250` in flight.
Re-review: inventory Fixed; no Critical/Important. Merge nits: oxfmt on waste helper, exhaustive ExpenseStatusBadge. Fix in flight.
Fmt/badge: `d7a07492`. Re-review of `45d3943e..d7a07492` in flight.
Final review `45d3943e..d7a07492`: Ready to merge Yes. No Critical/Important remaining.
