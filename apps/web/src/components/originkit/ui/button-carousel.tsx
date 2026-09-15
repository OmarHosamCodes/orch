"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

import { cn } from "@/lib/utils";

type ImageValue = string | { src?: string; srcSet?: string; alt?: string };

type ButtonCarouselItem = {
  buttonImage?: ImageValue;
  image?: ImageValue;
  label?: string;
};

type FontValue = {
  fontFamily?: string;
  fontWeight?: number | string;
  fontSize?: number | string;
  fontStyle?: string;
  letterSpacing?: number | string;
  lineHeight?: number | string;
};

type ButtonCarouselProps = {
  items?: ButtonCarouselItem[];
  selectedIndex?: number;
  onSelectedIndexChange?: (index: number) => void;
  showPortrait?: boolean;
  cardRadius?: number;
  imageWidth?: number;
  imageHeight?: number;
  buttonCount?: number;
  buttonSize?: number;
  buttonRadius?: number;
  curve?: number;
  gap?: number;
  labelShow?: boolean;
  labelX?: number;
  labelY?: number;
  labelColor?: string;
  labelFont?: FontValue;
  backgroundColor?: string;
  className?: string;
  style?: CSSProperties;
};

function srcOf(value?: ImageValue): string {
  return typeof value === "string" ? value : (value?.src ?? "");
}

function altOf(value: ImageValue | undefined, fallback: string): string {
  if (typeof value === "object" && value?.alt) return value.alt;
  return fallback;
}

