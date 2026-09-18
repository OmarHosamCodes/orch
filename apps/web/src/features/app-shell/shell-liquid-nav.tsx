import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type SelectionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
};

type ShellLiquidNavContextValue = {
  registerItem: (id: string, element: HTMLElement | null) => void;
};

const ShellLiquidNavContext = createContext<ShellLiquidNavContextValue | null>(null);

function measureSelectionRect(element: HTMLElement, container: HTMLElement): SelectionRect {
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const radius = Number.parseFloat(getComputedStyle(element).borderTopLeftRadius) || 10;

  return {
    x: elementRect.left - containerRect.left,
    y: elementRect.top - containerRect.top,
    width: elementRect.width,
    height: elementRect.height,
    radius,
  };
}

export function useShellLiquidNavRegister(id: string) {
  const context = useContext(ShellLiquidNavContext);

  return useCallback(
    (element: HTMLElement | null) => {
      context?.registerItem(id, element);
    },
    [context, id],
  );
}

type ShellLiquidNavProviderProps = {
  activeId: string | null;
  children: ReactNode;
  className?: string;
  /** Scroll container to re-measure when the user scrolls nested nav. */
  scrollRootClassName?: string;
};

/** Active selection rect for rail or context-bar destinations. */
export function ShellLiquidNavProvider({
  activeId,
  children,
  className,
  scrollRootClassName,
}: ShellLiquidNavProviderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef(new Map<string, HTMLElement>());
  const [rect, setRect] = useState<SelectionRect | null>(null);

  const remeasure = useCallback(() => {
    const container = containerRef.current;
    if (!container || !activeId) {
      setRect(null);
      return;
    }

    const activeElement = itemsRef.current.get(activeId);
    if (!activeElement) {
      setRect(null);
      return;
    }

    setRect(measureSelectionRect(activeElement, container));
  }, [activeId]);

  const registerItem = useCallback(
    (id: string, element: HTMLElement | null) => {
      if (element) {
        itemsRef.current.set(id, element);
      } else {
        itemsRef.current.delete(id);
      }
      requestAnimationFrame(() => {
        remeasure();
      });
    },
    [remeasure],
  );

  useLayoutEffect(() => {
    remeasure();
  }, [remeasure]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      remeasure();
    });

    resizeObserver.observe(container);
    for (const element of itemsRef.current.values()) {
      resizeObserver.observe(element);
    }

    const scrollRoot = scrollRootClassName
      ? container.closest(`.${scrollRootClassName}`)
      : container;
    scrollRoot?.addEventListener("scroll", remeasure, { passive: true });

    return () => {
      resizeObserver.disconnect();
      scrollRoot?.removeEventListener("scroll", remeasure);
    };
  }, [activeId, remeasure, scrollRootClassName]);

  return (
    <ShellLiquidNavContext.Provider value={{ registerItem }}>
      <div ref={containerRef} className={cn("relative", className)}>
        {rect ? (
          <div
            className="pointer-events-none absolute z-0 bg-sidebar-accent motion-reduce:transition-none"
            style={{
              left: rect.x,
              top: rect.y,
              width: rect.width,
              height: rect.height,
              borderRadius: rect.radius,
            }}
            aria-hidden
          />
        ) : null}
        <div className="relative z-[1]">{children}</div>
      </div>
    </ShellLiquidNavContext.Provider>
  );
}
