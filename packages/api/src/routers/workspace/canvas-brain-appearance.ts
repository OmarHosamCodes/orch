import {
  isAgencyEntityIconKey,
  type AgencyEntityIconKey,
} from "../agency-ops/shared/entity-icon-catalog";
import { agencyProjectColorHueIdSchema } from "../agency-ops/shared/schemas";

const ICON_KEY = "iconKey";
const COLOR_HUE_ID = "colorHueId";

export type CanvasBrainAppearance = {
  iconKey: AgencyEntityIconKey | null;
  colorHueId: number | null;
};

function parseColorHueId(value: unknown): number | null {
  if (value == null) return null;
  const parsed = agencyProjectColorHueIdSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function readCanvasBrainAppearance(
  settings: Record<string, unknown>,
): CanvasBrainAppearance {
  const rawIcon = settings[ICON_KEY];
  const iconKey = typeof rawIcon === "string" && isAgencyEntityIconKey(rawIcon) ? rawIcon : null;
  return {
    iconKey,
    colorHueId: parseColorHueId(settings[COLOR_HUE_ID]),
  };
}

export function mergeCanvasBrainAppearanceSettings(
  settings: Record<string, unknown>,
  patch: { iconKey?: AgencyEntityIconKey | null; colorHueId?: number | null },
): Record<string, unknown> {
  const next = { ...settings };

  if (patch.iconKey !== undefined) {
    if (patch.iconKey == null) {
      delete next[ICON_KEY];
    } else {
      next[ICON_KEY] = patch.iconKey;
    }
  }

  if (patch.colorHueId !== undefined) {
    if (patch.colorHueId == null) {
      delete next[COLOR_HUE_ID];
    } else {
      const parsed = agencyProjectColorHueIdSchema.parse(patch.colorHueId);
      next[COLOR_HUE_ID] = parsed;
    }
  }

  return next;
}

export function buildCanvasBrainCreateSettings(input: {
  iconKey?: AgencyEntityIconKey | null;
  colorHueId?: number | null;
}): Record<string, unknown> {
  return mergeCanvasBrainAppearanceSettings({}, input);
}
