import { lazy, Suspense, useEffect, useState } from "react";

import { LandingAuthActions } from "@/components/marketing/landing-auth-actions";
import { MarketingBrandLockup } from "@/components/marketing/marketing-brand-lockup";
import { scheduleIdle } from "@/lib/schedule-idle";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { Link } from "@/lib/navigation";

const loadFibreArc = () => import("@/components/originkit/ui/fibre-arc");
const FibreArc = lazy(loadFibreArc);

const LANDING_GLOW =
  "radial-gradient(ellipse 80% 50% at 50% 40%, color-mix(in oklab, #5b5bd6 34%, transparent), transparent 70%), radial-gradient(ellipse 50% 35% at 50% 78%, color-mix(in oklab, #363244 55%, transparent), transparent 75%)";

type LandingHeroProps = {
  isAuthenticated: boolean;
};

export function LandingHero({ isAuthenticated }: LandingHeroProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [showFx, setShowFx] = useState(false);

  useEffect(() => {
    if (reducedMotion) {
      setShowFx(false);
      return;
    }
    void loadFibreArc();
    return scheduleIdle(() => setShowFx(true));
  }, [reducedMotion]);

  return (
    <section className="dark relative isolate flex min-h-svh w-full flex-col overflow-hidden bg-background font-sans text-foreground [--font-body:var(--font-sans)] [--font-heading:var(--font-sans)]">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        <div className="absolute inset-0" style={{ background: LANDING_GLOW }} />
        {!reducedMotion && showFx ? (
          <div className="absolute inset-0 opacity-40">
            <div className="h-full w-full animate-in fade-in fill-mode-both duration-1000 ease-[var(--motion-ease-out)] motion-reduce:animate-none">
              <Suspense fallback={null}>
                <FibreArc
                  background="#000000"
                  baseColor="#363244"
                  accentColor="#5b5bd6"
                  highlight="#9a9ad4"
                  density={14}
                  speed={14}
                  direction={40}
                  hover={36}
                  reach={28}
                  bundle={{ curve: 36, spread: 85, thickness: 180, comb: 120 }}
                />
              </Suspense>
            </div>
          </div>
        ) : null}
      </div>

      <header className="relative z-20 flex items-center px-6 py-6 md:px-8 md:py-8">
        <Link
          to="/"
          className="outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <MarketingBrandLockup className="text-sm text-foreground" />
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 pt-12 pb-24 text-center md:px-10 md:pt-20 lg:px-16">
        <h1 className="max-w-[18ch] text-[clamp(2rem,4.8vw,3.75rem)] leading-[1.06] font-medium tracking-[-0.04em] text-balance">
          Map your thinking. Run your agency.
        </h1>

        <LandingAuthActions isAuthenticated={isAuthenticated} className="mt-8 justify-center" />
      </main>
    </section>
  );
}
