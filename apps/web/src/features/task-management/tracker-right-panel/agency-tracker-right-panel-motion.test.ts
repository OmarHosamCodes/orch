import { describe, expect, test } from "bun:test";

import { panelBodyVariants, panelHostVariants } from "./agency-tracker-right-panel-motion";

describe("agency-tracker-right-panel-motion", () => {
  test("host variants expose hidden/show/exit without height", () => {
    expect(panelHostVariants.hidden).toBeDefined();
    expect(panelHostVariants.show).toBeDefined();
    expect(panelHostVariants.exit).toBeDefined();
    expect(panelHostVariants.show).not.toHaveProperty("height");
  });

  test("body variants use opacity and y only", () => {
    const show = panelBodyVariants.show;
    expect(show).toMatchObject({ opacity: 1, y: 0 });
    expect(show).not.toHaveProperty("height");
  });
});
