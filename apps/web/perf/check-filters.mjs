import { chromium } from "playwright";
import assert from "node:assert/strict";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { writeFileSync, unlinkSync } from "node:fs";
const { values } = parseArgs({
  options: {
    "base-url": { type: "string", default: "http://localhost:7001" },
    "browser-path": { type: "string" },
    "cpu-rate": { type: "string", default: "4" },
    out: { type: "string" },
  },
});
const baseUrl = values["base-url"];
await fetch(baseUrl).then((response) => {
  if (!response.ok) throw new Error(`Dev server returned ${response.status}`);
});
const fixtureName = `.filter-check-${process.pid}.tsx`;
const fixture = fileURLToPath(new URL(`../${fixtureName}`, import.meta.url));
writeFileSync(
  fixture,
  `import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import {AgencyMultiSelectFilter} from './src/features/shared/filters/agency-multi-select-filter';
import './src/index.css';
const groups=Array.from({length:30},(_,g)=>({groupLabel:'Client '+g,sections:Array.from({length:5},(_,s)=>({sectionLabel:'Project '+g+'-'+s,options:Array.from({length:10},(_,i)=>({value:g+'-'+s+'-'+i,label:'Task '+g+'-'+s+'-'+i}))}))}));
function App(){const [selected,setSelected]=useState([]);return <main style={{padding:32}}><AgencyMultiSelectFilter label="All Tasks" groups={groups} values={selected} onValuesChange={setSelected}/><output>{selected.length} selected</output></main>};createRoot(document.getElementById('root')).render(<App/>);`,
);
let browser;
try {
  browser = await chromium.launch({
    executablePath: values["browser-path"],
    headless: true,
    args: ["--disable-features=LocalNetworkAccessChecks"],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/__filter-perf", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: `<html><head><script type="module">import R from '/@react-refresh';R.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>(type)=>type;window.__vite_plugin_react_preamble_installed__=true;</script></head><body><div id="root"></div><script type="module" src="/${fixtureName}"></script></body></html>`,
    }),
  );
  await page.goto(`${baseUrl}/__filter-perf`);
  await page.getByRole("button", { name: "All Tasks", exact: true }).waitFor();
  await page.waitForTimeout(500);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: Number(values["cpu-rate"]) });
  const result = { errors };
  async function metrics() {
    const { metrics } = await cdp.send("Performance.getMetrics");
    return Object.fromEntries(metrics.map((x) => [x.name, x.value]));
  }
  async function measure(name, action) {
    const before = await metrics();
    await page.evaluate(() => {
      window.framesMeasured = [];
      window.stopFrames = false;
      let last = performance.now();
      function tick(t) {
        window.framesMeasured.push(t - last);
        last = t;
        if (!window.stopFrames) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
    const start = performance.now();
    await action();
    const actionMs = performance.now() - start;
    await page.waitForTimeout(400);
    const frames = await page.evaluate(() => {
      window.stopFrames = true;
      return window.framesMeasured;
    });
    const after = await metrics();
    const sorted = frames.filter((x) => x >= 0).sort((a, b) => a - b);
    result[name] = {
      actionMs: Math.round(actionMs),
      frameP95: sorted[Math.floor(sorted.length * 0.95)],
      maxFrame: Math.max(...sorted),
      over50: sorted.filter((x) => x > 50).length,
      layoutCount: after.LayoutCount - before.LayoutCount,
      layoutMs: Math.round((after.LayoutDuration - before.LayoutDuration) * 1000),
      nodes: await page.locator("*").count(),
    };
  }
  await measure("filterOpen", () =>
    page.getByRole("button", { name: "All Tasks", exact: true }).click(),
  );
  result.checkboxes = await page.getByRole("checkbox").count();
  assert(result.checkboxes < 30, "The filter must render a bounded number of rows");
  await measure("filterSearch", () => page.getByRole("textbox").fill("Task 29-4-9"));
  await page.getByRole("checkbox", { name: "Task 29-4-9", exact: true }).check();
  result.selected = await page.locator("output").innerText();
  await page.keyboard.press("Escape");
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await page.getByRole("button", { name: "All Tasks", exact: true }).click();
  await page.getByRole("checkbox", { name: /^Select \d+ matching$/ }).check();
  assert.equal(await page.locator("output").innerText(), "1500 selected");
  await page.getByRole("textbox").fill("Task 29-4-9");
  await page.getByRole("checkbox", { name: /^Select \d+ matching$/ }).uncheck();
  assert.equal(await page.locator("output").innerText(), "1499 selected");
  await page.getByRole("textbox").fill("");
  await page.getByRole("checkbox", { name: "Task 0-0-0", exact: true }).focus();
  await page.keyboard.press("End");
  await page.waitForFunction(
    () => document.activeElement?.closest("label")?.textContent === "Task 29-4-9",
  );
  await page.keyboard.press("Home");
  await page.waitForFunction(
    () => document.activeElement?.closest("label")?.textContent === "Task 0-0-0",
  );
  await page.keyboard.press("Tab");
  await page.waitForFunction(
    () => document.activeElement?.closest("label")?.textContent === "Task 0-0-1",
  );
  await page.keyboard.press("Shift+Tab");
  await page.waitForFunction(
    () => document.activeElement?.closest("label")?.textContent === "Task 0-0-0",
  );
  await page.keyboard.press("Escape");
  await page.waitForFunction(
    () => document.activeElement?.getAttribute("aria-label") === "All Tasks",
  );
  for (let i = 0; i < 8; i++) {
    await page.getByRole("button", { name: "All Tasks", exact: true }).click();
    await page.getByRole("textbox").fill(i % 2 ? "Task 4" : "Task 29");
    await page.keyboard.press("Escape");
  }
  await page.waitForTimeout(200);
  assert.equal(await page.locator('[data-slot="popover-content"]').count(), 0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "All Tasks", exact: true }).click();
  await page.getByRole("textbox").fill("Task 29-4-9");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.keyboard.press("Escape");
  assert.deepEqual(errors, []);
  result.behavior = {
    selectAllAcrossVirtualRows: true,
    searchScopedUnselect: true,
    keyboardAcrossOffscreenRows: true,
    focusReturn: true,
    repeatedOpenClose: true,
    mobile: true,
  };
  console.log(JSON.stringify(result, null, 2));
  if (values.out) writeFileSync(values.out, JSON.stringify(result, null, 2));
} finally {
  await browser?.close();
  unlinkSync(fixture);
}
