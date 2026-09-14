import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const perfDir = resolve(__dirname);
const storageStatePath = resolve(perfDir, ".auth", "storage-state.json");

const DEFAULT_EMAIL = "founder@orch.test";
const DEFAULT_PASSWORD = "orch1234";

/**
 * @param {{ baseUrl: string; email?: string; password?: string }} options
 */
export async function runGlobalSetup({
  baseUrl,
  email = DEFAULT_EMAIL,
  password = DEFAULT_PASSWORD,
}) {
  await mkdir(resolve(perfDir, ".auth"), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: /sign in with email and password/i }).click();
  const emailInput = page.locator('input[type="email"]');
  await emailInput.waitFor({ state: "visible", timeout: 10_000 });
  await emailInput.fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();

  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 30_000,
  });

  await context.storageState({ path: storageStatePath });
  await browser.close();

  return storageStatePath;
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
