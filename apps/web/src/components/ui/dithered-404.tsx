"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type Dithered404Props = {
  className?: string;
  interactive?: boolean;
};

type Pixel = { x: number; y: number; homeX: number; homeY: number; phase: number };

const BAYER_4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;

function bayer(x: number, y: number) {
  return BAYER_4[((y % 4) + 4) % 4]![((x % 4) + 4) % 4]! / 16;
}

/** A quiet, token-colored take on the dithered 404 reference. */
export function Dithered404({ className, interactive = true }: Dithered404Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pixels: Pixel[] = [];
    const pointer = { x: -1000, y: -1000, active: false };
    let width = 0;
    let height = 0;
    let dpr = 1;

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const source = document.createElement("canvas");
      source.width = Math.floor(width * dpr);
      source.height = Math.floor(height * dpr);
      const sourceContext = source.getContext("2d");
      if (!sourceContext) return;
      sourceContext.fillStyle = "white";
      sourceContext.textAlign = "center";
      sourceContext.textBaseline = "middle";
      sourceContext.font = `700 ${Math.min(width * 0.42, height * 0.64) * dpr}px Poppins, sans-serif`;
      sourceContext.fillText("404", (width * dpr) / 2, (height * dpr) / 2);

      const data = sourceContext.getImageData(0, 0, source.width, source.height).data;
      const cell = Math.max(3, Math.round(5 * dpr));
      pixels.length = 0;
      for (let y = 0; y < source.height; y += cell) {
        for (let x = 0; x < source.width; x += cell) {
          const alpha = data[(y * source.width + x) * 4 + 3] ?? 0;
          if (alpha / 255 > bayer(Math.floor(x / cell), Math.floor(y / cell))) {
            pixels.push({
              x: x / dpr,
              y: y / dpr,
              homeX: x / dpr,
              homeY: y / dpr,
              phase: Math.random() * Math.PI * 2,
            });
          }
        }
      }

      // Paint a first frame immediately; this keeps the mark visible while
      // fonts and hydration settle, before the particle pass takes over.
      context.fillStyle =
        getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() ||
        "#8b8be8";
      context.globalAlpha = 0.9;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = `700 ${Math.min(width * 0.42, height * 0.64)}px Poppins, sans-serif`;
      context.fillText("404", width / 2, height / 2);
      context.globalAlpha = 1;
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
    };
    const onPointerLeave = () => {
      pointer.active = false;
    };
    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      const accent =
        getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() ||
        "#8b8be8";
      const shouldAnimate = !reducedMotion.matches && interactive;

      // Keep the 404 legible if a constrained canvas implementation cannot
      // read the offscreen glyph raster during hydration.
      if (pixels.length === 0) {
        context.fillStyle = accent;
        context.globalAlpha = 0.9;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.font = `700 ${Math.min(width * 0.42, height * 0.64)}px Poppins, sans-serif`;
        context.fillText("404", width / 2, height / 2);
        context.globalAlpha = 1;
      }

      for (const pixel of pixels) {
        if (shouldAnimate && interactive && pointer.active) {
          const dx = pixel.x - pointer.x;
          const dy = pixel.y - pointer.y;
          const distance = Math.hypot(dx, dy);
          if (distance < 100 && distance > 0) {
            const force = (1 - distance / 100) * 18;
            pixel.x += (dx / distance) * force * 0.08;
            pixel.y += (dy / distance) * force * 0.08;
          }
        }
        if (shouldAnimate) {
          pixel.x += (pixel.homeX - pixel.x) * 0.08;
          pixel.y += (pixel.homeY - pixel.y) * 0.08;
        } else {
          pixel.x = pixel.homeX;
          pixel.y = pixel.homeY;
        }
        const shimmer = shouldAnimate ? Math.sin(time * 0.0012 + pixel.phase) * 0.12 + 0.88 : 0.92;
        context.fillStyle = accent;
        context.globalAlpha = shimmer;
        context.fillRect(pixel.x, pixel.y, Math.max(2, 4 / dpr), Math.max(2, 4 / dpr));
      }
      context.globalAlpha = 1;
      if (shouldAnimate) frameRef.current = requestAnimationFrame(draw);
    };

    try {
      build();
    } catch {
      pixels.length = 0;
    }
    const observer = new ResizeObserver(() => {
      try {
        build();
      } catch {
        pixels.length = 0;
      }
    });
    observer.observe(canvas);
    if (interactive) {
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerleave", onPointerLeave);
    }
    if (reducedMotion.matches) draw(0);
    else frameRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameRef.current);
      observer.disconnect();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [interactive]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("pointer-events-auto absolute inset-0 size-full", className)}
    />
  );
}
