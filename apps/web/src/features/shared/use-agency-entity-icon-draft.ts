import { useEffect, useState } from "react";

import {
  matchAgencyEntityIconKey,
  type AgencyEntityIconKey,
} from "@orch/api/routers/agency-ops/shared/entity-icon-catalog";

export function useAgencyEntityIconDraft(name: string, active: boolean) {
  const [iconKey, setIconKey] = useState<AgencyEntityIconKey | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (active) return;
    setTouched(false);
    setIconKey(null);
  }, [active]);

  return {
    displayIconKey: touched ? iconKey : matchAgencyEntityIconKey(name),
    setIconKey: (next: AgencyEntityIconKey | null) => {
      setTouched(true);
      setIconKey(next);
    },
    submitIconKey: touched ? iconKey : undefined,
  };
}