function modIdx(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

function easeCubicInOut(progress: number): number {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

const DEFAULT_LABEL_FONT: FontValue = {
  fontFamily: "Poppins, IBM Plex Sans Arabic, ui-sans-serif, system-ui, sans-serif",
  fontWeight: 600,
  fontSize: 20,
  lineHeight: "1.3em",
  letterSpacing: "-0.02em",
};

export default function ButtonCarousel({
  items = [],
  selectedIndex,
  onSelectedIndexChange,
  showPortrait = true,
  cardRadius = 8,
  imageWidth = 220,
  imageHeight = 220,
  buttonCount = 7,
  buttonSize = 48,
  buttonRadius = 20,
  curve = 5,
  gap = 18,
  labelShow = true,
  labelX = 0,
  labelY = 0,
  labelColor = "var(--highlighted)",
  labelFont = DEFAULT_LABEL_FONT,
  backgroundColor = "transparent",
  className,
  style,
}: ButtonCarouselProps) {
  const list = items;
  const count = list.length;

  const posRef = useRef(0);
  const [posDisplay, setPosDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  const animRef = useRef({ startPos: 0, targetPos: 0, startTime: 0 });
  const dragRef = useRef({
    down: false,
    moved: false,
    startX: 0,
    startPos: 0,
  });
  const suppressClickRef = useRef(false);
  const lastEmittedRef = useRef(0);
  const wheelSnapRef = useRef<number | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const countRef = useRef(count);
  countRef.current = count;
  const [dir, setDir] = useState(1);
  const onSelectedIndexChangeRef = useRef(onSelectedIndexChange);
  onSelectedIndexChangeRef.current = onSelectedIndexChange;

  const active = modIdx(Math.round(posDisplay), count);

  const half = Math.floor(Math.min(Math.max(1, buttonCount), Math.max(count, 1)) / 2);
  const buffer = half + 1;

  const cardRadiusPx =
    (Math.max(0, Math.min(20, cardRadius)) / 20) * (Math.min(imageWidth, imageHeight) / 2);
  const buttonRadiusPx = (Math.max(0, Math.min(20, buttonRadius)) / 20) * (buttonSize / 2);
  const tightness = Math.max(0.0001, Math.min(10, curve) / 10);
  const step = buttonSize + gap;
  const dPsi = count > 0 ? ((Math.PI * 2) / count) * tightness : 0;
  const radius = dPsi === 0 ? step : step / (2 * Math.sin(dPsi / 2));
  const baseTop = buttonSize * 0.9;
  const fadeInner = Math.max(0, half - 0.4);
  const fadeEnd = half + 0.6;
  const maxPsi = Math.min(Math.PI, fadeEnd * dPsi);
  const stripHeight = baseTop + radius * (1 - Math.cos(maxPsi)) + buttonSize / 2 + 16;

  const select = useCallback(
    (itemIdx: number, emit: boolean) => {
      if (count <= 0) return;
      const currentActive = modIdx(Math.round(posRef.current), count);
      if (itemIdx === currentActive) return;

      let delta = itemIdx - Math.round(posRef.current);
      delta = ((delta % count) + count) % count;
      if (delta > count / 2) delta -= count;
      setDir(Math.sign(delta) || 1);

      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      animRef.current = {
        startPos: posRef.current,
        targetPos: posRef.current + delta,
        startTime: performance.now(),
      };

      const duration = 320;
      function tick(now: number) {
        const { startPos, targetPos, startTime } = animRef.current;
        const progress = Math.min(1, (now - startTime) / duration);
        posRef.current = startPos + (targetPos - startPos) * easeCubicInOut(progress);
        setPosDisplay(posRef.current);
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          posRef.current = targetPos;
          setPosDisplay(targetPos);
          rafRef.current = null;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
      lastEmittedRef.current = itemIdx;
      if (emit) onSelectedIndexChangeRef.current?.(itemIdx);
    },
    [count],
  );

  const emitIfChanged = useCallback((itemIdx: number) => {
    if (itemIdx === lastEmittedRef.current) return;
    lastEmittedRef.current = itemIdx;
    onSelectedIndexChangeRef.current?.(itemIdx);
  }, []);

  const snapNearest = useCallback(
    (emit: boolean) => {
      if (count <= 0) return;
      const target = Math.round(posRef.current);
      const next = modIdx(target, count);
      if (Math.abs(posRef.current - target) < 0.001) {
        if (emit) emitIfChanged(next);
        return;
      }
      setDir(Math.sign(target - posRef.current) || 1);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      animRef.current = {
        startPos: posRef.current,
        targetPos: target,
        startTime: performance.now(),
      };
      const duration = 220;
      function tick(now: number) {
        const { startPos, targetPos, startTime } = animRef.current;
        const progress = Math.min(1, (now - startTime) / duration);
        posRef.current = startPos + (targetPos - startPos) * easeCubicInOut(progress);
        setPosDisplay(posRef.current);
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          posRef.current = targetPos;
          setPosDisplay(targetPos);
          rafRef.current = null;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
      if (emit) emitIfChanged(next);
    },
    [count, emitIfChanged],
  );

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (wheelSnapRef.current != null) window.clearTimeout(wheelSnapRef.current);
    };
  }, []);

  useEffect(() => {
    if (selectedIndex == null || count <= 0 || dragRef.current.down) return;
    const current = modIdx(Math.round(posRef.current), count);
    const next = modIdx(selectedIndex, count);
    if (next !== current) select(next, false);
  }, [count, select, selectedIndex]);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;

    const onMove = (event: PointerEvent) => {
      if (!dragRef.current.down) return;
      const countNow = countRef.current;
      if (countNow <= 0) return;
      const dx = event.clientX - dragRef.current.startX;
      if (Math.abs(dx) > 12) dragRef.current.moved = true;
      posRef.current = dragRef.current.startPos - dx / 30;
      setPosDisplay(posRef.current);
      setDir(dx < 0 ? 1 : -1);
      emitIfChanged(modIdx(Math.round(posRef.current), countNow));
    };

    const onUp = () => {
      if (!dragRef.current.down) return;
      const moved = dragRef.current.moved;
      dragRef.current.down = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (moved) {
        suppressClickRef.current = true;
        snapNearest(true);
      }
    };

    const onDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (!event.isPrimary) return;
      if (countRef.current <= 0) return;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      dragRef.current = {
        down: true,
        moved: false,
        startX: event.clientX,
        startPos: posRef.current,
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    };

    const onWheel = (event: WheelEvent) => {
      const countNow = countRef.current;
      if (countNow <= 0) return;
      event.preventDefault();
      event.stopPropagation();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const delta = event.deltaY || event.deltaX;
      posRef.current += delta > 0 ? 0.5 : -0.5;
      setPosDisplay(posRef.current);
      setDir(delta > 0 ? 1 : -1);
      emitIfChanged(modIdx(Math.round(posRef.current), countNow));
      if (wheelSnapRef.current != null) window.clearTimeout(wheelSnapRef.current);
      wheelSnapRef.current = window.setTimeout(() => {
        wheelSnapRef.current = null;
        snapNearest(true);
      }, 80);
    };

    strip.addEventListener("pointerdown", onDown);
    strip.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      strip.removeEventListener("pointerdown", onDown);
      strip.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [count, emitIfChanged, snapNearest]);

  if (count === 0) return null;

  const center = Math.round(posDisplay);
  const renderItems: number[] = [];
  const seen = new Set<number>();
  for (let slot = -buffer; slot <= buffer; slot += 1) {
    const idx = modIdx(center + slot, count);
    if (!seen.has(idx)) {
      seen.add(idx);
      renderItems.push(idx);
    }
  }

  function getVisualSlot(itemIdx: number): number {
    let slot = itemIdx - posDisplay;
    slot %= count;
    if (slot > count / 2) slot -= count;
    if (slot < -count / 2) slot += count;
    return slot;
  }

  function slotStyle(slot: number) {
    const angle = slot * dPsi;
    const x = radius * Math.sin(angle);
    const y = radius * (1 - Math.cos(angle));
    const deg = (angle * 180) / Math.PI;
    const absSlot = Math.abs(slot);
    const depth = Math.max(0, 1 - (0.55 * absSlot) / Math.max(1, half));
    const scale = 0.55 + 0.45 * depth;
    const opacity =
      absSlot <= fadeInner
        ? 1
        : absSlot >= fadeEnd
          ? 0
          : 1 - (absSlot - fadeInner) / (fadeEnd - fadeInner);
    const zIndex = Math.round(depth * 100) + (absSlot < 0.5 ? 100 : 0);
    return { x, y, deg, scale, opacity, zIndex };
  }

  const imgSweep = 260;
  const imgDip = 150;
  const imageVariants = {
    enter: (direction: number) => ({
      x: direction * imgSweep,
      y: imgDip,
      opacity: 0,
      scale: 0.82,
      rotate: direction * 8,
    }),
    center: { x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 },
    exit: (direction: number) => ({
      x: -direction * imgSweep,
      y: imgDip,
      opacity: 0,
      scale: 0.82,
      rotate: -direction * 8,
    }),
  };

  const activeItem = list[active];
  const portraitSrc = srcOf(activeItem?.image);
  const portraitAlt = altOf(activeItem?.image, activeItem?.label ?? "Selected member");

  return (
    <div
      className={cn(
        "relative flex w-full flex-col items-center justify-center gap-4 overflow-hidden",
        showPortrait ? "h-full" : "h-auto",
        className,
      )}
      style={{ ...style, background: backgroundColor, boxSizing: "border-box" }}
    >
      {showPortrait ? (
        <div
          className="bg-elevated relative shrink-0 overflow-hidden"
          style={{
            width: imageWidth,
            height: imageHeight,
            borderRadius: cardRadiusPx,
          }}
        >
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.div
              key={active}
              custom={dir}
              variants={imageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              {portraitSrc ? (
                <img
                  src={portraitSrc}
                  alt={portraitAlt}
                  draggable={false}
                  className="block size-full object-cover"
                />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      ) : null}

      {showPortrait && labelShow ? (
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={`label-${active}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-full shrink-0 text-center"
            style={{
              color: labelColor,
              transform: `translate(${labelX}px, ${labelY}px)`,
              fontFamily: labelFont.fontFamily,
              fontWeight: labelFont.fontWeight,
              fontSize: labelFont.fontSize,
              fontStyle: labelFont.fontStyle,
              letterSpacing: labelFont.letterSpacing,
              lineHeight: labelFont.lineHeight,
            }}
          >
            {activeItem?.label ?? ""}
          </motion.div>
        </AnimatePresence>
      ) : null}

      <div
        ref={stripRef}
        className="relative w-full shrink-0 cursor-grab touch-none overflow-hidden select-none active:cursor-grabbing"
        style={{ height: stripHeight }}
      >
        {renderItems.map((itemIdx) => {
          const slot = getVisualSlot(itemIdx);
          const { x, y, deg, scale, opacity, zIndex } = slotStyle(slot);
          const isActive = itemIdx === active;
          const item = list[itemIdx];
          const thumbSrc = srcOf(item?.buttonImage) || srcOf(item?.image);
          const label = item?.label ?? `Member ${itemIdx + 1}`;

          return (
            <div
              key={itemIdx}
              className="absolute"
              style={{
                left: "50%",
                top: baseTop,
                marginLeft: -buttonSize / 2,
                marginTop: -buttonSize / 2,
                width: buttonSize,
                height: buttonSize,
                transform: `translate(${x}px, ${y}px) rotate(${deg}deg) scale(${scale})`,
                transformOrigin: "center",
                opacity,
                zIndex,
                willChange: "transform, opacity",
                pointerEvents: opacity < 0.05 ? "none" : "auto",
              }}
            >
              <button
                type="button"
                aria-label={label}
                aria-pressed={isActive}
                onClick={() => {
                  if (suppressClickRef.current) {
                    suppressClickRef.current = false;
                    return;
                  }
                  select(itemIdx, true);
                }}
                className={cn(
                  "bg-elevated size-full overflow-hidden p-0",
                  "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                  isActive ? "ring-primary ring-2" : "ring-border ring-1",
                )}
                style={{
                  borderRadius: buttonRadiusPx,
                  transform: `rotate(${-deg}deg)`,
                  transformOrigin: "center",
                }}
              >
                {thumbSrc ? (
                  <img
                    src={thumbSrc}
                    alt=""
                    draggable={false}
                    className="block size-full object-cover"
                  />
                ) : null}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
