import { useEffect, useState } from "react";

import { LandingHero } from "@/components/marketing/landing-hero";
import { landingScrollTargetId, scrollToLandingTarget } from "@/components/marketing/landing-index";
import { LandingPricing } from "@/components/marketing/landing-pricing";
import { LANDING_BELOW_HERO_VISIBLE } from "@/components/marketing/landing-release";
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

  useEffect(() => {
    const scrollToHash = () => {
      const targetId = landingScrollTargetId(window.location.hash);
      if (targetId) scrollToLandingTarget(targetId);
    };

    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(scrollToHash);
    });
    window.addEventListener("hashchange", scrollToHash);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", scrollToHash);
    };
  }, []);

  return (
    <>
      <LandingHero isAuthenticated={isAuthenticated} />
      <div hidden={!LANDING_BELOW_HERO_VISIBLE} className={LANDING_BELOW_HERO_VISIBLE ? undefined : "hidden"}>
        <LandingPricing isAuthenticated={isAuthenticated} />
      </div>
    </>
  );
}
