import { useEffect, useState } from "react";

export function useStickyWeekHead(scrollRoot: HTMLElement | null) {
  const [pinnedKeys, setPinnedKeys] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!scrollRoot) {
      setPinnedKeys(new Set());
      return;
    }

    const rootTop = () => scrollRoot.getBoundingClientRect().top;

    const applyEntries = (entries: IntersectionObserverEntry[]) => {
      setPinnedKeys((previous) => {
        const next = new Set(previous);
        const top = rootTop();
        for (const entry of entries) {
          const key = (entry.target as HTMLElement).dataset.weekHead;
          if (!key) continue;
          const pinned =
            entry.intersectionRatio < 1 && entry.boundingClientRect.top <= top + 1;
          if (pinned) next.add(key);
          else next.delete(key);
        }
        return next;
      });
    };

    const observer = new IntersectionObserver(applyEntries, {
      root: scrollRoot,
      threshold: [1],
      rootMargin: "-1px 0px 0px 0px",
    });

    const observeHeads = () => {
      observer.disconnect();
      for (const node of scrollRoot.querySelectorAll("[data-week-head]")) {
        observer.observe(node);
      }
    };

    observeHeads();
    const mutations = new MutationObserver(observeHeads);
    mutations.observe(scrollRoot, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, [scrollRoot]);

  return pinnedKeys;
}
