/** Price tracked time for Money income (billable rates; waste tracked separately). */

import { resolveMoneyValue, type MoneyFxRateRow } from "./money-currency";

export function amountFromDurationAndRate(durationSeconds: number, rateAmount: number): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
    throw new Error("durationSeconds must be a non-negative number.");
  }
  if (!Number.isFinite(rateAmount) || rateAmount < 0) {
    throw new Error("rateAmount must be a non-negative number.");
  }
  if (durationSeconds === 0 || rateAmount === 0) return 0;
  return Math.round((durationSeconds / 3600) * rateAmount);
}

function hasPositiveBillableRate(amount: number | null | undefined): amount is number {
  return amount != null && amount > 0;
}

/** Task → project → client; zero amounts inherit (only null/0 are skipped). */
export function pickWinningBillableRateLevel(
  task: BillableRateLevel,
  project: BillableRateLevel,
  client: BillableRateLevel,
): BillableRateLevel | null {
  if (hasPositiveBillableRate(task.billableRateAmount)) return task;
  if (hasPositiveBillableRate(project.billableRateAmount)) return project;
  if (hasPositiveBillableRate(client.billableRateAmount)) return client;
  return null;
}

/** Source rate when set; otherwise the stored catalog amount. Zero source inherits billable. */
export function catalogSourceRateAmount(
  sourceBillableRateAmount: number | null | undefined,
  billableRateAmount: number | null | undefined,
): number | null {
  if (hasPositiveBillableRate(sourceBillableRateAmount)) return sourceBillableRateAmount;
  if (hasPositiveBillableRate(billableRateAmount)) return billableRateAmount;
  return null;
}

/** Task override when set; else project; else inherit the client catalog rate. */
export function resolveEffectiveBillableRate(
  taskRateAmount: number | null,
  projectRateAmount: number | null,
  clientRateAmount: number | null,
): number | null {
  if (hasPositiveBillableRate(taskRateAmount)) return taskRateAmount;
  if (hasPositiveBillableRate(projectRateAmount)) return projectRateAmount;
  if (hasPositiveBillableRate(clientRateAmount)) return clientRateAmount;
  return null;
}

/** Winning catalog rate in source currency (task → project → client). */
export function resolveEffectiveSourceBillableRate(
  task: BillableRateLevel,
  project: BillableRateLevel,
  client: BillableRateLevel,
): { rateAmount: number | null; currency: string } {
  const winning = pickWinningBillableRateLevel(task, project, client);
  const fallbackCurrency = (client.currency || project.currency || "USD").toUpperCase();
  if (!winning) {
    return { rateAmount: null, currency: fallbackCurrency };
  }
  const rateAmount = catalogSourceRateAmount(
    winning.sourceBillableRateAmount,
    winning.billableRateAmount,
  );
  return {
    rateAmount,
    currency: (winning.currency || fallbackCurrency).toUpperCase(),
  };
}

export type BillableRateLevel = {
  /** Null means inherit from the next level. */
  billableRateAmount: number | null;
  sourceBillableRateAmount?: number | null;
  currency?: string | null;
};

/**
 * Pick the winning catalog rate (task → project → client), then convert source × FX
 * into agency minor units. Falls back to the stored agency amount when source is missing.
 */
export function convertWinningBillableRate(
  task: BillableRateLevel,
  project: BillableRateLevel,
  client: BillableRateLevel,
  agencyCurrency: string,
  rates: readonly MoneyFxRateRow[],
): number | null {
  const winning = pickWinningBillableRateLevel(task, project, client);
  if (!winning || !hasPositiveBillableRate(winning.billableRateAmount)) return null;
  if (hasPositiveBillableRate(winning.sourceBillableRateAmount) && winning.currency) {
    return resolveMoneyValue({
      sourceAmount: winning.sourceBillableRateAmount,
      sourceCurrency: winning.currency,
      agencyCurrency,
      rates,
    }).amount;
  }
  return winning.billableRateAmount;
}

function rateBucketKey(projectId: string, effectiveRate: number | null): string {
  return `${projectId}\0${effectiveRate ?? "null"}`;
}

export type ClientBillableIncomeRow = {
  clientId: string;
  clientName: string;
  category: "internal" | "external";
  projectId: string;
  durationSeconds: number;
  isWaste: boolean;
  taskRateAmount?: number | null;
  projectRateAmount: number | null;
  clientRateAmount: number | null;
  sourceRateAmount?: number | null;
  sourceRateCurrency?: string | null;
};

export type ClientMoneyActivity = {
  clientId: string;
  clientName: string;
  category: "internal" | "external";
  /** Non-waste seconds. */
  durationSeconds: number;
  billableAmount: number;
  /** Billable total priced in the winning catalog source currency. */
  sourceBillableAmount: number;
  rateCurrency: string;
  wasteAmount: number;
};

export type ExternalBillablePool = {
  billablePoolAmount: number;
  clients: ClientMoneyActivity[];
};

export type ClientInvoiceTimeEntry = {
  projectId: string;
  projectName: string;
  durationSeconds: number;
  isWaste: boolean;
  taskRateAmount?: number | null;
  projectRateAmount?: number | null;
};

export type PricedClientInvoiceProject = {
  projectId: string;
  projectName: string;
  durationSeconds: number;
  rateAmount: number;
  amount: number;
};

