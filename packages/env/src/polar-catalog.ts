export type PolarCatalog = {
  agencyProductId: string | null;
  unlimitedProductId: string | null;
};

type PolarCatalogEnv = {
  POLAR_PRODUCT_PRO?: string;
  POLAR_PRODUCT_AGENCY?: string;
  POLAR_PRODUCT_AGENCY_UNLIMITED?: string;
};

export type PolarCatalogPlan = "agency" | "agency_unlimited";

function firstProductId(value: string | undefined): string | null {
  return value?.split(",").map((id) => id.trim()).find(Boolean) ?? null;
}

export function resolvePolarCatalog(input: PolarCatalogEnv): PolarCatalog {
  return {
    agencyProductId:
      firstProductId(input.POLAR_PRODUCT_AGENCY) ?? firstProductId(input.POLAR_PRODUCT_PRO),
    unlimitedProductId: firstProductId(input.POLAR_PRODUCT_AGENCY_UNLIMITED),
  };
}

export function planForPolarProductId(
  catalog: PolarCatalog,
  productId: string,
): PolarCatalogPlan | null {
  if (productId === catalog.agencyProductId) {
    return "agency";
  }
  if (productId === catalog.unlimitedProductId) {
    return "agency_unlimited";
  }
  return null;
}

export function polarCheckoutProducts(
  catalog: PolarCatalog,
): Array<{ productId: string; slug: "agency" | "agency-unlimited" }> {
  const products: Array<{ productId: string; slug: "agency" | "agency-unlimited" }> = [];
  if (catalog.agencyProductId) {
    products.push({ productId: catalog.agencyProductId, slug: "agency" });
  }
  if (catalog.unlimitedProductId) {
    products.push({ productId: catalog.unlimitedProductId, slug: "agency-unlimited" });
  }
  return products;
}
