import { describe, expect, test } from "bun:test";

import { getDicebearGlyphAvatarPngUrl, getDicebearGlyphAvatarUrl } from "./dicebear-avatar-url";

describe("getDicebearGlyphAvatarUrl", () => {
  test("seeds glyphs URL and encodes the seed", () => {
    expect(getDicebearGlyphAvatarUrl("Ada Lovelace")).toBe(
      "https://api.dicebear.com/10.x/glyphs/svg?seed=Ada%20Lovelace",
    );
  });

  test("falls back to orch when seed is blank", () => {
    expect(getDicebearGlyphAvatarUrl("   ")).toBe(
      "https://api.dicebear.com/10.x/glyphs/svg?seed=orch",
    );
  });
});

describe("getDicebearGlyphAvatarPngUrl", () => {
  test("seeds a raster glyphs URL for WebGL textures", () => {
    expect(getDicebearGlyphAvatarPngUrl("Ada Lovelace")).toBe(
      "https://api.dicebear.com/10.x/glyphs/png?seed=Ada%20Lovelace&size=512",
    );
  });
});
