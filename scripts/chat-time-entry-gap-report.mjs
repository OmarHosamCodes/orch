#!/usr/bin/env node
/**
 * Weekly Cursor chat vs prod time-entry gap report (preview only).
 * Reads desktop agent-transcript JSONL, queries prod Postgres, writes JSON + optional canvas data.
 * Does not INSERT into the database.
 */
import { spawnSync } from "node:child_process";
import { createReadStream } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TZ_OFFSET_MINUTES = 180; // UTC+3
const IDLE_GAP_MS = 45 * 60 * 1000;
const MIN_BLOCK_MS = 60 * 1000;
const MIN_GAP_MS = 60 * 1000;
const USER_EMAIL = process.env.GAP_REPORT_USER_EMAIL ?? "omarhosamcodes@gmail.com";
const RAILWAY_PROJECT = "Internal Tools";
const RAILWAY_ENV = "Brainiac";
const RAILWAY_SERVICE = "Postgres-EEa9";

const OUTPUT_JSON = join(ROOT, ".cursor/canvases/data/chat-time-entry-gap-latest.json");

function parseArgs(argv) {
  const args = { days: 7, end: null, writeCanvas: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--write-canvas") args.writeCanvas = true;
    else if (a === "--end" && argv[i + 1]) {
      args.end = new Date(argv[++i]);
    } else if (a === "--days" && argv[i + 1]) {
      args.days = Number(argv[++i]);
    }
  }
  return args;
}

function zonedParts(date, offsetMinutes) {
  const shifted = new Date(date.getTime() + offsetMinutes * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
    ms: shifted.getUTCMilliseconds(),
  };
}

