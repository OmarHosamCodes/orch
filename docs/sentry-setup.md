# Sentry Observability Setup

Orch sends frontend and backend errors **and real-user performance traces** into one Sentry project. Session replay and Sentry logs stay off.

Tracing covers every production session (`tracesSampleRate: 1.0`):

- **Browser:** TanStack Router pageload/navigation spans (parameterized route names), Core Web Vitals (LCP, INP, CLS, FCP, TTFB), long tasks, and `fetch` waterfalls to `/rpc`.
- **API:** Hono request spans renamed to `POST /rpc/<procedure>` (for example `POST /rpc/agencyOps.timer.getActive`) so Insights can rank slow procedures. `GET /` health checks are not sampled.
- **Users:** authenticated sessions attach `user.id` only (no email). Distributed traces use `sentry-trace` and `baggage` (allowed on API CORS).

## Create the Sentry project

1. Open [Sentry Projects](https://sentry.io/settings/projects/) for the `school-of-marketing` organization.
2. Create one JavaScript project named `orch` (or reuse an existing single shared project).
3. Copy the project DSN and Client Keys.

## Railway / deployment variables

Production target: Railway project **Internal Tools**, environment **Brainiac**, service **web**.

| Variable                 | Purpose                                                              |
| ------------------------ | -------------------------------------------------------------------- |
| `VITE_PUBLIC_SENTRY_DSN` | Browser SDK DSN (public)                                             |
| `SENTRY_DSN`             | Server SDK DSN (same project)                                        |
| `SENTRY_ORG`             | `school-of-marketing`                                                |
| `SENTRY_PROJECT`         | `orch`                                                               |
| `SENTRY_AUTH_TOKEN`      | Secret auth token with `project:releases` / source map upload scopes |
| `SENTRY_ENVIRONMENT`     | `production` on Railway                                              |
| `SENTRY_RELEASE`         | Optional override; defaults to `RAILWAY_GIT_COMMIT_SHA`              |

`RAILWAY_GIT_COMMIT_SHA` is already used as the web build id and becomes the shared release identifier.

Create the auth token under [Org Auth Tokens](https://school-of-marketing.sentry.io/settings/auth-tokens/) with scopes that allow release/source map upload (`project:releases`, `org:read`).

## Local development

Set the same DSN in root `.env`, `apps/server/.env` (`SENTRY_DSN`), and `apps/web/.env` (`VITE_PUBLIC_SENTRY_DSN`). Leave `SENTRY_AUTH_TOKEN` empty locally unless you need source map uploads from a local production build. Without a DSN, the SDKs stay disabled; without auth credentials, builds skip source map upload.

## Reading performance data

After production traffic lands:

1. Open **Insights → Web Vitals** and sort by LCP / INP / CLS at p75. Transaction names should be route patterns (`/agency/members/:userId`, `/canvas`), not raw IDs.
2. Open **Insights → Traces** (or Performance) and filter `transaction:POST /rpc/*`. Sort by p95 duration to find the slow procedure.
3. Open a slow trace to see the browser navigation plus the linked Hono/oRPC span in one waterfall.

## Verification checklist

1. Deploy with DSN + auth token configured.
2. Trigger one synthetic browser exception and one synthetic server exception.
3. Confirm both appear in the same Sentry project with the Railway release and readable frames.
4. Load an authenticated Agency page, then confirm a named route transaction and a `POST /rpc/...` span in Traces.
5. Remove any temporary trigger routes/buttons after verification.
