import { useEffect, useState } from "react";

import { LandingHero } from "@/components/marketing/landing-hero";
import { authClient } from "@/lib/auth-client";

export function LandingPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const resolveSession = () => {
      void authClient.getSession().then((session) => {
        setIsAuthenticated(Boolean(session.data?.user));
      });
    };

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(resolveSession);
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = setTimeout(resolveSession, 1);
    return () => clearTimeout(timeoutId);
  }, []);

  return <LandingHero isAuthenticated={isAuthenticated} />;
}