function formatLocal(isoUtc, offsetMinutes = TZ_OFFSET_MINUTES) {
  const d = new Date(isoUtc);
  const p = zonedParts(d, offsetMinutes);
  const pad = (n, w = 2) => String(n).padStart(w, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`;
}

function localDayKey(isoUtc) {
  const p = zonedParts(new Date(isoUtc), TZ_OFFSET_MINUTES);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function windowBounds(days, endDate) {
  const end = endDate ?? new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return { start, end };
}

async function resolveTranscriptsDir() {
  if (process.env.TRANSCRIPTS_DIR) {
    const dir = process.env.TRANSCRIPTS_DIR;
    try {
      await access(dir);
      return { dir, source: "TRANSCRIPTS_DIR" };
    } catch {
      return { dir: null, source: "TRANSCRIPTS_DIR", error: `TRANSCRIPTS_DIR not found: ${dir}` };
    }
  }

  const indexPath = join(ROOT, ".cursor/hooks/state/continual-learning-index.json");
  try {
    const raw = JSON.parse(await readFile(indexPath, "utf8"));
    const dir = raw.transcriptsDir;
    if (dir) {
      try {
        await access(dir);
        return { dir, source: "continual-learning-index" };
      } catch {
        return {
          dir: null,
          source: "continual-learning-index",
          error: `Indexed transcriptsDir not mounted in this environment: ${dir}`,
          indexedMainSessionsInWindow: null,
        };
      }
    }
  } catch {
    // ignore
  }

  return { dir: null, source: null, error: "No transcript directory configured or accessible" };
}

function extractTimestampMs(lineObj) {
  const candidates = [
    lineObj.timestamp,
    lineObj.createdAt,
    lineObj.time,
    lineObj.message?.timestamp,
    lineObj.message?.createdAt,
  ];
  for (const c of candidates) {
    if (c == null) continue;
    if (typeof c === "number") return c < 1e12 ? c * 1000 : c;
    const parsed = Date.parse(c);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
}

async function listMainTranscriptFiles(dir) {
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const id = ent.name;
    const main = join(dir, id, `${id}.jsonl`);
    try {
      await access(main);
      files.push(main);
    } catch {
      // skip
    }
  }
  return files;
}

async function collectMessageTimes(files, windowStart, windowEnd) {
  const times = [];
  for (const file of files) {
    const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line.trim()) continue;
      let obj;
      try {
        obj = JSON.parse(line);
      } catch {
        continue;
      }
      const ts = extractTimestampMs(obj);
      if (ts == null) continue;
      if (ts < windowStart.getTime() || ts > windowEnd.getTime()) continue;
      times.push(ts);
    }
  }
  times.sort((a, b) => a - b);
  return times;
}

function buildChatBlocks(messageTimes) {
  if (messageTimes.length === 0) return [];

  const blocks = [];
  let blockStart = messageTimes[0];
  let blockEnd = messageTimes[0];
  let prev = messageTimes[0];

  for (let i = 1; i < messageTimes.length; i++) {
    const t = messageTimes[i];
    if (t - prev > IDLE_GAP_MS) {
      if (blockEnd - blockStart >= MIN_BLOCK_MS) {
        blocks.push({ startMs: blockStart, endMs: blockEnd });
      }
      blockStart = t;
      blockEnd = t;
    } else {
      blockEnd = t;
    }
    prev = t;
  }
  if (blockEnd - blockStart >= MIN_BLOCK_MS) {
    blocks.push({ startMs: blockStart, endMs: blockEnd });
  }
  return blocks;
}

function mergeIntervals(intervals) {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start || a.end - b.end);
  const out = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const last = out[out.length - 1];
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end);
    } else {
      out.push({ ...cur });
    }
  }
  return out;
}

function subtractInterval(block, covered) {
  let segments = [{ start: block.startMs, end: block.endMs }];
  for (const cov of covered) {
    const next = [];
    for (const seg of segments) {
      if (cov.end <= seg.start || cov.start >= seg.end) {
        next.push(seg);
        continue;
      }
      if (cov.start > seg.start) {
        next.push({ start: seg.start, end: Math.min(cov.start, seg.end) });
      }
      if (cov.end < seg.end) {
        next.push({ start: Math.max(cov.end, seg.start), end: seg.end });
      }
    }
    segments = next;
  }
  return segments.filter((s) => s.end > s.start);
}

function hoursFromMs(ms) {
  return ms / 3_600_000;
}

function pickNeighbor(entries, gapStartMs, gapEndMs) {
  const gapDay = localDayKey(new Date(gapStartMs).toISOString());
  const sameDay = entries.filter((e) => localDayKey(e.startedAt) === gapDay);
  const pool = sameDay.length > 0 ? sameDay : entries;

  const prev = pool
    .filter((e) => e.endMs <= gapStartMs)
    .sort((a, b) => b.endMs - a.endMs)[0];
  if (prev) return { entry: prev, strategy: "previous-by-end" };

  const next = pool
    .filter((e) => e.startMs >= gapEndMs)
    .sort((a, b) => a.startMs - b.startMs)[0];
  if (next) return { entry: next, strategy: "next-by-start" };

  const gapMid = (gapStartMs + gapEndMs) / 2;
  const nearest = [...pool].sort(
    (a, b) =>
      Math.min(Math.abs(a.startMs - gapMid), Math.abs(a.endMs - gapMid)) -
      Math.min(Math.abs(b.startMs - gapMid), Math.abs(b.endMs - gapMid)),
  )[0];
  if (nearest) return { entry: nearest, strategy: sameDay.length > 0 ? "nearest-same-day" : "nearest-plus-minus-1-day" };

  const dayMs = 24 * 60 * 60 * 1000;
  const fallback = entries
    .filter((e) => Math.abs(e.startMs - gapMid) <= dayMs)
    .sort((a, b) => Math.abs(a.startMs - gapMid) - Math.abs(b.startMs - gapMid))[0];
  if (fallback) return { entry: fallback, strategy: "nearest-within-1-day" };
  return null;
}

async function queryTimeEntries(windowStart, windowEnd) {
  const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (databaseUrl) {
    return queryViaPg(databaseUrl, windowStart, windowEnd);
  }

  const railway = spawnSync(
    "npx",
    ["-y", "@railway/cli@4.10.0", "run", "--service", RAILWAY_SERVICE, "--", "printenv", "DATABASE_URL"],
    { encoding: "utf8", cwd: ROOT },
  );
  if (railway.status === 0 && railway.stdout?.trim()) {
    return queryViaPg(railway.stdout.trim(), windowStart, windowEnd);
  }

  return {
    ok: false,
    error:
      "Railway MCP is not configured in this agent environment; DATABASE_URL/POSTGRES_URL is unset; `railway run` failed or is unauthorized.",
    railwayStderr: railway.stderr?.trim() || null,
  };
}

async function queryViaPg(databaseUrl, windowStart, windowEnd) {
  let pg;
  try {
    pg = await import("pg");
  } catch {
    return { ok: false, error: "Node package `pg` is not installed; cannot query Postgres." };
  }

  const client = new pg.default.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    const sql = `
      SELECT
        te.id,
        te.team_id,
        te.project_id,
        te.task_id,
        te.started_at,
        te.ended_at,
        te.duration_seconds,
        p.name AS project_name
      FROM agency_ops_time_entry te
      INNER JOIN "user" u ON u.id = te.user_id
      LEFT JOIN agency_ops_project p ON p.id = te.project_id
      WHERE u.email = $1
        AND te.deleted_at IS NULL
        AND te.started_at < $3::timestamptz
        AND te.ended_at > $2::timestamptz
      ORDER BY te.started_at ASC
    `;
    const res = await client.query(sql, [USER_EMAIL, windowStart.toISOString(), windowEnd.toISOString()]);
    return { ok: true, rows: res.rows };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    await client.end().catch(() => {});
  }
}

function mapEntries(rows) {
  return rows.map((row) => {
    const startMs = new Date(row.started_at).getTime();
    const endMs = new Date(row.ended_at).getTime();
    return {
      id: row.id,
      teamId: row.team_id,
      projectId: row.project_id,
      taskId: row.task_id,
      projectName: row.project_name ?? row.project_id,
      startedAt: new Date(row.started_at).toISOString(),
      endedAt: new Date(row.ended_at).toISOString(),
      startMs,
      endMs,
      durationSeconds: row.duration_seconds,
    };
  });
}

function buildReport({ windowStart, windowEnd, blocks, entries, blockers }) {
  const entryIntervals = entries.map((e) => ({ start: e.startMs, end: e.endMs }));
  const mergedCoverage = mergeIntervals(entryIntervals);

  let chatMs = 0;
  let coveredMs = 0;
  const daily = new Map();
  const proposed = [];

  const ensureDay = (day) => {
    if (!daily.has(day)) {
      daily.set(day, { chatMs: 0, coveredMs: 0, entryMs: 0 });
    }
    return daily.get(day);
  };

  for (const e of entries) {
    const day = localDayKey(e.startedAt);
    const d = ensureDay(day);
    d.entryMs += Math.max(0, e.endMs - e.startMs);
  }

  for (const block of blocks) {
    const blockLen = block.endMs - block.startMs;
    chatMs += blockLen;
    const day = localDayKey(new Date(block.startMs).toISOString());
    ensureDay(day).chatMs += blockLen;

    const overlapping = mergedCoverage.filter(
      (c) => c.end > block.startMs && c.start < block.endMs,
    );
    for (const cov of overlapping) {
      const overlapStart = Math.max(cov.start, block.startMs);
      const overlapEnd = Math.min(cov.end, block.endMs);
      const overlapLen = Math.max(0, overlapEnd - overlapStart);
      coveredMs += overlapLen;
      ensureDay(day).coveredMs += overlapLen;
    }

    const gaps = subtractInterval(
      { startMs: block.startMs, endMs: block.endMs },
      overlapping,
    );
    for (const gap of gaps) {
      const gapLen = gap.end - gap.start;
      if (gapLen < MIN_GAP_MS) continue;
      const neighbor = pickNeighbor(entries, gap.start, gap.end);
      proposed.push({
        startLocal: formatLocal(new Date(gap.start).toISOString()),
        endLocal: formatLocal(new Date(gap.end).toISOString()),
        hours: hoursFromMs(gapLen),
        neighborProject: neighbor?.entry.projectName ?? "(no neighbor)",
        neighborStrategy: neighbor?.strategy ?? "none",
        inherit: neighbor
          ? {
              teamId: neighbor.entry.teamId,
              projectId: neighbor.entry.projectId,
              taskId: neighbor.entry.taskId,
            }
          : null,
        description: "UX",
        source: "manual",
        isBillable: true,
      });
    }
  }

  const windowEntryMs = entries.reduce((sum, e) => sum + Math.max(0, e.endMs - e.startMs), 0);
  const addMs = proposed.reduce((sum, p) => sum + p.hours * 3_600_000, 0);

  return {
    previewOnly: true,
    generatedAtUtc: new Date().toISOString(),
    userEmail: USER_EMAIL,
    timezone: "UTC+3",
    window: {
      startUtc: windowStart.toISOString(),
      endUtc: windowEnd.toISOString(),
      startLocal: formatLocal(windowStart.toISOString()),
      endLocal: formatLocal(windowEnd.toISOString()),
    },
    blockers,
    chatBlocks: blocks.length,
    daily: [...daily.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, stats]) => ({
        day,
        chatHours: hoursFromMs(stats.chatMs),
        coveredHours: hoursFromMs(stats.coveredMs),
        entryHours: hoursFromMs(stats.entryMs),
      })),
    proposedAdds: proposed,
    totals: {
      windowEntryHours: hoursFromMs(windowEntryMs),
      proposedAddHours: hoursFromMs(addMs),
      projectedEntryHours: hoursFromMs(windowEntryMs + addMs),
      chatHours: hoursFromMs(chatMs),
      coveredHours: hoursFromMs(coveredMs),
    },
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const { start: windowStart, end: windowEnd } = windowBounds(args.days, args.end);

  const blockers = [];

  const transcriptResolution = await resolveTranscriptsDir();
  let messageTimes = [];
  if (!transcriptResolution.dir) {
    blockers.push({
      area: "transcripts",
      message: transcriptResolution.error ?? "Transcripts unavailable",
      railwayHint: transcriptResolution.dir === null ? transcriptResolution.error : undefined,
    });
  } else {
    const files = await listMainTranscriptFiles(transcriptResolution.dir);
    messageTimes = await collectMessageTimes(files, windowStart, windowEnd);
    if (messageTimes.length === 0) {
      blockers.push({
        area: "transcripts",
        message: `No timestamped messages in window from ${files.length} main transcript file(s) under ${transcriptResolution.dir}`,
      });
    }
  }

  const blocks = buildChatBlocks(messageTimes);

  const dbResult = await queryTimeEntries(windowStart, windowEnd);
  let entries = [];
  if (!dbResult.ok) {
    blockers.push({
      area: "railway-postgres",
      message: dbResult.error,
      detail: dbResult.railwayStderr,
      target: `${RAILWAY_PROJECT} / ${RAILWAY_ENV} / ${RAILWAY_SERVICE}`,
    });
  } else {
    entries = mapEntries(dbResult.rows);
  }

  const report =
    blockers.length > 0
      ? {
          previewOnly: true,
          generatedAtUtc: new Date().toISOString(),
          userEmail: USER_EMAIL,
          timezone: "UTC+3",
          window: {
            startUtc: windowStart.toISOString(),
            endUtc: windowEnd.toISOString(),
            startLocal: formatLocal(windowStart.toISOString()),
            endLocal: formatLocal(windowEnd.toISOString()),
          },
          blockers,
          daily: [],
          proposedAdds: [],
          totals: null,
          note: "Report blocked — no metrics invented. Fix blockers and re-run scripts/chat-time-entry-gap-report.mjs",
        }
      : buildReport({ windowStart, windowEnd, blocks, entries, blockers: [] });

  await mkdir(dirname(OUTPUT_JSON), { recursive: true });
  await writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Wrote ${OUTPUT_JSON}`);
  console.log(JSON.stringify({ blockers: report.blockers ?? [], totals: report.totals }, null, 2));

  if (args.writeCanvas) {
    const { generateCanvas } = await import("./chat-time-entry-gap-report-canvas.mjs");
    await generateCanvas(report);
  }

  process.exit(blockers.length > 0 ? 2 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
