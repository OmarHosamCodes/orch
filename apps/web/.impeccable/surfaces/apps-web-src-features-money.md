---
version: 1
slug: "apps-web-src-features-money"
primary_target: "apps/web/src/features/money"
related_targets: ["apps/web/src/features/billing", "packages/api/src/routers/agency-ops/billing"]
---

Visitor mode: Operate. Scope: Agency Money (`/agency/management/money`) as a one-page period-close dashboard.

Audience: team owners mid-period or at close. Job: see how the period performed and what still needs Collect or Pay, then close named obligations in the drill without leaving the page.

Action: read a data-honest P&L narrative, act the needs-action queue, then operate Clients / Team / Expenses / Adjustments / All as one two-level ledger. Proof: live period scoreboard, compose-on-demand bills with nested current + carry lines, salary pool as a first-class parent, expense cycles, formula-driven adjustments, ephemeral invoice/payslip preview. EGP ledger with period FX.

Constraints: Orch quiet instrument and D01 glyphs only in the already-shipped P&L; no new routes or money capabilities; hide zero Fin-Sheet buckets; no empty payout-run shells; no Period payout run block; owner-only; golden-file layers; existing dialogs and detail sheets. Lists keep full anatomy (hours, waste, carry, received) without remaining-only queues or CRM invoice-book chrome.

Direction: Period Close Dashboard plus two-level operate ledger. Split hero (P&L left, queue right) then a swapping drill. Default drill is the first queue item, else Clients remaining. Memorable moment: largest unpaid obligation and period profit in the same first viewport; expanding a client with carry shows this period and prior balances as nested money rows, remaining last, Collect on the parent.

Ledger row language (every list of money, including All, detail sheets, and preview include-lines):
Parent — mark · identity · status text · hours · total · received/paid · remaining · Collect/Pay
Child — indent · period · Prior/waste · hours · total · received/paid · remaining · line action
Single-line parties stay one row. Mixed status disappears because lines are visible. Preview is an ephemeral branded document beside nested include-lines (combine / split-by-period stays). All is one table with a quiet party glyph.
