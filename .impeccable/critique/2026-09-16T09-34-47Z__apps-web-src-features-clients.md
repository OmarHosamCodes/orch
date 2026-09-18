---
target: apps/web/src/features/clients
total_score: 21
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 1
timestamp: 2026-09-16T09-34-47Z
slug: apps-web-src-features-clients
---
Method: dual-agent (A: a3f7e82f-c1e1-49e5-b35b-3461632563f0 · B: 6b390cc1-c59c-4dfe-82ff-aa124d068005)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Week heat unlabeled until fix; save confirmations still quiet |
| 2 | Match System / Real World | 3 | Agency-native corridors and billing language |
| 3 | User Control and Freedom | 3 | Back, archive, popover edit; archive lacks confirm |
| 4 | Consistency and Standards | 2 | Commercial editable in list popover and detail form |
| 5 | Error Prevention | 2 | Invalid rate blocked; archive one-click |
| 6 | Recognition Rather Than Recall | 3 | Column headers added; corridor labels help |
| 7 | Flexibility and Efficiency | n/a | Operate admin surface |
| 8 | Aesthetic and Minimalist Design | 3 | Color now encodes corridor/need state; forms still dense |
| 9 | Error Recovery | 2 | Retry on load errors; not-found copy fixed |
| 10 | Help and Documentation | n/a | Internal Operate surface |
| **Total** | | **21/32** | **Good (66%)** |

## Design Specificity Verdict

**LLM:** Corridor board + need chips + Split Inspector detail are product-specific Orch agency patterns, not a Clockify clone. D01 plates reuse member-profile instrument language. Remaining generic cues: command-bar scope filters and always-open dual forms.

**Detector:** 0 mechanical findings across `apps/web/src/features/clients`.

**Browser:** Corridor accent colors, semantic chips, and panel chrome render as intended. List column header row improves scan. Detail panels now share consistent bordered treatment.

## Overall Impression

The surface now reads as a billing triage book with intentional color hierarchy. Biggest remaining gap is command-bar noise on the list and always-expanded Commercial/Contact forms on detail.

## What's Working

1. Corridor prioritization with semantic header color (Ready = warning, Working = success).
2. Needs chips + tinted week heat bar encode urgency without opening detail.
3. Split Inspector panels with colored borders when rate/contact/Money need action.

## Priority Issues

**[P1] Command bar scope filters on Clients** — Why: four cross-entity filters compete with corridor scan. Fix: Clients-only filters. Command: `/impeccable distill`

**[P2] Detail form density** — Why: Commercial + Contact always open. Fix: collapse when complete. Command: `/impeccable layout`

**[P2] Desktop row actions discoverability** — Partially addressed (⋮ always visible). Command: `/impeccable harden`

**[P3] Save feedback** — Why: commercial/contact saves silent. Fix: inline saved state or toast. Command: `/impeccable polish`

## Persona Red Flags

**Alex:** No batch bill-from-list; must open each Ready client.

**Jordan:** Catalog rate vs member billable rates still needs helper copy.

**Sam:** Week heat bar remains decorative-only (`aria-hidden`); sr-only duration added.

## Minor Observations

- Project tag casing inconsistent in data.
- Quiet corridor dominates long books.
- Money empty state still visually light when uninvoiced time exists.

## Questions to Consider

1. Collapse Quiet corridor by default?
2. Read-only Commercial/Contact summary when complete?
3. Absolute week hours column instead of relative heat?
