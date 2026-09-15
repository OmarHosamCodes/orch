import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import type { AgencyFilterOption } from "./agency-multi-select-filter";

export type AgencyFilterRow =
  | { kind: "heading"; key: string; label: string }
  | { kind: "option"; key: string; option: AgencyFilterOption };

type AgencyFilterOptionsProps = {
  rows: AgencyFilterRow[];
  label?: string;
  single: boolean;
  renderOption: (option: AgencyFilterOption) => ReactNode;
};

export function AgencyFilterOptions({
  rows,
  label,
  single,
  renderOption,
}: AgencyFilterOptionsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const pendingFocus = useRef<number | null>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => (rows[index]?.kind === "heading" ? 28 : 34),
    getItemKey: (index) => rows[index]!.key,
    overscan: 4,
    rangeExtractor: (range) => {
      const visible = defaultRangeExtractor(range);
      return focusedIndex === null || focusedIndex >= rows.length
        ? visible
        : [...new Set([...visible, focusedIndex])].sort((a, b) => a - b);
    },
  });
  const items = virtualizer.getVirtualItems();

  useLayoutEffect(() => {
    if (pendingFocus.current === null) return;
    const target = scrollRef.current?.querySelector<HTMLElement>(
      `[data-filter-index="${pendingFocus.current}"] button`,
    );
    if (target) {
      target.focus({ preventScroll: true });
      pendingFocus.current = null;
    }
  });

  return (
    <div
      ref={scrollRef}
      className="max-h-64 overflow-x-hidden overflow-y-auto overscroll-contain"
      role={single ? "listbox" : "group"}
      aria-label={label}
      onFocusCapture={(event) => {
        const row = event.target.closest<HTMLElement>("[data-filter-index]");
        if (row) setFocusedIndex(Number(row.dataset.filterIndex));
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocusedIndex(null);
      }}
      onKeyDown={(event) => {
        if (!(event.target instanceof HTMLElement)) return;
        const current = event.target.closest<HTMLElement>("[data-filter-index]");
        if (!current) return;
        const index = Number(current.dataset.filterIndex);
        let next = index;
        const backward = event.key === "ArrowUp" || (event.key === "Tab" && event.shiftKey);
        if (event.key === "Home") next = 0;
        else if (event.key === "End") next = rows.length - 1;
        else if (["ArrowDown", "ArrowUp", "Tab"].includes(event.key)) {
          next += backward ? -1 : 1;
        } else return;
        const step = backward || event.key === "End" ? -1 : 1;
        while (next >= 0 && next < rows.length && rows[next]?.kind !== "option") next += step;
        if (next < 0 || next >= rows.length) return;
        event.preventDefault();
        if (next === index) return;
        pendingFocus.current = next;
        setFocusedIndex(next);
        virtualizer.scrollToIndex(next, { align: "auto" });
      }}
    >
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {items.map((item) => {
          const row = rows[item.index]!;
          return (
            <div
              key={row.key}
              data-filter-index={item.index}
              className="absolute top-0 left-0 w-full"
              style={{ height: item.size, transform: `translateY(${item.start}px)` }}
            >
              {row.kind === "heading" ? (
                <p className="truncate px-2.5 pt-2 pb-1 text-[10px] font-semibold tracking-[0.14em] text-muted uppercase">
                  {row.label}
                </p>
              ) : (
                renderOption(row.option)
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
