import { AnimatePresence, MotionConfig, motion } from "motion/react";
import type { ReactNode } from "react";

import { GlobalGrain } from "@/components/global-grain";
import {
  FIRST_RUN_SCREEN_TITLE,
  type FirstRunPrimerFrame,
} from "@/features/first-run/first-run-copy";
import { FirstRunFrameView } from "@/features/first-run/views/first-run-frame-view";
import { TeamCreateAgencyMarkView } from "@/features/team/views/team-create-agency-mark-view";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { SurfaceShimmer } from "@/ui/skeleton";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export type FirstRunViewProps = {
  loading: boolean;
  loadError: string | null;
  onAction: boolean;
  frame: FirstRunPrimerFrame;
  title: string;
  body: string;
  progressLabel: string | null;
  progressRatio: number;
  continueLabel: string;
  skipTourLabel: string;
  backLabel: string;
  canGoBack: boolean;
  name: string;
  presetId: string | null;
  logoPreviewUrl: string | null;
  errorMessage: string | null;
  pending: boolean;
  pendingLabel: string;
  submitLabel: string;
  skipCreateLabel: string | null;
  showMark: boolean;
  submitDisabled: boolean;
  onContinue: () => void;
  onSkipTour: () => void;
  onBack: () => void;
  onNameChange: (value: string) => void;
  onPresetChange: (presetId: string | null) => void;
  onPickLogo: () => void;
  onClearLogo: () => void;
  onSubmit: () => void;
  onSkipCreate: (() => void) | null;
};

function FirstRunScreen({
  title,
  onSkip,
  skipLabel,
  children,
}: {
  title: string;
  onSkip?: () => void;
  skipLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative h-full min-h-0 bg-background">
      <GlobalGrain />
      <div
        className={cn(
          "pointer-events-none fixed z-50",
          "inset-0 max-md:pt-[env(safe-area-inset-top)]",
        )}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={cn(
            "pointer-events-auto absolute flex transform-gpu flex-col overflow-hidden bg-card will-change-transform",
            "inset-0 max-md:rounded-none max-md:border-0 max-md:shadow-none",
            "md:inset-1 md:rounded-[20px] md:border md:border-border/50 md:shadow-2xl md:ring-1 md:ring-foreground/5",
          )}
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
              <p className="min-w-0 truncate text-sm font-semibold">{FIRST_RUN_SCREEN_TITLE}</p>
              {onSkip && skipLabel ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="shrink-0 text-muted-foreground"
                  onClick={onSkip}
                >
                  {skipLabel}
                </Button>
              ) : null}
            </div>
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          </div>
        </section>
      </div>
    </div>
  );
}

export function FirstRunView({
  loading,
  loadError,
  onAction,
  frame,
  title,
  body,
  progressLabel,
  progressRatio,
  continueLabel,
  skipTourLabel,
  backLabel,
  canGoBack,
  name,
  presetId,
  logoPreviewUrl,
  errorMessage,
  pending,
  pendingLabel,
  submitLabel,
  skipCreateLabel,
  showMark,
  submitDisabled,
  onContinue,
  onSkipTour,
  onBack,
  onNameChange,
  onPresetChange,
  onPickLogo,
  onClearLogo,
  onSubmit,
  onSkipCreate,
}: FirstRunViewProps) {
  if (loading) {
    return (
      <FirstRunScreen title="Opening Orch">
        <SurfaceShimmer className="h-full min-h-0" label="Opening Orch" />
      </FirstRunScreen>
    );
  }

  if (loadError) {
    return (
      <FirstRunScreen title="Welcome">
        <div className="flex h-full min-h-0 items-center justify-center p-6">
          <p className="max-w-sm text-center text-sm text-destructive">{loadError}</p>
        </div>
      </FirstRunScreen>
    );
  }

  return (
    <FirstRunScreen
      title={title}
      onSkip={onAction ? undefined : onSkipTour}
      skipLabel={onAction ? undefined : skipTourLabel}
    >
      <MotionConfig reducedMotion="user" transition={{ duration: 0.28, ease: EASE_OUT }}>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-auto">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={showMark ? "mark" : onAction ? "action" : frame}
                className="h-full min-h-0"
                initial={{ opacity: 0, filter: "blur(8px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, filter: "blur(6px)" }}
              >
                {showMark ? (
                  <div className="flex h-full min-h-0 items-center justify-center px-6 py-8">
                    <TeamCreateAgencyMarkView
                      name={name}
                      pending={pending}
                      presetId={presetId}
                      logoPreviewUrl={logoPreviewUrl}
                      nameInputId="first-run-agency-name"
                      onNameChange={onNameChange}
                      onPresetChange={onPresetChange}
                      onPickLogo={onPickLogo}
                      onClearLogo={onClearLogo}
                      onNameSubmit={onSubmit}
                    />
                  </div>
                ) : (
                  <FirstRunFrameView frame={onAction ? "agency" : frame} className="h-full" />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="shrink-0 border-t border-border bg-card">
            <div className="h-0.5 bg-border" aria-hidden>
              <motion.div
                className="h-full bg-primary"
                animate={{ width: `${Math.round(progressRatio * 100)}%` }}
                transition={{ duration: 0.28, ease: EASE_OUT }}
              />
            </div>
            <div className="flex flex-col gap-5 px-5 py-5 sm:px-8 sm:py-6">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  <h1
                    id="first-run-title"
                    className="text-2xl font-semibold tracking-tight text-balance text-foreground sm:text-3xl"
                  >
                    {title}
                  </h1>
                  <p className="mt-2 max-w-[46ch] text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {body}
                  </p>
                </motion.div>
              </AnimatePresence>

              {errorMessage ? (
                <p className="text-sm text-destructive" role="alert">
                  {errorMessage}
                </p>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {canGoBack ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-11 min-h-11 w-full sm:w-auto"
                    disabled={pending}
                    onClick={onBack}
                  >
                    {backLabel}
                  </Button>
                ) : (
                  <span className="hidden sm:block" />
                )}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  {onAction && onSkipCreate ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="lg"
                      className="h-11 min-h-11 w-full sm:w-auto"
                      disabled={pending}
                      onClick={onSkipCreate}
                    >
                      {skipCreateLabel}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="lg"
                    className="h-11 min-h-11 w-full sm:w-auto"
                    disabled={submitDisabled}
                    onClick={onAction ? onSubmit : onContinue}
                  >
                    {pending ? pendingLabel : onAction ? submitLabel : continueLabel}
                  </Button>
                </div>
              </div>
              {progressLabel ? (
                <p className="text-xs text-muted-foreground">{progressLabel}</p>
              ) : null}
            </div>
          </div>
        </div>
      </MotionConfig>
    </FirstRunScreen>
  );
}
