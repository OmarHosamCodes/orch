import { Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@/lib/navigation";

import { MarketingBrandLockup } from "@/components/marketing/marketing-brand-lockup";
import { cn } from "@/lib/utils";
import { useTheme } from "@/stores/theme";
import { Button } from "@/ui/button";

const footerLinks = [
  { label: "Canvas", to: "/canvas" },
  { label: "Agency", to: "/agency" },
  { label: "Pricing", to: "/#pricing" },
  { label: "Terms", to: "/terms" },
  { label: "Privacy", to: "/privacy" },
];

function ThemeToggle() {
  const { isDark, toggle } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="rounded-full text-muted-foreground hover:text-foreground"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

export function MarketingPageShell({ children }: { children: ReactNode }) {
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-screen w-full flex-col bg-background font-sans text-foreground selection:bg-primary/20 [--font-body:var(--font-sans)] [--font-heading:var(--font-sans)]">
      {children}

      <footer className="mt-auto w-full">
        <div className="mx-auto max-w-6xl px-6 py-14 md:px-10 md:py-20 lg:px-16">
          <div className="flex flex-col items-center text-center">
            <MarketingBrandLockup linkToHome className="text-base" />
            <nav aria-label="Footer" className="mt-8">
              <ul className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
                {footerLinks.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div
            aria-hidden
            className={cn(
              "mt-12 h-px w-full md:mt-14",
              "bg-[repeating-linear-gradient(90deg,var(--border)_0_3px,transparent_3px_7px)]",
            )}
          />

          <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              &copy; {year} Orch. All rights reserved.
            </p>
            <ThemeToggle />
          </div>
        </div>
      </footer>
    </div>
  );
}
