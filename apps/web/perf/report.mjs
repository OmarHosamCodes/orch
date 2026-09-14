import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { checkRegression, computeRouteScore, formatCls, formatMs, scoreToGrade } from "./score.mjs";

/**
 * @param {{
 *   generatedAt: string;
 *   ci: boolean;
 *   baseUrl: string;
 *   bundle: Record<string, unknown>;
 *   routes: Array<Record<string, unknown>>;
 *   failures: string[];
 * }} report
 * @param {string} outputDir
 */
export async function writeReports(report, outputDir) {
  const jsonPath = resolve(outputDir, "perf-report.json");
  const mdPath = resolve(outputDir, "perf-report.md");

  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(mdPath, renderMarkdown(report), "utf8");

  return { jsonPath, mdPath };
}

/**
 * @param {Record<string, unknown>} report
 */
function renderMarkdown(report) {
  const lines = [
    "# Performance Benchmark Report",
    "",
    `Generated: ${report.generatedAt}`,
    `Mode: ${report.ci ? "CI subset" : "full"}`,
    `Base URL: ${report.baseUrl}`,
    "",
    "## Bundle",
    "",
    `| Asset | Size | Budget | Status |`,
    `|-------|------|--------|--------|`,
    `| JS (gzip) | ${report.bundle.jsGzipKb} KB | ${report.bundle.jsBudgetKb} KB | ${report.bundle.pass ? "pass" : "**fail**"} |`,
    `| CSS (gzip) | ${report.bundle.cssGzipKb} KB | ${report.bundle.cssBudgetKb} KB | ${report.bundle.pass ? "pass" : "**fail**"} |`,
    "",
    "## Routes",
    "",
    "| Route | Tier | LCP | INP | CLS | LH Perf | Bundle | Score | Grade | Gate | Target |",
    "|-------|------|-----|-----|-----|---------|--------|-------|-------|------|--------|",
  ];

  for (const route of report.routes) {
    lines.push(
      `| \`${route.displayPath}\` | ${route.tierLabel} | ${formatMs(route.lcpMs)} | ${formatMs(route.inpMs)} | ${formatCls(route.cls)} | ${route.lighthouseScore ?? "—"} | ${route.bundlePass ? "pass" : "fail"} | ${route.score} | ${route.grade} | ${route.pass ? "pass" : "**fail**"} | ${route.targetPass ? "pass" : "miss"} |`,
    );
  }

  if (report.failures.length > 0) {
    lines.push("", "## CI gate failures", "");
    for (const failure of report.failures) {
      lines.push(`- ${failure}`);
    }
  }

  if (report.aspirationalFailures?.length > 0) {
    lines.push("", "## Aspirational target misses (informational)", "");
    for (const failure of report.aspirationalFailures) {
      lines.push(`- ${failure}`);
    }
  }

  if (report.failures.length === 0) {
    lines.push("", "CI gate passed.");
  }

  return `${lines.join("\n")}\n`;
}

/**
 * @param {{
 *   ci: boolean;
 *   baseUrl: string;
 *   budgets: import('./budgets.json');
 *   bundleResult: { jsGzipKb: number; cssGzipKb: number; pass: boolean; ratio: number };
 *   routeResults: Array<{
 *     id: string;
 *     displayPath: string;
 *     tier: string;
 *     tierLabel: string;
 *     lcpMs: number | null;
 *     inpMs: number | null;
 *     cls: number | null;
 *     lighthouseScore: number | null;
 *   }>;
 *   baseline: { routes?: Record<string, { lcpMs?: number; inpMs?: number; cls?: number }> } | null;
 * }} input
 */
