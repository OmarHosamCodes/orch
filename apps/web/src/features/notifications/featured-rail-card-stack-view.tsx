import { Bell, Loader2, RefreshCw, X } from "lucide-react";
import { motion } from "motion/react";

import { shellFocusRingClass } from "@/features/app-shell/app-shell-ui";
import type { FeaturedRailCard } from "@/features/notifications/featured-rail-card-stack-types";
import type { FeaturedRailCardStackViewModel } from "@/features/notifications/hooks/use-featured-rail-card-stack";
import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import { Button } from "@/ui/button";
import { SurfaceShimmer } from "@/ui/skeleton";
import { cn } from "@/lib/utils";

const FAN_SPRING = { type: "spring" as const, stiffness: 400, damping: 30, mass: 0.64 };
const SWAP_LIFT_SPRING = { type: "spring" as const, stiffness: 520, damping: 32, mass: 0.52 };
const SWAP_LAND_SPRING = { type: "spring" as const, stiffness: 280, damping: 16, mass: 0.68 };
const CARD_HEIGHT_PX = 164;
const PEEK_PX = 40;

type SwapPhase = "lift" | "land" | null;

type FeaturedRailCardStackViewProps = {
  view: FeaturedRailCardStackViewModel;
};

function stackPose(
  stackIndex: number,
  isHovered: boolean,
  isSwapping: boolean,
  swapPhase: SwapPhase,
  reducedMotion: boolean,
) {
  const peekY = -stackIndex * PEEK_PX;

  if (reducedMotion) {
    return { x: 0, y: peekY, rotate: 0, scale: 1 };
  }

  if (isSwapping && swapPhase === "lift") {
    return { x: 42, y: -26, rotate: 14, scale: 1.06 };
  }

  if (isSwapping) {
    return { x: 0, y: 0, rotate: 0, scale: 1 };
  }

  if (stackIndex === 0) {
    return { x: 0, y: 0, rotate: 0, scale: 1 };
  }

  if (!isHovered) {
    return { x: 0, y: peekY, rotate: 0, scale: 0.985 };
  }

  return {
    x: stackIndex * 18,
    y: peekY - stackIndex * 10,
    rotate: stackIndex * 9,
    scale: 1,
  };
}

function cardTransition(
  isSwapping: boolean,
  swapPhase: SwapPhase,
  reducedMotion: boolean,
  deckIsSwapping: boolean,
) {
  if (reducedMotion) return { duration: 0 };
  if (isSwapping && swapPhase === "lift") return SWAP_LIFT_SPRING;
  if (isSwapping) return SWAP_LAND_SPRING;
  return {
    ...FAN_SPRING,
    delay: deckIsSwapping ? 0.05 : 0,
  };
}

function CardMark({ card }: { card: FeaturedRailCard }) {
  if (card.kind === "notification") {
    return (
      <AgencyMemberAvatar
        name={card.actorName?.trim() || "Team"}
        avatarUrl={card.actorAvatar ?? null}
        size="md"
        className="size-8 shrink-0"
      />
    );
  }

  return (
    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground">
      {card.kind === "app-update" ? (
        <RefreshCw className="size-3.5" aria-hidden />
      ) : (
        <Bell className="size-3.5" aria-hidden />
      )}
    </span>
  );
}

type RailStackCardProps = {
  card: FeaturedRailCard;
  stackIndex: number;
  isHovered: boolean;
  isSwapping: boolean;
  swapPhase: SwapPhase;
  reducedMotion: boolean;
  actionPending: boolean;
  onPromote: () => void;
  onCta: () => void;
  onDismiss: () => void;
};

