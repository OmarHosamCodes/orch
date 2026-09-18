---
version: 2
slug: "workspace-agent"
primary_target: "apps/web/src/features/workspace-agent"
related_targets:
  - "apps/web/public/favicon.svg"
  - "apps/web/src/components/ai-elements"
  - "apps/web/src/features/app-shell/app-shell-context-bar.tsx"
---

Visitor mode: Operate.

Audience / scene: You, during Agency and Canvas work, glancing whether Orch needs you without leaving the page.

Job: During Agency/Canvas work, glance whether Orch needs you or is running, send a short turn without opening a panel, settle finished threads, expand only when you want the full thread.

Primary action: Click the top-bar Eclipse (~32px in the 44px bar). Compact popover: one-line composer, unread + running threads, Open Orch. Open Orch morphs to an expandable overlay with Settle / Settled chrome.

Notifications: No bell. Sidebar featured Needs-action card remains the only in-app notification surface.

Anti-goals: Corner FAB; Chat | Inbox | History tabs; tools dump in `+`; click-to-scope; raw tool JSON traces; auto-expand on send; confetti on compact glance.

Memorable moment: Eclipse needs-you; click; send or open the running thread; settle when done.

Color: Restrained — shell neutrals plus Operator Violet `#5b5bd6` on the bite-dot and working/needs-you states only.
