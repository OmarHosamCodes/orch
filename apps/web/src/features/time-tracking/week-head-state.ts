import { cn } from "@/lib/utils";

export function agencyTimeWeekHeadStateClass(): string {
  return cn(
    "sticky top-0 z-10 flex items-center justify-between gap-3 bg-background/95 backdrop-blur-sm",
    "min-h-[62px] py-2 text-sm text-highlighted",
  );
}

export function pinnedWeekKeyFromVirtualTop(
  weekStartKeys: Array<string | null>,
  firstVisibleIndex: number,
): string | null {
  if (weekStartKeys.length === 0 || firstVisibleIndex < 0) return null;
  const start = Math.min(firstVisibleIndex, weekStartKeys.length - 1);
  for (let index = start; index >= 0; index -= 1) {
    const key = weekStartKeys[index];
    if (key) return key;
  }
  return null;
}
