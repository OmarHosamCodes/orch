import { expect, test } from "bun:test";

import {
  planForPolarProductId,
  polarCheckoutProducts,
  resolvePolarCatalog,
} from "./polar-catalog";

test("Agency env overrides POLAR_PRODUCT_PRO fallback", () => {
  const catalog = resolvePolarCatalog({
    POLAR_PRODUCT_PRO: "legacy-pro,other",
    POLAR_PRODUCT_AGENCY: "agency-id",
    POLAR_PRODUCT_AGENCY_UNLIMITED: "unlimited-id",
  });
  expect(catalog).toEqual({
    agencyProductId: "agency-id",
    unlimitedProductId: "unlimited-id",
  });
  expect(planForPolarProductId(catalog, "agency-id")).toBe("agency");
  expect(planForPolarProductId(catalog, "unlimited-id")).toBe("agency_unlimited");
  expect(planForPolarProductId(catalog, "polar-credits")).toBeNull();
  expect(polarCheckoutProducts(catalog)).toEqual([
    { productId: "agency-id", slug: "agency" },
    { productId: "unlimited-id", slug: "agency-unlimited" },
  ]);
});

test("without Agency override, first POLAR_PRODUCT_PRO id is Agency", () => {
  const catalog = resolvePolarCatalog({ POLAR_PRODUCT_PRO: "polar-pro,ignored" });
  expect(catalog.agencyProductId).toBe("polar-pro");
  expect(catalog.unlimitedProductId).toBeNull();
  expect(polarCheckoutProducts(catalog)).toEqual([{ productId: "polar-pro", slug: "agency" }]);
});