function RailStackCard({
  card,
  stackIndex,
  isHovered,
  isSwapping,
  swapPhase,
  reducedMotion,
  actionPending,
  onPromote,
  onCta,
  onDismiss,
}: RailStackCardProps) {
  const isFront = stackIndex === 0;
  const pose = stackPose(stackIndex, isHovered, isSwapping, swapPhase, reducedMotion);

  return (
    <motion.article
      className={cn(
        "absolute inset-x-0 bottom-0 overflow-hidden rounded-surface border border-sidebar-border text-sidebar-foreground",
        isFront || isSwapping
          ? "bg-card shadow-[0_10px_24px_-8px_oklch(0_0_0_/_0.58)]"
          : "cursor-pointer bg-sidebar shadow-none",
        isSwapping && swapPhase === "lift"
          ? "shadow-[0_18px_36px_-10px_oklch(0_0_0_/_0.72)]"
          : null,
      )}
      style={{
        height: CARD_HEIGHT_PX,
        transformOrigin: "0% 100%",
        willChange: "transform",
        backfaceVisibility: "hidden",
      }}
      initial={false}
      animate={{
        x: pose.x,
        y: pose.y,
        rotate: pose.rotate,
        scale: pose.scale,
        zIndex: isSwapping ? 50 : 10 - stackIndex,
      }}
      transition={{
        ...cardTransition(isSwapping, swapPhase, reducedMotion, Boolean(swapPhase)),
        zIndex: { duration: 0 },
      }}
      onClick={() => {
        if (!isFront) onPromote();
      }}
      onKeyDown={(event) => {
        if (isFront) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onPromote();
        }
      }}
      role={isFront ? "article" : "button"}
      tabIndex={isFront ? undefined : 0}
      aria-label={
        isFront ? `${card.sectionLabel}: ${card.title}` : `Show ${card.sectionLabel}: ${card.title}`
      }
    >
      <div className={cn("p-3", !isFront && "pointer-events-none")}>
        <div className="flex items-start gap-2.5">
          <CardMark card={card} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium text-muted-foreground">
              {card.sectionLabel}
            </p>
            <h2 className="mt-0.5 line-clamp-1 text-sm font-semibold leading-snug tracking-tight text-sidebar-foreground">
              {card.title}
            </h2>
          </div>
          {isFront && card.dismissible ? (
            <button
              type="button"
              className={cn(
                "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                "disabled:pointer-events-none disabled:opacity-50",
                shellFocusRingClass,
              )}
              aria-label="Dismiss notification"
              disabled={actionPending}
              onClick={(event) => {
                event.stopPropagation();
                onDismiss();
              }}
            >
              <X className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </div>

        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {card.body}
        </p>

        <Button
          type="button"
          size="sm"
          className="mt-3 h-8 w-full rounded-full bg-sidebar-foreground text-xs font-semibold text-sidebar hover:bg-sidebar-foreground/90"
          disabled={!isFront || actionPending}
          tabIndex={isFront ? 0 : -1}
          aria-busy={actionPending}
          onClick={(event) => {
            event.stopPropagation();
            if (!isFront) return;
            onCta();
          }}
        >
          {actionPending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
          {card.ctaLabel}
        </Button>
      </div>
    </motion.article>
  );
}

export function FeaturedRailCardStackView({ view }: FeaturedRailCardStackViewProps) {
  if (!view.userId || !view.teamId) return null;

  if (view.listPending) {
    return (
      <div className="relative mx-1 min-h-[8.5rem] overflow-hidden rounded-xl border border-sidebar-border bg-sidebar">
        <SurfaceShimmer overlay label="Loading notifications" />
      </div>
    );
  }

  if (view.cards.length === 0) return null;

  const stackHeight = CARD_HEIGHT_PX + Math.max(0, view.cards.length - 1) * PEEK_PX;

  return (
    <section
      aria-label="Notifications"
      className="mx-1"
      onMouseEnter={() => view.onHoverChange(true)}
      onMouseLeave={() => view.onHoverChange(false)}
      onFocusCapture={() => view.onHoverChange(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          view.onHoverChange(false);
        }
      }}
    >
      {/* FORM: composition-A-wallet-peek user-approved-2026-09-17 */}
      <div className="relative w-full overflow-visible" style={{ height: stackHeight }}>
        {view.cards.map((card, index) => (
          <RailStackCard
            key={card.id}
            card={card}
            stackIndex={index}
            isHovered={view.isHovered}
            isSwapping={view.swappingCardId === card.id}
            swapPhase={view.swapPhase}
            reducedMotion={view.reducedMotion}
            actionPending={view.actionPendingId === card.id}
            onPromote={() => view.onPromoteCard(card.id)}
            onCta={() => view.onCardCta(card.id)}
            onDismiss={() => view.onDismissCard(card.id)}
          />
        ))}
      </div>

      {view.overflowCount > 0 ? (
        <p className="mt-2 text-center text-[11px] font-medium text-muted-foreground">
          {view.overflowCount === 1 ? "1 more" : `${view.overflowCount} more`}
        </p>
      ) : null}
    </section>
  );
}
