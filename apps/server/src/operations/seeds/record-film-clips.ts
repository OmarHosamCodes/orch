import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import { makeSignature } from "better-auth/crypto";
import { db } from "@orch/db";
import { session, user } from "@orch/db/schema";
import { env } from "@orch/env/server";
import { eq } from "drizzle-orm";
import { createWorkspaceId } from "@orch/workspace";

const ORIGIN = "http://localhost:7001";
const OWNER_EMAIL = "omarhosamcodes@gmail.com";
const OUT_DIR = join(import.meta.dir, "../../../../../brag-output/composition/assets/product");
const FORBIDDEN = /Scale Client|Tribe \d|Scale Project|Q2 Launch|Northwind|founder@orch\.test/i;
const HIDE_ORCH = `
  button[data-eclipse-mood],
  [data-workspace-agent-root],
  [data-workspace-agent-overlay] {
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
`;

type BrowserEl = {
  childElementCount: number;
  textContent: string | null;
  innerText: string;
  style: { visibility: string };
  scrollHeight: number;
  clientHeight: number;
  clientWidth: number;
  scrollTop: number;
};

type BrowserWin = {
  document: {
    querySelectorAll: (selector: string) => Iterable<BrowserEl>;
    scrollingElement: BrowserEl | null;
  };
  getComputedStyle: (el: BrowserEl) => { overflowY: string };
  requestAnimationFrame: (cb: (time: number) => void) => number;
  performance: { now: () => number };
};

type Clip = {
  name: string;
  path: string;
  durationMs: number;
  hideOrch: boolean;
  ready: (page: Page) => Promise<void>;
  play: (page: Page) => Promise<void>;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureSessionToken() {
  const [owner] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, OWNER_EMAIL))
    .limit(1);
  if (!owner) throw new Error(`Owner ${OWNER_EMAIL} not found`);

  const token = `film-${createWorkspaceId("session")}`;
  const now = new Date();
  await db.insert(session).values({
    id: createWorkspaceId("session"),
    token,
    userId: owner.id,
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    createdAt: now,
    updatedAt: now,
  });
  const signature = await makeSignature(token, env.BETTER_AUTH_SECRET);
  return `${token}.${signature}`;
}

async function hideFilmChrome(page: Page) {
  await page.evaluate(() => {
    const { document } = globalThis as unknown as BrowserWin;
    for (const el of document.querySelectorAll("*")) {
      if (el.childElementCount === 0 && (el.textContent || "").includes("@")) {
        el.style.visibility = "hidden";
      }
    }
  });
}

async function rejectForbidden(page: Page, name: string) {
  const text = await page
    .locator("body")
    .innerText({ timeout: 5000 })
    .catch(() => "");
  if (FORBIDDEN.test(text)) {
    throw new Error(`${name} still shows forbidden seed names`);
  }
}

async function waitForText(page: Page, pattern: string | RegExp, timeout = 25_000) {
  await page.getByText(pattern).first().waitFor({ state: "visible", timeout });
}

async function animateScroll(
  page: Page,
  selectorHint: string,
  distance: number,
  durationMs: number,
) {
  await page.evaluate(
    async ({ hint, distance, durationMs }) => {
      const win = globalThis as unknown as BrowserWin;
      const candidates = [...win.document.querySelectorAll("*")]
        .filter((el) => {
          const style = win.getComputedStyle(el);
          return (
            (style.overflowY === "auto" || style.overflowY === "scroll") &&
            el.scrollHeight > el.clientHeight + 80
          );
        })
        .sort((a, b) => b.clientHeight * b.clientWidth - a.clientHeight * a.clientWidth);
      const hinted = hint ? candidates.find((el) => el.innerText.includes(hint)) : undefined;
      const el = hinted ?? candidates[0] ?? win.document.scrollingElement;
      if (!el) return;
      const start = win.performance.now();
      const from = el.scrollTop;
      const to = Math.min(el.scrollHeight - el.clientHeight, from + distance);
      await new Promise<void>((resolve) => {
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / durationMs);
          el.scrollTop = from + (to - from) * t;
          if (t < 1) win.requestAnimationFrame(tick);
          else resolve();
        };
        win.requestAnimationFrame(tick);
      });
    },
    { hint: selectorHint, distance, durationMs },
  );
}

async function panCanvas(page: Page, durationMs: number) {
  const pane = page.locator(".react-flow__pane").first();
  await pane.waitFor({ state: "visible", timeout: 20_000 });
  const box = await pane.boundingBox();
  if (!box) return;
  const startX = box.x + box.width * 0.55;
  const startY = box.y + box.height * 0.45;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  const steps = 36;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await page.mouse.move(startX - t * 280, startY - t * 90, { steps: 1 });
    await sleep(durationMs / steps);
  }
  await page.mouse.up();
}