export function buildReport(input) {
  const failures = [];
  const aspirationalFailures = [];
  const { budgets, bundleResult } = input;

  if (!bundleResult.pass) {
    failures.push(
      `Bundle over budget: JS ${bundleResult.jsGzipKb} KB (max ${budgets.bundle.jsGzipKb} KB), CSS ${bundleResult.cssGzipKb} KB (max ${budgets.bundle.cssGzipKb} KB)`,
    );
  }

  const routes = input.routeResults.map((route) => {
    const tier = budgets.tiers[route.tier];
    const scored = computeRouteScore(
      {
        lcpMs: route.lcpMs,
        inpMs: route.inpMs,
        cls: route.cls,
        lighthouseScore: route.lighthouseScore,
        bundlePass: bundleResult.pass,
        bundleRatio: bundleResult.ratio,
      },
      tier,
      budgets,
    );

    if (!scored.pass) {
      aspirationalFailures.push(
        `${route.displayPath}: grade ${scored.grade} (target ${tier.minGrade}), score ${scored.score} (target ${tier.minScore})`,
      );
    }

    const targetIssues = [];
    if (scored.score < tier.minScore) {
      targetIssues.push(`score ${scored.score} < ${tier.minScore}`);
    }
    if (route.lighthouseScore != null && route.lighthouseScore < tier.lighthouseMin) {
      targetIssues.push(`Lighthouse ${Math.round(route.lighthouseScore)} < ${tier.lighthouseMin}`);
    }
    if (!scored.cwvPass) {
      targetIssues.push("CWV thresholds missed");
    }

    const baselineRoute = input.baseline?.routes?.[route.id];
    const regressionIssues = [];

    if (baselineRoute) {
      for (const [metric, key] of [
        ["LCP", "lcpMs"],
        ["INP", "inpMs"],
        ["CLS", "cls"],
        ["Lighthouse", "lighthouseScore"],
      ]) {
        const regression = checkRegression(
          baselineRoute[key],
          route[key],
          budgets.regression.cwvPercent,
          { lowerIsBetter: metric !== "Lighthouse" },
        );
        if (!regression.pass) {
          regressionIssues.push(`${metric} +${regression.deltaPercent}%`);
        }
      }
    }

    const gatePass =
      bundleResult.pass && regressionIssues.length === 0 && targetIssues.length === 0;

    if (!gatePass) {
      if (!bundleResult.pass) {
        failures.push(`${route.displayPath}: bundle over budget`);
      }
      if (regressionIssues.length > 0) {
        failures.push(
          `${route.displayPath}: regressed vs baseline (${regressionIssues.join(", ")})`,
        );
      }
      if (targetIssues.length > 0) {
        failures.push(`${route.displayPath}: target miss (${targetIssues.join(", ")})`);
      }
    }

    return {
      ...route,
      tierLabel: tier.label,
      score: scored.score,
      grade: scored.grade,
      pass: gatePass,
      targetPass: scored.pass,
      components: scored.components,
      cwvPass: scored.cwvPass,
      lighthousePass: scored.lighthousePass,
      bundlePass: bundleResult.pass,
      regressionIssues,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    ci: input.ci,
    baseUrl: input.baseUrl,
    bundle: {
      jsGzipKb: bundleResult.jsGzipKb,
      cssGzipKb: bundleResult.cssGzipKb,
      jsBudgetKb: budgets.bundle.jsGzipKb,
      cssBudgetKb: budgets.bundle.cssGzipKb,
      pass: bundleResult.pass,
      ratio: bundleResult.ratio,
    },
    routes,
    failures,
    aspirationalFailures,
    pass: failures.length === 0,
  };
}

/**
 * @param {Record<string, unknown>} report
 * @param {string} baselinePath
 */
export async function writeBaselineFromReport(report, baselinePath) {
  /** @type {Record<string, { lcpMs: number | null; inpMs: number | null; cls: number | null; lighthouseScore: number | null; score: number; grade: string }>} */
  const routes = {};

  for (const route of report.routes) {
    routes[route.id] = {
      lcpMs: route.lcpMs,
      inpMs: route.inpMs,
      cls: route.cls,
      lighthouseScore: route.lighthouseScore,
      score: route.score,
      grade: route.grade,
    };
  }

  const baseline = {
    version: 1,
    capturedAt: report.generatedAt,
    bundle: {
      jsGzipKb: report.bundle.jsGzipKb,
      cssGzipKb: report.bundle.cssGzipKb,
    },
    routes,
  };

  await writeFile(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
  return baseline;
}
