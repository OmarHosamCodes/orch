import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CANVAS_PATH = join(ROOT, ".cursor/canvases/chat-time-entry-gap-report.canvas.tsx");

function esc(str) {
  return JSON.stringify(str);
}

export async function generateCanvas(report) {
  const dataJson = JSON.stringify(report, null, 2);
  const source = `import {
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

const report = ${dataJson} as const;

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
            <Callout key={b.area} tone="danger" title={\`Blocked: \${b.area}\`}>
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
`;

  await writeFile(CANVAS_PATH, source, "utf8");
  return CANVAS_PATH;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const jsonPath = join(ROOT, ".cursor/canvases/data/chat-time-entry-gap-latest.json");
  const report = JSON.parse(await readFile(jsonPath, "utf8"));
  const path = await generateCanvas(report);
  console.log(`Wrote ${path}`);
}