const CLIPS: Clip[] = [
  {
    name: "landing",
    path: "/",
    durationMs: 2200,
    hideOrch: true,
    ready: async (page) => {
      await waitForText(page, /Map your thinking|Canvas for ideas|Agency for execution|Orch/);
      await page
        .locator("canvas")
        .first()
        .waitFor({ timeout: 12_000 })
        .catch(() => undefined);
      await sleep(600);
    },
    play: async () => {
      await sleep(2200);
    },
  },
  {
    name: "canvas",
    path: "/canvas",
    durationMs: 2800,
    hideOrch: true,
    ready: async (page) => {
      await page.waitForURL(/\/canvas/, { timeout: 20_000 });
      await page.locator(".react-flow__node").first().waitFor({ timeout: 25_000 });
      const nodeCount = await page.locator(".react-flow__node").count();
      if (nodeCount < 12) {
        throw new Error(`Canvas only has ${nodeCount} nodes`);
      }
      await page
        .getByLabel("Fit all nodes")
        .click({ timeout: 8000 })
        .catch(() => undefined);
      await sleep(400);
    },
    play: async (page) => {
      for (let i = 0; i < 5; i++) {
        await page.getByLabel("Zoom in").click();
        await sleep(160);
      }
      await panCanvas(page, 1600);
    },
  },
  {
    name: "tracker",
    path: "/agency",
    durationMs: 3400,
    hideOrch: true,
    ready: async (page) => {
      await page
        .getByRole("button", { name: /^Start$/ })
        .first()
        .waitFor({ timeout: 25_000 });
      await waitForText(page, /Today|Yesterday|Harbor Digital/);
    },
    play: async (page) => {
      await animateScroll(page, "Today", 1600, 3000);
    },
  },
  {
    name: "dashboard",
    path: "/agency/dashboard",
    durationMs: 2400,
    hideOrch: true,
    ready: async (page) => {
      await waitForText(page, /Paid|Waste|Internal|Project share/);
    },
    play: async (page) => {
      await animateScroll(page, "Paid", 420, 2000);
    },
  },
  {
    name: "reports",
    path: "/agency/reports",
    durationMs: 2600,
    hideOrch: true,
    ready: async (page) => {
      await waitForText(page, /Scope|Recipes|Export|Harbor Digital/);
    },
    play: async (page) => {
      await animateScroll(page, "Harbor", 700, 2200);
    },
  },
  {
    name: "money",
    path: "/agency/management/money",
    durationMs: 3000,
    hideOrch: true,
    ready: async (page) => {
      await waitForText(page, "Harbor Digital");
      await waitForText(page, /Part paid|Paid/);
      await page.getByText("Arc & Grain").first().waitFor({ timeout: 20_000 });
    },
    play: async (page) => {
      await animateScroll(page, "Harbor", 520, 2600);
    },
  },
  {
    name: "people",
    path: "/agency/management/people",
    durationMs: 2600,
    hideOrch: true,
    ready: async (page) => {
      await waitForText(page, /Maya Chen|Luca Rossi|Directory/);
      await waitForText(page, /members/);
    },
    play: async (page) => {
      const gallery = page
        .locator('[data-testid="people-directory"] canvas, [data-testid="people-directory"]')
        .first();
      const box = await gallery.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.4);
        for (let i = 0; i < 18; i++) {
          await page.mouse.wheel(90, 0);
          await sleep(120);
        }
      } else {
        await sleep(2400);
      }
    },
  },
  {
    name: "orch",
    path: "/canvas",
    durationMs: 4600,
    hideOrch: false,
    ready: async (page) => {
      await page.waitForURL(/\/canvas/, { timeout: 20_000 });
      await page.locator(".react-flow__node").first().waitFor({ timeout: 25_000 });
      await page
        .getByLabel("Fit all nodes")
        .click({ timeout: 8000 })
        .catch(() => undefined);
      await sleep(300);
    },
    play: async (page) => {
      const orch = page.getByRole("button", { name: "Orch" }).first();
      await orch.click({ timeout: 8000 });
      await sleep(400);
      const composer = page.locator("textarea, [contenteditable='true']").first();
      await composer.click({ timeout: 5000 }).catch(() => undefined);
      await page.keyboard.type("What's slipping on Harbor this week?", { delay: 42 });
      await sleep(1800);
    },
  },
];

async function recordClip(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  token: string,
  clip: Clip,
) {
  mkdirSync(OUT_DIR, { recursive: true });
  const rawDir = join(OUT_DIR, `.raw-${clip.name}`);
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: { dir: rawDir, size: { width: 1920, height: 1080 } },
    locale: "en-US",
  });
  await context.addCookies([
    {
      name: "better-auth.session_token",
      value: token,
      url: ORIGIN,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const page = await context.newPage();
  if (clip.hideOrch) await page.addStyleTag({ content: HIDE_ORCH });
  await page.goto(`${ORIGIN}${clip.path}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  if (clip.hideOrch) await page.addStyleTag({ content: HIDE_ORCH });
  try {
    await clip.ready(page);
  } catch (error) {
    const shot = join(OUT_DIR, `${clip.name}-fail.png`);
    await page.screenshot({ path: shot, fullPage: false });
    console.error(`${clip.name} failed at ${page.url()} — ${shot}`);
    throw error;
  }
  await hideFilmChrome(page);
  await rejectForbidden(page, clip.name);
  await clip.play(page);
  await sleep(200);
  const video = page.video();
  await context.close();
  const webm = video ? await video.path() : null;
  if (!webm) throw new Error(`No video for ${clip.name}`);
  const mp4 = join(OUT_DIR, `${clip.name}.mp4`);
  const take = (clip.durationMs / 1000).toFixed(2);
  const proc = Bun.spawn(
    [
      "ffmpeg",
      "-y",
      "-sseof",
      `-${take}`,
      "-i",
      webm,
      "-t",
      take,
      "-an",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      mp4,
    ],
    { stdout: "inherit", stderr: "inherit" },
  );
  const code = await proc.exited;
  if (code !== 0) throw new Error(`ffmpeg failed for ${clip.name}`);
  console.log(`Recorded ${clip.name} (last ${take}s) -> ${mp4}`);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const token = await ensureSessionToken();
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: false,
    args: [
      "--disable-dev-shm-usage",
      "--no-sandbox",
      "--window-size=1920,1080",
      "--use-gl=angle",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
    ],
  });
  const only = process.argv.slice(2);
  const clips = only.length > 0 ? CLIPS.filter((clip) => only.includes(clip.name)) : CLIPS;
  try {
    for (const clip of clips) {
      console.log(`Recording ${clip.name}...`);
      await recordClip(browser, token, clip);
    }
  } finally {
    await browser.close();
  }
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
