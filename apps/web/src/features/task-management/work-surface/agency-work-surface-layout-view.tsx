import { AnimatePresence, MotionConfig, motion } from "motion/react";
import type { ReactNode } from "react";

import { agencyTimePaneBodyClass, agencyTimePaneStackClass } from "@/features/shared/agency-ui";
import { threadCoverVariants } from "@/features/task-management/task-thread/agency-task-thread-motion";
import { cn } from "@/lib/utils";

type AgencyWorkSurfaceLayoutViewProps = {
  trackerPane: ReactNode;
  contentPane: ReactNode;
  taskRail?: ReactNode;
  threadCover?: ReactNode;
  onThreadCoverShowComplete?: () => void;
};

export function AgencyWorkSurfaceLayoutView({
  trackerPane,
  contentPane,
  taskRail,
  threadCover,
  onThreadCoverShowComplete,
}: AgencyWorkSurfaceLayoutViewProps) {
  return (
    <div
      className="shimmer-container flex min-h-0 min-w-0 flex-1 flex-col gap-4 font-sans lg:flex-row lg:gap-5"
      data-agency-work-surface
    >
      <div className={cn(agencyTimePaneStackClass, "relative min-h-0 min-w-0 flex-1 basis-0")}>
        {trackerPane}
        <div className={agencyTimePaneBodyClass}>{contentPane}</div>
        <MotionConfig reducedMotion="user">
          <AnimatePresence>
            {threadCover ? (
              <motion.div
                key="task-thread-cover"
                className="absolute inset-0 z-30 overflow-hidden rounded-surface border border-border bg-card"
                variants={threadCoverVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                onAnimationComplete={(definition) => {
                  if (definition !== "show") return;
                  onThreadCoverShowComplete?.();
                }}
              >
                {threadCover}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </MotionConfig>
      </div>
      {taskRail}
    </div>
  );
}