export function priceClientInvoiceProjects(
  entries: ReadonlyArray<ClientInvoiceTimeEntry>,
  clientRateAmount: number | null,
):
  | { ok: true; projects: PricedClientInvoiceProject[] }
  | { ok: false; reason: "missing_client_rate" } {
  const billableEntries = entries.filter((entry) => !entry.isWaste);
  /** Bucket by rate first so multi-rate time prices correctly, then coalesce to one line per project. */
  const byBucket = new Map<
    string,
    Pick<PricedClientInvoiceProject, "projectId" | "projectName" | "durationSeconds" | "rateAmount">
  >();

  for (const entry of billableEntries) {
    const rateAmount = resolveEffectiveBillableRate(
      entry.taskRateAmount ?? null,
      entry.projectRateAmount ?? null,
      clientRateAmount,
    );
    if (rateAmount === null) {
      return { ok: false, reason: "missing_client_rate" };
    }
    const key = rateBucketKey(entry.projectId, rateAmount);
    const existing = byBucket.get(key) ?? {
      projectId: entry.projectId,
      projectName: entry.projectName,
      durationSeconds: 0,
      rateAmount,
    };
    existing.durationSeconds += entry.durationSeconds;
    byBucket.set(key, existing);
  }

  const byProject = new Map<
    string,
    { projectId: string; projectName: string; durationSeconds: number; amount: number }
  >();
  for (const bucket of byBucket.values()) {
    const amount = amountFromDurationAndRate(bucket.durationSeconds, bucket.rateAmount);
    const existing = byProject.get(bucket.projectId);
    if (!existing) {
      byProject.set(bucket.projectId, {
        projectId: bucket.projectId,
        projectName: bucket.projectName,
        durationSeconds: bucket.durationSeconds,
        amount,
      });
      continue;
    }
    existing.durationSeconds += bucket.durationSeconds;
    existing.amount += amount;
  }

  const projects: PricedClientInvoiceProject[] = [...byProject.values()].map((project) => ({
    projectId: project.projectId,
    projectName: project.projectName,
    durationSeconds: project.durationSeconds,
    rateAmount:
      project.durationSeconds > 0
        ? Math.round(project.amount / (project.durationSeconds / 3600))
        : 0,
    amount: project.amount,
  }));

  return { ok: true, projects };
}

/** Aggregate per-client billable/waste amounts; pool sums external non-waste only. */
export function aggregateExternalBillableIncome(
  rows: ReadonlyArray<ClientBillableIncomeRow>,
): ExternalBillablePool {
  type ClientBucket = Omit<
    ClientMoneyActivity,
    "billableAmount" | "sourceBillableAmount" | "wasteAmount"
  > & {
    billableSecondsByBucket: Map<string, number>;
    wasteSecondsByBucket: Map<string, number>;
    effectiveRateByBucket: Map<string, number | null>;
    sourceRateByBucket: Map<string, number | null>;
  };
  const byClient = new Map<string, ClientBucket>();

  for (const row of rows) {
    const effectiveRate = resolveEffectiveBillableRate(
      row.taskRateAmount ?? null,
      row.projectRateAmount,
      row.clientRateAmount,
    );
    const bucketKey = rateBucketKey(row.projectId, effectiveRate);
    const existing = byClient.get(row.clientId) ?? {
      clientId: row.clientId,
      clientName: row.clientName,
      category: row.category,
      durationSeconds: 0,
      rateCurrency: (row.sourceRateCurrency || "USD").toUpperCase(),
      billableSecondsByBucket: new Map<string, number>(),
      wasteSecondsByBucket: new Map<string, number>(),
      effectiveRateByBucket: new Map<string, number | null>(),
      sourceRateByBucket: new Map<string, number | null>(),
    };
    const secondsByBucket = row.isWaste
      ? existing.wasteSecondsByBucket
      : existing.billableSecondsByBucket;
    secondsByBucket.set(bucketKey, (secondsByBucket.get(bucketKey) ?? 0) + row.durationSeconds);
    existing.effectiveRateByBucket.set(bucketKey, effectiveRate);
    const nextSourceRate = row.sourceRateAmount;
    if (hasPositiveBillableRate(nextSourceRate)) {
      existing.sourceRateByBucket.set(bucketKey, nextSourceRate);
    } else if (!existing.sourceRateByBucket.has(bucketKey)) {
      existing.sourceRateByBucket.set(bucketKey, nextSourceRate ?? null);
    }

    if (!row.isWaste) {
      existing.durationSeconds += row.durationSeconds;
    }
    byClient.set(row.clientId, existing);
  }

  const clients = [...byClient.values()]
    .map(
      ({
        billableSecondsByBucket,
        wasteSecondsByBucket,
        effectiveRateByBucket,
        sourceRateByBucket,
        ...client
      }): ClientMoneyActivity => ({
        ...client,
        billableAmount: [...billableSecondsByBucket.entries()].reduce(
          (total, [bucketKey, seconds]) => {
            const rate = effectiveRateByBucket.get(bucketKey) ?? 0;
            return total + amountFromDurationAndRate(seconds, rate);
          },
          0,
        ),
        sourceBillableAmount: [...billableSecondsByBucket.entries()].reduce(
          (total, [bucketKey, seconds]) => {
            const sourceRate = sourceRateByBucket.get(bucketKey);
            const rate = hasPositiveBillableRate(sourceRate)
              ? sourceRate
              : (effectiveRateByBucket.get(bucketKey) ?? 0);
            return total + amountFromDurationAndRate(seconds, rate);
          },
          0,
        ),
        wasteAmount: [...wasteSecondsByBucket.entries()].reduce((total, [bucketKey, seconds]) => {
          const rate = effectiveRateByBucket.get(bucketKey) ?? 0;
          return total + amountFromDurationAndRate(seconds, rate);
        }, 0),
      }),
    )
    .sort((a, b) => a.clientName.localeCompare(b.clientName));
  let billablePoolAmount = 0;
  for (const client of clients) {
    if (client.category === "external") {
      billablePoolAmount += client.billableAmount;
    }
  }

  return { billablePoolAmount, clients };
}
