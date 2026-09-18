export type TeamAvatarPreset = {
  id: string;
  label: string;
  glyph: "beam" | "orbit" | "initial";
};

export const TEAM_AVATAR_PRESETS: readonly TeamAvatarPreset[] = [
  { id: "beam", label: "Beam", glyph: "beam" },
  { id: "orbit", label: "Orbit", glyph: "orbit" },
  { id: "initial", label: "Initial", glyph: "initial" },
] as const;

export const TEAM_AVATAR_PRESET_PREFIX = "preset:";

const LEGACY_PRESET_IDS: Record<string, string> = {
  graphite: "beam",
  violet: "orbit",
  moss: "initial",
};

export function getTeamPresetId(image: string | null | undefined): string | null {
  if (!image?.startsWith(TEAM_AVATAR_PRESET_PREFIX)) return null;
  const raw = image.slice(TEAM_AVATAR_PRESET_PREFIX.length) || null;
  if (!raw) return null;
  return LEGACY_PRESET_IDS[raw] ?? raw;
}

export function toTeamPresetImage(presetId: string): string {
  return `${TEAM_AVATAR_PRESET_PREFIX}${presetId}`;
}

export function getTeamPreset(presetId: string | null | undefined): TeamAvatarPreset | null {
  if (!presetId) return null;
  return TEAM_AVATAR_PRESETS.find((preset) => preset.id === presetId) ?? null;
}
