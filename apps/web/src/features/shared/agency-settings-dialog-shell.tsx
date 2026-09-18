import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/ui/dialog";

type AgencySettingsNavItem<TPane extends string> = {
  id: TPane;
  label: string;
  icon: LucideIcon;
  visible?: boolean;
};

type AgencySettingsDialogShellProps<TPane extends string> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  pane: TPane;
  onPaneChange: (pane: TPane) => void;
  navItems: readonly AgencySettingsNavItem<TPane>[];
  paneTitle: string;
  paneDescription?: string;
  children: ReactNode;
  /** Optional footer under the nav (e.g. Sign out). */
  navFooter?: ReactNode;
  contentClassName?: string;
  bodyClassName?: string;
  hideNav?: boolean;
  maxWidthClassName?: string;
};

/** Shared settings chrome: w-48 nav + scrollable pane. Domain content stays in children. */
export function AgencySettingsDialogShell<TPane extends string>({
  open,
  onOpenChange,
  title,
  description,
  pane,
  onPaneChange,
  navItems,
  paneTitle,
  paneDescription,
  children,
  navFooter,
  contentClassName,
  bodyClassName,
  hideNav = false,
  maxWidthClassName = "sm:max-w-3xl",
}: AgencySettingsDialogShellProps<TPane>) {
  const visibleNav = navItems.filter((item) => item.visible !== false);
  const activePane = visibleNav.some((item) => item.id === pane)
    ? pane
    : (visibleNav[0]?.id ?? pane);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("gap-0 overflow-hidden p-0", maxWidthClassName, contentClassName)}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{description}</DialogDescription>

        <div className={cn("flex h-[min(36rem,88vh)] overflow-hidden", bodyClassName)}>
          {hideNav ? null : (
            <nav
              className="flex w-48 shrink-0 flex-col border-r border-border bg-muted/30"
              aria-label={`${title} sections`}
            >
              <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
                {visibleNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePane === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                        agencyFocusRingClass,
                        isActive
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      )}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => onPaneChange(item.id)}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
              {navFooter ? (
                <div className="shrink-0 border-t border-border p-3">{navFooter}</div>
              ) : null}
            </nav>
          )}

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain p-6 pr-14">
            <header className="border-b border-border pb-5">
              <h2 className="text-lg font-semibold tracking-tight text-balance text-foreground">
                {paneTitle}
              </h2>
              {paneDescription ? (
                <p className="mt-1 max-w-prose text-sm text-muted-foreground">{paneDescription}</p>
              ) : null}
            </header>
            <div className="min-h-0 flex-1 pt-6">{children}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
