"use client";

import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  size?: "sm" | "md" | "lg";
}

const sizeConfig = {
  sm: {
    container: "size-20",
    titleClass: "text-sm/tight font-medium",
    subtitleClass: "text-xs/relaxed",
    spacing: "space-y-2",
    maxWidth: "max-w-48",
  },
  md: {
    container: "size-32",
    titleClass: "text-base/snug font-medium",
    subtitleClass: "text-sm/relaxed",
    spacing: "space-y-3",
    maxWidth: "max-w-56",
  },
  lg: {
    container: "size-40",
    titleClass: "text-lg/tight font-semibold",
    subtitleClass: "text-base/relaxed",
    spacing: "space-y-4",
    maxWidth: "max-w-64",
  },
} as const;

type RingLayerProps = {
  className?: string;
  lightGradient: string;
  darkGradient: string;
  mask: string;
  opacity: number;
  duration: number;
  reverse?: boolean;
  reducedMotion: boolean;
};

function RingLayer({
  className,
  lightGradient,
  darkGradient,
  mask,
  opacity,
  duration,
  reverse = false,
  reducedMotion,
}: RingLayerProps) {
  const rotate = reverse ? [0, -360] : [0, 360];

  return (
    <>
      <motion.div
        animate={reducedMotion ? undefined : { rotate }}
        className={cn("absolute inset-0 rounded-full dark:hidden", className)}
        style={{
          background: lightGradient,
          mask,
          WebkitMask: mask,
          opacity,
        }}
        transition={{
          duration,
          repeat: Number.POSITIVE_INFINITY,
          ease: reverse ? [0.4, 0, 0.6, 1] : "linear",
        }}
      />
      <motion.div
        animate={reducedMotion ? undefined : { rotate }}
        className={cn("absolute inset-0 hidden rounded-full dark:block", className)}
        style={{
          background: darkGradient,
          mask,
          WebkitMask: mask,
          opacity,
        }}
        transition={{
          duration,
          repeat: Number.POSITIVE_INFINITY,
          ease: reverse ? [0.4, 0, 0.6, 1] : "linear",
        }}
      />
    </>
  );
}

export function Loader({
  title = "Configuring your account...",
  subtitle = "Please wait while we prepare everything for you",
  size = "md",
  className,
  ...props
}: LoaderProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const config = sizeConfig[size];

  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-8 p-8", className)}
      {...props}
    >
      <motion.div
        animate={reducedMotion ? undefined : { scale: [1, 1.02, 1] }}
        aria-hidden="true"
        className={cn("relative", config.container)}
        transition={{
          duration: 4,
          repeat: Number.POSITIVE_INFINITY,
          ease: [0.4, 0, 0.6, 1],
        }}
      >
        <RingLayer
          darkGradient="conic-gradient(from 0deg, transparent 0deg, rgb(255, 255, 255) 90deg, transparent 180deg)"
          duration={3}
          lightGradient="conic-gradient(from 0deg, transparent 0deg, rgb(0, 0, 0) 90deg, transparent 180deg)"
          mask="radial-gradient(circle at 50% 50%, transparent 35%, black 37%, black 39%, transparent 41%)"
          opacity={0.8}
          reducedMotion={reducedMotion}
        />
        <RingLayer
          darkGradient="conic-gradient(from 0deg, transparent 0deg, rgb(255, 255, 255) 120deg, rgba(255, 255, 255, 0.5) 240deg, transparent 360deg)"
          duration={2.5}
          lightGradient="conic-gradient(from 0deg, transparent 0deg, rgb(0, 0, 0) 120deg, rgba(0, 0, 0, 0.5) 240deg, transparent 360deg)"
          mask="radial-gradient(circle at 50% 50%, transparent 42%, black 44%, black 48%, transparent 50%)"
          opacity={0.9}
          reducedMotion={reducedMotion}
        />
        <RingLayer
          darkGradient="conic-gradient(from 180deg, transparent 0deg, rgba(255, 255, 255, 0.6) 45deg, transparent 90deg)"
          duration={4}
          lightGradient="conic-gradient(from 180deg, transparent 0deg, rgba(0, 0, 0, 0.6) 45deg, transparent 90deg)"
          mask="radial-gradient(circle at 50% 50%, transparent 52%, black 54%, black 56%, transparent 58%)"
          opacity={0.35}
          reducedMotion={reducedMotion}
          reverse
        />
        <RingLayer
          darkGradient="conic-gradient(from 270deg, transparent 0deg, rgba(255, 255, 255, 0.4) 20deg, transparent 40deg)"
          duration={3.5}
          lightGradient="conic-gradient(from 270deg, transparent 0deg, rgba(0, 0, 0, 0.4) 20deg, transparent 40deg)"
          mask="radial-gradient(circle at 50% 50%, transparent 61%, black 62%, black 63%, transparent 64%)"
          opacity={0.5}
          reducedMotion={reducedMotion}
        />
      </motion.div>

      <motion.div
        animate={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
        aria-live="polite"
        className={cn("text-center", config.spacing, config.maxWidth)}
        initial={reducedMotion ? false : { opacity: 0, y: 12 }}
        transition={{
          delay: reducedMotion ? 0 : 0.4,
          duration: reducedMotion ? 0 : 1,
          ease: [0.4, 0, 0.2, 1],
        }}
      >
        <motion.h1
          animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          className={cn(
            config.titleClass,
            "font-medium text-foreground/90 leading-[1.15] tracking-[-0.02em] antialiased",
          )}
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          transition={{
            delay: reducedMotion ? 0 : 0.6,
            duration: reducedMotion ? 0 : 0.8,
            ease: [0.4, 0, 0.2, 1],
          }}
        >
          <motion.span
            animate={reducedMotion ? undefined : { opacity: [0.9, 0.7, 0.9] }}
            transition={{
              duration: 3,
              repeat: Number.POSITIVE_INFINITY,
              ease: [0.4, 0, 0.6, 1],
            }}
          >
            {title}
          </motion.span>
        </motion.h1>

        {subtitle ? (
          <motion.p
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            className={cn(
              config.subtitleClass,
              "font-normal text-muted-foreground leading-[1.45] tracking-[-0.01em] antialiased",
            )}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            transition={{
              delay: reducedMotion ? 0 : 0.8,
              duration: reducedMotion ? 0 : 0.8,
              ease: [0.4, 0, 0.2, 1],
            }}
          >
            <motion.span
              animate={reducedMotion ? undefined : { opacity: [0.85, 0.65, 0.85] }}
              transition={{
                duration: 4,
                repeat: Number.POSITIVE_INFINITY,
                ease: [0.4, 0, 0.6, 1],
              }}
            >
              {subtitle}
            </motion.span>
          </motion.p>
        ) : null}
      </motion.div>
    </div>
  );
}
