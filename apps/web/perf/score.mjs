/** @typedef {import('./budgets.json')} Budgets */

const GRADE_ORDER = ["S", "A", "B", "C", "D", "F"];

/**
 * @param {number} score
 * @param {Record<string, number>} gradeThresholds
 */
export function scoreToGrade(score, gradeThresholds) {
  if (score >= gradeThresholds.S) return "S";
  if (score >= gradeThresholds.A) return "A";
  if (score >= gradeThresholds.B) return "B";
  if (score >= gradeThresholds.C) return "C";
  if (score >= gradeThresholds.D) return "D";
  return "F";
}

/**
 * @param {string} grade
 * @param {string} minGrade
 */
function gradeMeetsMinimum(grade, minGrade) {
  return GRADE_ORDER.indexOf(grade) <= GRADE_ORDER.indexOf(minGrade);
}

/**
 * @param {number | null | undefined} value
 * @param {number} threshold
 */
function metricPasses(value, threshold) {
  if (value == null || Number.isNaN(value)) return false;
  return value <= threshold;
}

/**
 * @param {number | null | undefined} value
 * @param {number} threshold
 */
function metricPartial(value, threshold) {
  if (value == null || Number.isNaN(value)) return 0;
  if (value <= threshold) return 1;
  const ratio = threshold / value;
  return Math.max(0, Math.min(1, ratio));
}

/**
 * @param {{
 *   lcpMs: number | null;
 *   inpMs: number | null;
 *   cls: number | null;
 *   lighthouseScore: number | null;
 *   bundlePass: boolean;
 *   bundleRatio?: number;
 * }} metrics
 * @param {{
 *   lcpMs: number;
 *   inpMs: number;
 *   cls: number;
 *   minGrade: string;
 *   minScore: number;
 * }} tier
 * @param {{ grades: Record<string, number> }} budgets
 */
export function computeRouteScore(metrics, tier, budgets) {
  const lighthouseComponent =
    metrics.lighthouseScore == null ? 0 : Math.max(0, Math.min(100, metrics.lighthouseScore)) * 0.4;

  const lcpPart = metricPartial(metrics.lcpMs, tier.lcpMs);
  const inpPart = metricPartial(metrics.inpMs, tier.inpMs);
  const clsPart = metricPartial(metrics.cls, tier.cls);
  const cwvComponent = ((lcpPart + inpPart + clsPart) / 3) * 40;

  const bundleRatio = metrics.bundleRatio ?? (metrics.bundlePass ? 1 : 0.5);
  const bundleComponent = Math.max(0, Math.min(1, bundleRatio)) * 20;

  const score = Math.round(lighthouseComponent + cwvComponent + bundleComponent);
  const grade = scoreToGrade(score, budgets.grades);

  const cwvPass =
    metricPasses(metrics.lcpMs, tier.lcpMs) &&
    metricPasses(metrics.inpMs, tier.inpMs) &&
    metricPasses(metrics.cls, tier.cls);

  const lighthousePass =
    metrics.lighthouseScore != null && metrics.lighthouseScore >= tier.lighthouseMin;

  const pass =
    gradeMeetsMinimum(grade, tier.minGrade) &&
    score >= tier.minScore &&
    lighthousePass &&
    cwvPass &&
    metrics.bundlePass;

  return {
    score,
    grade,
    pass,
    components: {
      lighthouse: Math.round(lighthouseComponent * 10) / 10,
      cwv: Math.round(cwvComponent * 10) / 10,
      bundle: Math.round(bundleComponent * 10) / 10,
    },
    cwvPass,
    lighthousePass,
  };
}

/**
 * @param {number} value
 * @param {number} unit
 */
export function formatMs(value) {
  if (value == null || Number.isNaN(value)) return "—";
  if (value >= 1000) return `${(value / 1000).toFixed(1)}s`;
  return `${Math.round(value)}ms`;
}

/**
 * @param {number | null | undefined} value
 */
export function formatCls(value) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(3);
}

/**
 * @param {number | null} baseline
 * @param {number | null} current
 * @param {number} allowedPercent
 * @param {{ lowerIsBetter?: boolean }} [options]
 */
export function checkRegression(baseline, current, allowedPercent, options = {}) {
  const lowerIsBetter = options.lowerIsBetter ?? true;
  if (baseline == null || current == null) return { pass: true, deltaPercent: null };
  if (baseline <= 0) return { pass: true, deltaPercent: 0 };
  const deltaPercent = ((current - baseline) / baseline) * 100;
  const pass = lowerIsBetter ? deltaPercent <= allowedPercent : deltaPercent >= -allowedPercent;
  return {
    pass,
    deltaPercent: Math.round(deltaPercent * 10) / 10,
  };
}
