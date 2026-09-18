import { useState } from "react";

export function useUserSettingsModalState() {
  const [signingOut, setSigningOut] = useState(false);

  return {
    signingOut,
    setSigningOut,
  };
}
