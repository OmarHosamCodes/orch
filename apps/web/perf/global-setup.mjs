import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const perfDir = resolve(__dirname);
const storageStatePath = resolve(perfDir, ".auth", "storage-state.json");

/**
 * @param {{ baseUrl: string; email?: string; password?: string }} options
 */
export async function runGlobalSetup({ baseUrl }) {
  await mkdir(resolve(perfDir, ".auth"), { recursive: true });

  const existing = process.env.PERF_STORAGE_STATE;
  if (existing) {
    await writeStorageStateMarker(existing);
    return existing;
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
    await context.storageState({ path: storageStatePath });
    await writeStorageStateMarker(storageStatePath);

    if (process.env.PERF_REQUIRE_AUTH === "1") {
      throw new Error(
        "Login is Google-only and /api/auth/sign-in/email is disabled. Pass PERF_STORAGE_STATE to a Playwright storageState JSON captured after a real sign-in.",
      );
    }

    return storageStatePath;
  } finally {
    await browser.close();
  }
}

/**
 * @param {string} [storageStatePathArg]
 */
async function writeStorageStateMarker(storageStatePathArg = storageStatePath) {
  await writeFile(
    resolve(perfDir, ".auth", "session.json"),
    JSON.stringify({ storageStatePath: storageStatePathArg }, null, 2),
    "utf8",
  );
}

export { storageStatePath };
