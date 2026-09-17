# Whole-branch review fix report

Worktree: `/home/omar/Projects/brainiac/.worktrees/fix-railway-hot-paths`  
Branch: `fix/railway-hot-paths`  
Did not amend prior commits. Did not deploy. Did not run root `bun run check`. Did not implement `shouldReload`. `_authenticated` staleTime unchanged.

## Fixes

1. **Restored overwritten SDD reports.** Copied this branch’s railway Task 3/4/7 reports to `task-*-railway-hot-paths-report.md`, then restored `.superpowers/sdd/task-3-report.md`, `task-4-report.md`, and `task-7-report.md` from merge-base `5f655f6a`.
2. **Signed-out wins on authoritative `data: null` / `{ user: null }` even when `error` is set.** Loader user is kept only while `data === undefined`. First-hydration pending with no loader user stays pending (`data: null` + `isPending` + no initial user).
3. **Live `orpc` mock leakage.** Catalog tests no longer stub `@/lib/orpc` as a partial `projectTasks.list` module. The mock is a forwarding router plus `orpcClient.list`, restored with `mock.restore()`. Live tests call `mock.restore()` before their file-local mocks and restore `fetch` in `afterAll`.
4. **README.** `docs/investigations/railway-hot-paths/README.md` now says treatment is blocked pending authorized deploy, matching `treatment.md`.

## Tests

From `apps/web`:

```
bun test src/lib/auth-session.test.ts src/features/notifications/notifications-queries.test.ts src/features/shared/agency-query-options.test.ts src/features/shared/live/agency-live-connection.test.ts src/features/shared/live/agency-live-handlers.test.ts
```

**GREEN:** 48 pass, 0 fail (148 expect() calls). 5 files, one process.

Auth-session only:

```
bun test src/lib/auth-session.test.ts
```

**GREEN:** 7 pass, 0 fail.

Original 15-file process (catalog + live + boot/chooser neighbors) also **GREEN:** 121 pass, 0 fail.

## Lint / format

`bunx oxlint` clean on touched product/test files. `bunx oxfmt --check` clean after formatting `auth-session.ts`, `auth-session.test.ts`, and the README.

---

## Slice 2 final review (branch `from-brainiac-to-orch`)

Worktree: `/home/omar/Projects/brainiac` (main repo, not a worktree)

### Fixes

1. **Upload status precedence.** Task-attachment and knowledge-source HTTP routes validate fields → membership → `rejectIfUploadsBlocked` (403 `upload_blocked`) → 50MB size (400) → S3. Shared helper: `packages/api/src/billing-upload-route-order.ts`.
2. **Volume-cap snapshot under lock.** `assertWithinLimit` for `clients` / `projects` / `tasksPerProject` locks `workspace_team_billing` on the executor first, then resolves plan/limits from that locked row via `resolveTeamBillingSnapshot`. Payload counters (`nodes` / `blocks` / `tabs`) still use unlocked `getTeamBilling`.

### Tests

```
bun test packages/api/src/billing-uploads.test.ts packages/api/src/billing-team.test.ts
```

**GREEN:** 37 pass, 0 fail (66 expect() calls). 2 files, ~17s.

---

## Slice 2 re-review fix (branch `from-brainiac-to-orch`)

Worktree: `/home/omar/Projects/brainiac` (main repo)

### Fixes

3. **Paid overlay on locked billing row.** `assertWithinLimit` holds `workspace_team_billing` `FOR UPDATE` on the caller transaction; `resolveTeamBillingSnapshot` → `applyPaidPlan` now receives the same `VolumeCapDbExecutor` (extended with `update`) so Polar-pro agency persistence does not block on the outer lock.

### Tests

```
bun test packages/api/src/billing-team.test.ts
```

**GREEN:** 33 pass, 0 fail (59 expect() calls). 1 file, ~12s.
