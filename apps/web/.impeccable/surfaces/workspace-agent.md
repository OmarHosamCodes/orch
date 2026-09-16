---
version: 1
slug: "workspace-agent"
primary_target: "apps/web/src/features/workspace-agent"
related_targets:
  - "apps/web/public/favicon.svg"
  - "apps/web/src/components/ai-elements"
---

Visitor mode: Operate.

Audience / scene: You, during Agency and Canvas work, often leaving the tab mid-turn.

Job: Always know whether Orch is idle, working, done, or needs you; open one panel to talk, read inbox, and jump history; confirm Agency writes without hunting a second dock.

Primary action: Click Eclipse (~48px, corner) to open the overlay panel. Pet stays on screen while the panel is open (Obvious-style origin).

Panel topology: ChatGPT-like thread + composer (center); Copilot-like rails Chat | Inbox | History. No Ask/Plan/Agent tags. No model picker. No quota/voice/MCP demo chrome.

Pet moods (from Eclipse canvas): idle, working, done, needs-you (unread inbox / pending Agency confirm), error. Occasional one-liner from the latest inbox note. `prefers-reduced-motion` snaps, no orbiting.

What I created: real Canvas node/block cards with Open, not generative ui_present canvases.

Confirms: if the panel is open, in-thread Approve/Reject; if you were gone, inbox note + needs-you mood.

Task pages: human task chat stays; pet lazily opens a you-only Orch thread for that taskId. No runTaskAgent.

Anti-goals: robot/orb/sparkle mascot; liquid glass; assistant-ui Thread chrome; burying Orch in Settings; changing Agency rail / Tracker / Bills visuals.

Memorable moment: Eclipse goes needs-you and a one-liner appears; click opens that inbox note.

Color: Restrained — shell neutrals plus Operator Violet `#5b5bd6` on the bite-dot and working/needs-you states only.

Kit: copied Vercel AI Elements into `apps/web/src/components/ai-elements/` (do not overwrite `@/ui`). Custom pet, inbox, What I created, confirms.
