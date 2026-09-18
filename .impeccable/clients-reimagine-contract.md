# Agency Clients reimagine — feature contract

Visitor mode: Operate. Visual world: inherit Agency (quiet instrument). Prototype data is synthetic; label it as such in the UI chrome, never as live product metrics.

Team: **School of Marketing**. Agency currency: **EGP**. Role toggle in the prototype: Owner | Member.

## Routes

- List: `/agency/clients`
- Detail: `/agency/clients/:id`
- Project click: toast or overlay "Open project {name}" (do not invent a project page)
- Ready to invoice / Open Money: toast or overlay "Open Money for {client}" (do not invent Money)

## Shared chrome (every direction)

Agency left rail (Tracker, Dashboard, Clients current, Projects, Reports, Management) + connected top bar with Current Title "Clients" or the client name. Command bar on the list: search, archive filter Active | Archived | All, primary **New client**. Do not redesign the shell; restyle only the page body.

Fonts: Poppins + IBM Plex Sans Arabic; IBM Plex Mono for durations, rates, amounts.
Primary CTA: monochrome (white on black / black on white). Operator violet `#5b5bd6` / `oklch(0.58 0.21 260.84)` for selection and sparse chrome only, never wallpaper.
Dark tokens: background `oklch(0 0 0)`, card `oklch(0.14 0 0)`, muted `oklch(0.23 0 0)`, border `oklch(0.26 0 0)`, foreground `oklch(1 0 0)`, muted-foreground `oklch(0.72 0 0)`, warning `oklch(0.79 0.15 70)`, destructive `oklch(0.69 0.2 23.91)`, success `oklch(0.72 0.17 145)`.
Radii: controls ~14px, cards ~21px. No liquid glass, nested cards, hero-metric sparkline tiles, nested tabs of nested tabs, em dashes.

## Feature floor (100%)

### List

- Search filters name and project names
- Archive filter: Active, Archived, All
- New client popover: name, category External|Internal, catalog rate / hour (blank allowed), currency (EGP, USD, EUR). Owner only. Submit adds a row.
- Columns / equivalent fields: name, Internal/External, catalog rate (or "Not set"), project chips (max 3 +N), week hours `H:MM:SS` or `nH:nM:nS`, Active|Archived
- Owner row actions: New project (locks client), Edit commercial (name, category, rate, currency), Archive / Unarchive
- Member: no New client, no row mutations; click still opens detail (read-only)
- Click row / card opens that client's detail
- States: loading shimmer, error + Retry, empty + New client, no-match

### Detail

- Back to clients
- Archived banner + Unarchive (owner)
- Identity: name, External|Internal, Active|Archived
- Contact completeness: complete | missing name | missing email | missing phone | empty. Owner jump "Add contact"
- Missing catalog rate jump "Set catalog rate"
- New project (owner, hidden if archived)
- Archive in overflow (owner, hidden if archived)
- Metrics: This week duration, This month duration, Active projects count, Ready to invoice (owners only; members see "Owners only"). Ready-to-invoice plate is warning/action when `monthUninvoicedDurationSeconds > 0` and opens Money
- Commercial form (owner): name, category, rate, currency, FX preview when currency != EGP (`≈ n EGP/h`), Save commercial. Member: read-only rate + currency
- Contact form (owner): name, email, phone, Save contact (disabled until dirty). Member: read-only
- Projects list: hue dot, name, trash strike + "In trash", click opens project. Empty: "No projects yet" + New project
- Money (owner): open invoice count, outstanding amount in invoice currency, recent invoices (number, status, amount), Open Money / "Invoice ready work". Empty invoices copy. Members: hide Money section
- States: loading, error + retry, not found, empty projects, empty invoices

## Synthetic book (use exactly these rows)

Durations are second-precise. Amounts are integer minor units displayed as currency.

### Northwind Retail (`cli_northwind`) — default open client

- External, Active
- Catalog rate 45 USD/h, preview ≈ 2,205 EGP/h
- Projects: Storefront Refresh, Email Program, Photo Bank, Q4 Promo (show 3 +1)
- Week 18:32:11, Month 72:14:08, Uninvoiced this month 14:02:00
- Contact complete: Amira Hassan, amira@northwind.example, +20 100 555 0101
- Billing: 2 open, outstanding 12,500 EGP. Invoices: INV-1042 Partial 8,000 EGP remaining 4,500; INV-1038 Outstanding 8,000 EGP remaining 8,000
- Needs: ready to invoice

