import FibreArc from "@/components/originkit/ui/fibre-arc";
import { LandingAuthActions } from "@/components/marketing/landing-auth-actions";
import { MarketingBrandLockup } from "@/components/marketing/marketing-brand-lockup";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { Link } from "@/lib/navigation";

type LandingHeroProps = {
  isAuthenticated: boolean;
};

export function LandingHero({ isAuthenticated }: LandingHeroProps) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <section className="orch-grain-surface relative isolate flex min-h-svh w-full flex-col overflow-hidden bg-background font-sans text-foreground [--font-body:var(--font-sans)] [--font-heading:var(--font-sans)]">
      {!reducedMotion ? (
        <div className="pointer-events-none absolute inset-0 z-0 opacity-45" aria-hidden="true">
          <FibreArc
            background="#050507"
            baseColor="#363244"
            accentColor="#8b8be8"
            highlight="#f4f4f5"
            density={16}
            speed={30}
            direction={40}
            hover={68}
            reach={23}
            bundle={{ curve: 36, spread: 85, thickness: 109, comb: 170 }}
          />
        </div>
      ) : (
        <div
          className="pointer-events-none absolute inset-0 opacity-100"
          style={{ background: "var(--marketing-accent-glow)" }}
          aria-hidden="true"
        />
      )}

      <header className="relative z-20 flex items-center px-6 py-6 md:px-8 md:py-8">
        <Link
          to="/"
          className="outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <MarketingBrandLockup className="text-sm text-foreground" />
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 pt-12 pb-24 text-center md:px-10 md:pt-20 lg:px-16">
        <h1 className="max-w-[18ch] text-[clamp(2rem,4.8vw,3.75rem)] leading-[1.06] font-medium tracking-[-0.04em] text-balance [animation:hero-reveal_1.2s_ease-out_both]">
          Map your thinking. Run your agency.
        </h1>

        <LandingAuthActions isAuthenticated={isAuthenticated} className="mt-8 justify-center" />
      </main>
    </section>
  );
}
