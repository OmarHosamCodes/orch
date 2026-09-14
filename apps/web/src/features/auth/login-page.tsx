import { ArrowRight, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Navigate, Link } from "@/lib/navigation";

import Scanner from "@/components/marketing/bits/Scanner";
import { BrandMark } from "@/features/app-shell/components/brand-mark";
import { useLoginPage } from "@/features/auth/hooks/use-login-page";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";

const GOOGLE_LOGO_URL =
  "https://cdn.brandfetch.io/id6O2oGzv-/theme/dark/symbol.svg?c=1bxid64Mup7aczewSAYMX&t=1755835725776";

function AuthLanyard({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex w-full max-w-[20rem] flex-col items-center">
      <div
        className="pointer-events-none absolute -top-[17.5rem] left-1/2 z-10 h-[19rem] w-16 -translate-x-1/2"
        aria-hidden="true"
      >
        <div className="absolute top-0 left-1/2 h-52 w-12 -translate-x-1/2 rounded-b-sm border-x border-border bg-secondary shadow-sm sm:-top-2 sm:h-[13.5rem]" />
        <div className="absolute top-[10.5rem] left-1/2 flex h-9 w-16 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-muted shadow-md">
          <div className="h-5 w-12 rounded-full border border-border bg-background shadow-inner" />
        </div>
        <div className="absolute top-[12.8rem] left-1/2 h-16 w-7 -translate-x-1/2 rounded-[0.9rem] border-2 border-border bg-secondary shadow-md">
          <div className="absolute top-2 left-1/2 size-2 -translate-x-1/2 rounded-full border border-border bg-background" />
          <div className="absolute top-7 left-1/2 h-8 w-2 -translate-x-1/2 rotate-12 rounded-full bg-background" />
        </div>
      </div>
      <Card className="relative z-20 min-h-[26rem] w-full overflow-visible rounded-[1.35rem] py-0 shadow-xl">
        <div className="absolute -top-2 left-1/2 h-4 w-14 -translate-x-1/2 rounded-full border border-border bg-background shadow-inner" />
        <CardContent className="flex min-h-[26rem] flex-col justify-center space-y-5 px-6 py-12 font-sans sm:px-7">
          {children}
        </CardContent>
      </Card>
    </div>
  );
}

export function LoginPage() {
  const { session, redirectTo, error, pending, lastUsedEmail, handleGoogleSignIn } = useLoginPage();
  const reducedMotion = usePrefersReducedMotion();

  if (!session.isPending && session.data) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background font-sans text-foreground">
      <div className="pointer-events-none absolute inset-0 opacity-35" aria-hidden="true">
        <Scanner
          color1="#6b7280"
          color2="#8b8be8"
          color3="#f2f2f5"
          speed={reducedMotion ? 0 : 0.5}
          sweepSpeed={reducedMotion ? 0 : 0.25}
          sweepWidth={1.6}
          sweepFalloff={6}
          scale={1.5}
          frequency={2}
          ripple={0.22}
          bandDensity={11}
          lineSharpness={5.5}
          glow={0.22}
          scanDirection="vertical"
          colorSpread={0.7}
          brightness={0.85}
          contrast={1.15}
          softness={1.4}
          vignette={0.45}
          scanline
          grain
          grainIntensity={0.05}
          opacity={0.7}
          mouseInteraction={!reducedMotion}
          mouseRadius={0.5}
          mouseStrength={0.35}
        />
      </div>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,transparent_0%,color-mix(in_oklab,var(--background)_14%,transparent)_62%,var(--background)_100%)]"
        aria-hidden="true"
      />

      <main className="relative z-20 flex flex-1 items-start justify-center px-4 pt-[17.5rem] pb-24 sm:pt-[18rem]">
        <AuthLanyard>
          <div className="space-y-5 text-center">
            <Link
              to="/"
              className="mx-auto inline-flex items-center gap-2.5 transition-opacity hover:opacity-80"
            >
              <BrandMark className="size-8 rounded-lg" />
              <span className="font-serif text-4xl font-semibold tracking-[-0.08em] italic">
                Orch
              </span>
            </Link>
            <div className="space-y-2">
              <h1 className="font-sans text-sm font-medium leading-5 tracking-tight text-muted-foreground">
                Continue to Orch
              </h1>
              <p className="font-sans text-xs leading-5 text-muted-foreground/70">
                Your canvas, Agency, and agent.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              size="lg"
              className="h-12 w-full rounded-full shadow-md"
              disabled={pending}
              onClick={() => void handleGoogleSignIn()}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {!pending ? <img src={GOOGLE_LOGO_URL} alt="" className="size-4" /> : null}
              Continue with Google
            </Button>

            {lastUsedEmail ? (
              <>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground/65">
                  <span className="h-px flex-1 bg-border/60" />
                  <span>or</span>
                  <span className="h-px flex-1 bg-border/60" />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="group h-12 w-full justify-between rounded-full px-4 text-left text-xs font-normal text-muted-foreground"
                  disabled={pending}
                  onClick={() => void handleGoogleSignIn(lastUsedEmail)}
                >
                  <span className="truncate">Continue with {lastUsedEmail}</span>
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border/70 transition-transform group-hover:translate-x-0.5">
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </span>
                </Button>
              </>
            ) : null}
          </div>

          {error ? (
            <p className="font-sans text-center text-sm leading-5 text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </AuthLanyard>
      </main>

      <footer className="relative z-30 px-6 py-5 text-center font-sans text-[11px] leading-5 text-muted-foreground/70">
        <span>Continuing means you agree to the </span>
        <Link to="/terms" className="underline-offset-4 hover:text-foreground hover:underline">
          Terms of Service
        </Link>
        <span> and </span>
        <Link to="/privacy" className="underline-offset-4 hover:text-foreground hover:underline">
          Privacy Policy
        </Link>
        <span>.</span>
      </footer>
    </div>
  );
}
