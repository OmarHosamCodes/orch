import type { Transition, Variants } from "motion/react";

import {
  AGENCY_MS,
  agencyBaseTransition,
  agencyFastTransition,
  agencyTapScale,
} from "@/features/shared/agency-motion";

export const PANEL_MS = AGENCY_MS;

export const panelTapScale = agencyTapScale;
export const panelFastTransition = agencyFastTransition;
export const panelBaseTransition = agencyBaseTransition;

export const panelHostVariants: Variants = {
  hidden: { opacity: 0, x: 8 },
  show: { opacity: 1, x: 0, transition: panelBaseTransition },
  exit: { opacity: 0, x: 8, transition: panelFastTransition },
};

export const panelBodyVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: panelBaseTransition },
  exit: { opacity: 0, y: 4, transition: panelFastTransition },
};

export const panelLayoutTransition: Transition = panelBaseTransition;
