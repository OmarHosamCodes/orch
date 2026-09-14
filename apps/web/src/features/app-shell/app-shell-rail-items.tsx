import type { ReactNode } from "react";
import { Link } from "@/lib/navigation";

import { shellFocusRingClass, shellRailLinkActiveClass } from "@/features/app-shell/app-shell-ui";
import { useShellLiquidNavRegister } from "@/features/app-shell/shell-liquid-nav";
import { LucideIcon } from "@/lib/lucide-icon";
import { cn } from "@/lib/utils";

export function ShellRailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="app-shell__rail-section" aria-label={title}>
      <h2 className="app-shell__rail-section-label">{title}</h2>
      <div className="app-shell__rail-section-items">{children}</div>
    </section>
  );
}

type ShellRailShortcutProps = {
  modifier?: string;
  keyLabel: string;
};

export function ShellRailShortcut({ modifier = "g", keyLabel }: ShellRailShortcutProps) {
  return (
    <span className="app-shell__rail-shortcuts" aria-hidden>
      <kbd className="app-shell__rail-shortcut">{modifier}</kbd>
      <kbd className="app-shell__rail-shortcut">{keyLabel}</kbd>
    </span>
  );
}

type ShellRailRowContentProps = {
  icon: string;
  label: string;
  shortcutKey?: string;
  nested?: boolean;
  selected?: boolean;
};

function ShellRailRowContent({
  icon,
  label,
  shortcutKey,
  nested = false,
  selected = false,
}: ShellRailRowContentProps) {
  return (
    <>
      <span
        className={cn(
          "app-shell__rail-icon-tile",
          nested && "app-shell__rail-icon-tile--nested",
          selected && "app-shell__rail-icon-tile--active",
        )}
      >
        <LucideIcon name={icon} className="app-shell__rail-icon-tile-glyph" />
      </span>
      <span className="app-shell__rail-row-label">{label}</span>
      {shortcutKey ? <ShellRailShortcut keyLabel={shortcutKey} /> : null}
    </>
  );
}

type ShellRailNavRowProps = {
  to: string;
  icon: string;
  label: string;
  selected?: boolean;
  parentActive?: boolean;
  navId?: string;
  shortcutKey?: string;
  nested?: boolean;
  id?: string;
  title?: string;
  onNavigate?: () => void;
};

export function ShellRailNavRow({
  to,
  icon,
  label,
  selected = false,
  parentActive = false,
  navId,
  shortcutKey,
  nested = false,
  id,
  title,
  onNavigate,
}: ShellRailNavRowProps) {
  const registerLiquid = useShellLiquidNavRegister(navId ?? "__noop");

  return (
    <Link
      ref={navId ? registerLiquid : undefined}
      id={id}
      to={to}
      title={title ?? (shortcutKey ? `${label} (g ${shortcutKey})` : label)}
      activeOptions={{ exact: true, includeSearch: false }}
      className={cn(
        nested ? "app-shell__rail-row app-shell__rail-row--nested" : "app-shell__rail-row",
        shellFocusRingClass,
        selected && shellRailLinkActiveClass,
        parentActive && !selected && "app-shell__rail-row--parent-active",
      )}
      aria-current={selected ? "page" : undefined}
      onClick={onNavigate}
    >
      <ShellRailRowContent
        icon={icon}
        label={label}
        shortcutKey={shortcutKey}
        nested={nested}
        selected={selected}
      />
    </Link>
  );
}

export function ShellRailNestedGroup({ children }: { children: ReactNode }) {
  return (
    <div
      className="app-shell__rail-subnav app-shell__rail-subnav--nested"
      role="group"
      aria-label="Management panes"
    >
      {children}
    </div>
  );
}
