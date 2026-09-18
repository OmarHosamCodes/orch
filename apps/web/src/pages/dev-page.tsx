import { DEV_PAGES } from "@/features/dev/dev-chrome";
import { Link } from "@/lib/navigation";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";

export function DevPage() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-headline font-semibold tracking-tight text-highlighted">
          Dev pages
        </h1>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          Internal component reference. All pages are DEV-only and hidden in production.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DEV_PAGES.filter((page) => page.id !== "index").map((page) => (
          <Link
            key={page.id}
            to={page.href}
            className="block h-full rounded-surface outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
          >
            <Card className="group h-full cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-highlighted">
                  {page.label}
                </CardTitle>
                <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5" />
              </CardHeader>
              <CardContent>
                <CardDescription>{page.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
