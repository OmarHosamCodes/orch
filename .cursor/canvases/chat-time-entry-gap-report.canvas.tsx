import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  H1,
  Stack,
  Stat,
  Table,
  Text,
} from "cursor/canvas";

const report = {
  "previewOnly": true,
  "generatedAtUtc": "2026-07-24T16:00:37.401Z",
  "userEmail": "omarhosamcodes@gmail.com",
  "timezone": "UTC+3",
  "window": {
    "startUtc": "2026-07-17T16:00:37.058Z",
    "endUtc": "2026-07-24T16:00:37.058Z",
    "startLocal": "2026-07-17 19:00:37",
    "endLocal": "2026-07-24 19:00:37"
  },
  "blockers": [
    {
      "area": "transcripts",
      "message": "Indexed transcriptsDir not mounted in this environment: /home/omar/.cursor/projects/home-omar-Projects-brainiac/agent-transcripts",
      "railwayHint": "Indexed transcriptsDir not mounted in this environment: /home/omar/.cursor/projects/home-omar-Projects-brainiac/agent-transcripts"
    },
    {
      "area": "railway-postgres",
      "message": "Railway MCP is not configured in this agent environment; DATABASE_URL/POSTGRES_URL is unset; `railway run` failed or is unauthorized.",
      "detail": "Unauthorized. Please login with `railway login`",
      "target": "Internal Tools / Brainiac / Postgres-EEa9"
    }
  ],
  "daily": [],
  "proposedAdds": [],
  "totals": null,
  "note": "Report blocked — no metrics invented. Fix blockers and re-run scripts/chat-time-entry-gap-report.mjs"
} as const;

function hours(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toFixed(2);
}

export default function ChatTimeEntryGapReportCanvas() {
  const blocked = Array.isArray(report.blockers) && report.blockers.length > 0;
  const daily = report.daily ?? [];
  const proposed = report.proposedAdds ?? [];
  const totals = report.totals;

  return (
    <Stack gap={16}>
      <H1>Chat vs time-entry gap report (preview)</H1>
      <Text tone="secondary">
        User {report.userEmail} · window {report.window?.startLocal} → {report.window?.endLocal} ({report.timezone})
      </Text>

      <Callout tone="warning" title="Preview only">
        No rows were inserted into production. Proposed fills are suggestions for manual review.
      </Callout>

      {blocked
        ? report.blockers?.map((b: { area: string; message: string }) => (
            <Callout key={b.area} tone="danger" title={`Blocked: ${b.area}`}>
              {b.message}
            </Callout>
          ))
        : null}

      <Card>
        <CardHeader title="Daily breakdown" />
        <CardBody>
          <Table
            columns={["Day (UTC+3)", "Chat h", "Covered h", "Entry h"]}
            rows={daily.map((d: { day: string; chatHours: number; coveredHours: number; entryHours: number }) => [
              d.day,
              hours(d.chatHours),
              hours(d.coveredHours),
              hours(d.entryHours),
            ])}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Proposed manual adds (≥ 60s gaps)" />
        <CardBody>
          {proposed.length === 0 ? (
            <Text tone="secondary">No proposed rows{blocked ? " (data unavailable)" : ""}.</Text>
          ) : (
            <Table
              columns={["Start", "End", "Hours", "Neighbor project", "Strategy"]}
              rows={proposed.map(
                (p: {
                  startLocal: string;
                  endLocal: string;
                  hours: number;
                  neighborProject: string;
                  neighborStrategy: string;
                }) => [p.startLocal, p.endLocal, hours(p.hours), p.neighborProject, p.neighborStrategy],
              )}
            />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Totals" />
        <CardBody>
          <Stack gap={12}>
            <Stat label="Window entry hours" value={hours(totals?.windowEntryHours)} />
            <Stat label="Would add" value={hours(totals?.proposedAddHours)} />
            <Stat label="Projected total" value={hours(totals?.projectedEntryHours)} />
          </Stack>
          {!blocked && totals ? (
            <Text tone="secondary">
              Chat {hours(totals.chatHours)} h · covered by entries {hours(totals.coveredHours)} h
            </Text>
          ) : null}
        </CardBody>
      </Card>

      <Text tone="tertiary">Generated {report.generatedAtUtc} UTC</Text>
    </Stack>
  );
}
