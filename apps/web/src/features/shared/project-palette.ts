/**
 * Project palette — deterministic per-project hue.
 *
 * Twelve OKLCH hues form the agency project palette. Hue is auto-assigned
 * from a stable hash of the project id; user overrides (later) win.
 *
 * Hue is a *signal*, never a surface tint. Use it for 6px dots, pills, chart
 * series, project page hero — never for row backgrounds.
 *
 * Operator Emerald is reserved for primary actions, current selection, and
 * the running-timer state. Do not include it in this palette.
 */

export type ProjectHue = {
  /** Stable identifier for the hue slot (1..12). */
  id: number;
  /** Human label, used in project settings overrides. */
  label: string;
  /** OKLCH dot color for light theme. */
  light: string;
  /** OKLCH dot color for dark theme. */
  dark: string;
  /** Soft tint background for pill/chip in light theme. */
  lightSoft: string;
  /** Soft tint background for pill/chip in dark theme. */
  darkSoft: string;
};

// Twelve perceptually-spaced hues. Lightness held even across the set so no
// hue reads louder than another. Saturation kept restrained — these are
// *signals*, not decoration.
export const PROJECT_PALETTE: readonly ProjectHue[] = [
  {
    id: 1,
    label: "Indigo",
    light: "oklch(56% 0.16 268)",
    dark: "oklch(72% 0.14 268)",
    lightSoft: "oklch(96% 0.03 268)",
    darkSoft: "oklch(28% 0.06 268)",
  },
  {
    id: 2,
    label: "Cobalt",
    light: "oklch(55% 0.16 245)",
    dark: "oklch(72% 0.13 245)",
    lightSoft: "oklch(96% 0.03 245)",
    darkSoft: "oklch(28% 0.06 245)",
  },
  {
    id: 3,
    label: "Teal",
    light: "oklch(58% 0.13 200)",
    dark: "oklch(74% 0.11 200)",
    lightSoft: "oklch(96% 0.03 200)",
    darkSoft: "oklch(28% 0.05 200)",
  },
  {
    id: 4,
    label: "Aqua",
    light: "oklch(60% 0.12 220)",
    dark: "oklch(76% 0.10 220)",
    lightSoft: "oklch(96% 0.03 220)",
    darkSoft: "oklch(28% 0.05 220)",
  },
  {
    id: 5,
    label: "Lime",
    light: "oklch(64% 0.16 130)",
    dark: "oklch(78% 0.14 130)",
    lightSoft: "oklch(96% 0.04 130)",
    darkSoft: "oklch(28% 0.06 130)",
  },
  {
    id: 6,
    label: "Olive",
    light: "oklch(60% 0.12 105)",
    dark: "oklch(74% 0.11 105)",
    lightSoft: "oklch(96% 0.03 105)",
    darkSoft: "oklch(28% 0.05 105)",
  },
  {
    id: 7,
    label: "Amber",
    light: "oklch(68% 0.16 75)",
    dark: "oklch(80% 0.14 75)",
    lightSoft: "oklch(96% 0.04 75)",
    darkSoft: "oklch(28% 0.07 75)",
  },
  {
    id: 8,
    label: "Coral",
    light: "oklch(64% 0.18 35)",
    dark: "oklch(76% 0.15 35)",
    lightSoft: "oklch(96% 0.04 35)",
    darkSoft: "oklch(28% 0.07 35)",
  },
  {
    id: 9,
    label: "Crimson",
    light: "oklch(58% 0.20 20)",
    dark: "oklch(72% 0.17 20)",
    lightSoft: "oklch(96% 0.04 20)",
    darkSoft: "oklch(28% 0.08 20)",
  },
  {
    id: 10,
    label: "Magenta",
    light: "oklch(58% 0.20 340)",
    dark: "oklch(72% 0.17 340)",
    lightSoft: "oklch(96% 0.04 340)",
    darkSoft: "oklch(28% 0.07 340)",
  },
  {
    id: 11,
    label: "Plum",
    light: "oklch(54% 0.17 310)",
    dark: "oklch(70% 0.15 310)",
    lightSoft: "oklch(96% 0.04 310)",
    darkSoft: "oklch(28% 0.07 310)",
  },
  {
    id: 12,
    label: "Slate",
    light: "oklch(56% 0.06 250)",
    dark: "oklch(72% 0.05 250)",
    lightSoft: "oklch(96% 0.01 250)",
    darkSoft: "oklch(28% 0.02 250)",
  },
] as const;

/**
 * FNV-1a 32-bit hash. Stable across runs and platforms; used for the
 * deterministic project-id → hue mapping.
 */
function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function projectHueFor(
  projectId: string | null | undefined,
  colorHueId?: number | null,
): ProjectHue {
  if (colorHueId != null && colorHueId >= 1 && colorHueId <= PROJECT_PALETTE.length) {
    return PROJECT_PALETTE[colorHueId - 1]!;
  }

  if (!projectId) {
    return PROJECT_PALETTE[11]!; // Slate fallback for unknown project.
  }

  const slot = hashString(projectId) % PROJECT_PALETTE.length;
  return PROJECT_PALETTE[slot]!;
}

/** Returns CSS custom properties for inline style binding on a hue dot. */
export function projectHueStyle(projectId: string | null | undefined, colorHueId?: number | null) {
  const hue = projectHueFor(projectId, colorHueId);
  return {
    "--project-hue": hue.light,
    "--project-hue-dark": hue.dark,
    "--project-hue-soft": hue.lightSoft,
    "--project-hue-soft-dark": hue.darkSoft,
  } as Record<string, string>;
}
