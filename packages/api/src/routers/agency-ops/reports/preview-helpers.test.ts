import { describe, expect, test } from "bun:test";

import { pickPreviewClients, resolveClientPreviewAmount } from "./preview-helpers";

describe("pickPreviewClients", () => {
  test("takes the first clients in name order and counts the rest as omitted", () => {
    const picked = pickPreviewClients(
      [
        { clientId: "b", clientName: "Zebra" },
        { clientId: "a", clientName: "Acme" },
        { clientId: "c", clientName: "North" },
        { clientId: "d", clientName: "Delta" },
      ],
      3,
    );

    expect(picked.preview.map((client) => client.clientName)).toEqual(["Acme", "Delta", "North"]);
    expect(picked.omittedClientCount).toBe(1);
    expect(picked.totalClientCount).toBe(4);
  });

  test("omits nothing when the catalog fits the limit", () => {
    const picked = pickPreviewClients([{ clientId: "a", clientName: "Acme" }]);
    expect(picked.omittedClientCount).toBe(0);
    expect(picked.preview).toHaveLength(1);
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