### Tribe Internal (`cli_tribe`)

- Internal, Active
- Rate not set
- Projects: Agency Ops, People
- Week 6:11:40, Month 22:00:00, Uninvoiced 0
- Contact incomplete (missing email): Omar, "", +20 122 000 0000
- Billing: none (internal). Hide ready-to-invoice action
- Needs: missing rate, incomplete contact

### The Paper Co (`cli_paper`)

- External, Active
- 80 EUR/h, preview ≈ 4,560 EGP/h
- Projects: Brand System, Packaging
- Week 31:18:44, Month 31:18:44, Uninvoiced 31:18:44
- Contact complete: Jane Smith, jane@paperco.example, +44 20 7946 0018
- Billing: 0 open, outstanding 0. No invoices yet. Ready to invoice
- Needs: invoice ready work

### Harbor Logistics (`cli_harbor`)

- External, Active
- Rate not set
- Projects: none
- Week 0:00:00, Month 0:00:00, Uninvoiced 0
- Contact empty
- Billing: none
- Needs: missing rate, empty contact, no projects

### Atlas Media (`cli_atlas`) — archived

- External, Archived
- 60 USD/h
- Projects: Campaign Archive, Social Kit (inactive)
- Week 0, Month 0
- Contact complete: Sam Lee, sam@atlas.example, +1 415 555 0199
- Billing hidden while archived except read-only recent: INV-0901 Paid 4,200 EGP
- Needs: unarchive to use again

### Kite Studio (`cli_kite`)

- External, Active
- 1,200 EGP/h
- Projects: Campaign Q3 (active), Old Site (deletedAt set, In trash)
- Week 9:04:12, Month 36:40:00, Uninvoiced 0
- Contact missing phone: Nour Ali, nour@kite.example, ""
- Billing: 1 open, outstanding 4,200 EGP. INV-1101 Outstanding 4,200 EGP
- Needs: incomplete contact, outstanding

### Beacon Bank (`cli_beacon`)

- External, Active
- 95 USD/h, preview ≈ 4,655 EGP/h
- Projects: Mobile App, Design System, Onboarding, Splash, Competitor (show 3 +2)
- Week 4:00:00 (of which waste 0:45:00), Month 40:12:00 (waste 3:10:00)
- Contact complete: Priya Patel, priya@beacon.example, +971 50 123 4567
- Billing: 1 open, outstanding 0 (invoice sent, remaining 0). INV-1088 Ready 22,000 EGP remaining 0
- Healthy commercially; show waste on Heat Portfolio only as composition, not a new CRM field

### Idle Press (`cli_idle`)

- External, Active
- 30 USD/h
- Projects: Retainer
- Week 0:00:00, Month 2:15:00, Uninvoiced 0
- Contact complete: Alex Chen, alex@idlepress.example, +1 212 555 0144
- Billing: none
- Quiet / healthy

## Paid / Waste / Internal (Heat Portfolio and any hour composition)

Reuse Dashboard D01 language. For each client, derive:

- Paid = external non-waste hours
- Waste = waste-flagged time (Beacon has waste; others 0 unless noted)
- Internal = Tribe Internal hours; also Internal billable vs non-billable only if shown on detail plates, not as new product fields beyond existing hours

## Interactions every direction must implement

- Direction switcher (01–06) always visible
- Viewport: Desktop 1440 and a Mobile 390 stack (or Sheet for Split Inspector)
- Owner | Member role switch
- Archive filter + search
- New client, edit commercial, save contact, archive/unarchive, new project dialog (name only, client locked)
- Empty, error, loading via a States menu: Default | Loading | Error | Empty book | No match | Not found
- Motion: 150–250ms state changes; respect prefers-reduced-motion
- Secondary actions on hover/overflow; numbers right-aligned tabular

## Anti-goals

Do not invent address, notes, tags, portal, RFM, subscriptions, or chat.
Do not Clockify-clone a 68rem data table as direction 1–6 (that is the standing exit, omit it).
Do not flood violet. Do not wrap every section in a nested card.
