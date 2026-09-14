import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarRange,
  Contact,
  CreditCard,
  DollarSign,
  FolderKanban,
  LayoutDashboard,
  LayoutGrid,
  Palette,
  Plug,
  Receipt,
  Repeat,
  Rocket,
  Scale,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Target,
  Timer,
  Users,
  Wallet,
  type LucideIcon as LucideIconComponent,
} from "lucide-react";

const ICON_BY_SLUG: Record<string, LucideIconComponent> = {
  "bar-chart-3": BarChart3,
  briefcase: Briefcase,
  "building-2": Building2,
  "calendar-range": CalendarRange,
  contact: Contact,
  "credit-card": CreditCard,
  "dollar-sign": DollarSign,
  "folder-kanban": FolderKanban,
  "layout-dashboard": LayoutDashboard,
  "layout-grid": LayoutGrid,
  palette: Palette,
  plug: Plug,
  receipt: Receipt,
  repeat: Repeat,
  rocket: Rocket,
  scale: Scale,
  settings: Settings,
  "shopping-bag": ShoppingBag,
  "sliders-horizontal": SlidersHorizontal,
  target: Target,
  timer: Timer,
  users: Users,
  wallet: Wallet,
};

function toIconSlug(iconName: string) {
  return iconName.replace(/^i-lucide-/, "");
}

export function LucideIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_BY_SLUG[toIconSlug(name)];
  if (!Icon) {
    return null;
  }
  return <Icon className={className} aria-hidden />;
}
