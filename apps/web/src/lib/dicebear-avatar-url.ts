const DICEBEAR_GLYPHS_SVG = "https://api.dicebear.com/10.x/glyphs/svg";
const DICEBEAR_GLYPHS_PNG = "https://api.dicebear.com/10.x/glyphs/png";

function dicebearSeed(seed: string): string {
  return seed.trim() || "orch";
}

/** Stable DiceBear Glyphs fallback for missing or failed person avatars. */
export function getDicebearGlyphAvatarUrl(seed: string): string {
  return `${DICEBEAR_GLYPHS_SVG}?seed=${encodeURIComponent(dicebearSeed(seed))}`;
}

/** Raster Glyphs URL for WebGL textures that cannot consume SVG. */
export function getDicebearGlyphAvatarPngUrl(seed: string, size = 512): string {
  return `${DICEBEAR_GLYPHS_PNG}?seed=${encodeURIComponent(dicebearSeed(seed))}&size=${size}`;
}
