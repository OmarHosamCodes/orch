import { lazy, Suspense, useEffect, useMemo, useState } from "react";

import ButtonCarousel from "@/components/originkit/ui/button-carousel";
import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import {
  agencyPanelClass,
  agencyWorkMetaClass,
  agencyWorkMetricClass,
  agencyWorkTitleClass,
} from "@/features/shared/agency-ui";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { SurfaceShimmer } from "@/ui/skeleton";

import type { PeopleDirectoryCard } from "./agency-people-directory";
import type { PeopleConfigBadge } from "./people-config-completion";
import { PeopleConfigProgress } from "./people-config-progress";
import { peopleDirectoryGalleryItems, wrapDirectoryIndex } from "./people-directory-gallery";

const CircularGallery = lazy(() => import("@/components/react-bits/circular-gallery"));

type AgencyPeopleDirectoryGalleryProps = {
  cards: readonly PeopleDirectoryCard[];
  onSelectMember: (userId: string) => void;
  onOpenProfile: (userId: string) => void;
};

function badgeInkClass(badge: NonNullable<PeopleConfigBadge>): string {
  switch (badge) {
    case "Incomplete":
      return "text-warning";
    case "Inactive":
    case "Override":
      return "text-muted";
    default: {
      const _exhaustive: never = badge;
      return _exhaustive;
    }
  }
}

function DirectoryFocusDock({
  card,
  onFinishSetup,
  onOpenProfile,
}: {
  card: PeopleDirectoryCard;
  onFinishSetup: () => void;
  onOpenProfile: () => void;
}) {
  const meta = [card.subtitle, card.detail].filter(Boolean).join(" · ");

  return (
    <div className="px-3 pb-3 pt-1 sm:px-4">
      <div className="bg-muted/35 rounded-2xl px-3 py-3 sm:px-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <AgencyMemberAvatar
              name={card.userName}
              userId={card.userId}
              avatarUrl={card.userAvatar}
              size="md"
              alt=""
              className="size-12 rounded-2xl"
            />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-baseline gap-2">
                <h3
                  className={cn(agencyWorkTitleClass, "truncate text-[0.9375rem] tracking-tight")}
                >
                  {card.userName}
                </h3>
                {card.badge ? (
                  <span className={cn("shrink-0 text-xs font-medium", badgeInkClass(card.badge))}>
                    {card.badge}
                  </span>
                ) : null}
              </div>
              <p className={cn(agencyWorkMetaClass, "mt-0.5 truncate")}>{meta}</p>
            </div>
          </div>

          <div className="flex min-w-[7.75rem] flex-col justify-center sm:items-end">
            <p className="flex items-baseline gap-1.5">
              <span className="flex items-baseline gap-px">
                <span className={cn(agencyWorkMetricClass, "text-lg leading-none")}>
                  {card.completionPercent}
                </span>
                <span className={cn(agencyWorkMetaClass, "text-[0.7rem]")}>%</span>
              </span>
              <span className={agencyWorkMetaClass}>configured</span>
            </p>
            <PeopleConfigProgress
              value={card.completionPercent}
              label={`${card.userName} configuration progress`}
              className="mt-2 h-1 w-28"
            />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" className="min-h-8 flex-1 sm:flex-none" onClick={onFinishSetup}>
              Finish setup
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-muted hover:text-highlighted min-h-8 flex-1 sm:flex-none"
              onClick={onOpenProfile}
            >
              Open profile
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AgencyPeopleDirectoryGallery({
  cards,
  onSelectMember,
  onOpenProfile,
}: AgencyPeopleDirectoryGalleryProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const galleryItems = useMemo(() => peopleDirectoryGalleryItems(cards), [cards]);
  const card = cards[wrapDirectoryIndex(selectedIndex, cards.length)];

  useEffect(() => {
    setSelectedIndex((current) => wrapDirectoryIndex(current, cards.length));
  }, [cards.length]);

  if (!card) return null;

  const focusedUserId = card.userId;
  const carouselItems = galleryItems.map((item) => ({
    image: { src: item.image, alt: item.text },
    buttonImage: { src: item.image, alt: item.text },
    label: item.text,
  }));

  function openSetup() {
    onSelectMember(focusedUserId);
  }

  return (
    <div className={cn(agencyPanelClass, "flex min-w-0 flex-col overflow-hidden")}>
      <p className="sr-only" aria-live="polite">
        {card.userName}
      </p>

      {reducedMotion ? (
        <div className="h-[22rem] w-full min-w-0 sm:h-[24rem]">
          <ButtonCarousel
            items={carouselItems}
            selectedIndex={wrapDirectoryIndex(selectedIndex, cards.length)}
            onSelectedIndexChange={setSelectedIndex}
            showPortrait
            labelShow
            imageWidth={220}
            imageHeight={220}
            buttonCount={Math.min(7, cards.length)}
            backgroundColor="transparent"
          />
        </div>
      ) : (
        <>
          <div className="relative h-[16.5rem] w-full min-w-0 sm:h-[20rem]">
            <Suspense fallback={<SurfaceShimmer overlay label="Loading member gallery" />}>
              <CircularGallery
                items={galleryItems}
                selectedIndex={wrapDirectoryIndex(selectedIndex, cards.length)}
                onSelectedIndexChange={setSelectedIndex}
                onItemActivate={(index) => {
                  const next = cards[wrapDirectoryIndex(index, cards.length)];
                  if (next) onSelectMember(next.userId);
                }}
                bend={2.4}
                borderRadius={0.08}
                scrollSpeed={5}
                scrollEase={0.08}
                textColor="#f4f4f5"
              />
            </Suspense>
          </div>
          <div className="w-full min-w-0">
            <ButtonCarousel
              items={carouselItems}
              selectedIndex={wrapDirectoryIndex(selectedIndex, cards.length)}
              onSelectedIndexChange={setSelectedIndex}
              showPortrait={false}
              labelShow={false}
              buttonCount={Math.min(7, cards.length)}
              backgroundColor="transparent"
            />
          </div>
        </>
      )}

      <DirectoryFocusDock
        card={card}
        onFinishSetup={openSetup}
        onOpenProfile={() => onOpenProfile(focusedUserId)}
      />
    </div>
  );
}
