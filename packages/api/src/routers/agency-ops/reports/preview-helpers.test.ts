import { describe, expect, test } from "bun:test";

import { resolveClientPreviewAmount, sortPreviewClients } from "./preview-helpers";

describe("sortPreviewClients", () => {
  test("orders every client by name", () => {
    const sorted = sortPreviewClients([
      { clientId: "b", clientName: "Zebra" },
      { clientId: "a", clientName: "Acme" },
      { clientId: "c", clientName: "North" },
      { clientId: "d", clientName: "Delta" },
    ]);

    expect(sorted.map((client) => client.clientName)).toEqual(["Acme", "Delta", "North", "Zebra"]);
  });
});

describe("resolveClientPreviewAmount", () => {
  test("uses the source rate in the client currency", () => {
    expect(
      resolveClientPreviewAmount({
        rateAmount: 50_000,
        sourceRateAmount: 10_000,
        currency: "usd",
        nonWasteSeconds: 3_600,
      }),
    ).toEqual({ amount: 10_000, amountCurrency: "USD" });
  });

  test("returns null when no positive rate exists", () => {
    expect(
      resolveClientPreviewAmount({
        rateAmount: 0,
        sourceRateAmount: null,
        currency: "EGP",
        nonWasteSeconds: 7_200,
      }),
    ).toEqual({ amount: null, amountCurrency: null });
  });
});
