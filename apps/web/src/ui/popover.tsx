"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Popover({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

export type PopoverSize = "menu" | "form" | "chooser" | "inbox";

const popoverSizeClasses: Record<PopoverSize, string> = {
  // Dense action menus (time-entry ⋮, report rows, billable toggles).
  menu: "w-56 p-1",
  // Small form panels (estimates, exemptions, client/segment forms).
  form: "w-80 p-0",
  // Search choosers (tasks, members, tags, filters, models).
  chooser: "w-[22.5rem] max-w-[calc(100vw-2rem)] p-0",
  // Rich panels (notifications inbox).
  inbox: "w-[23.75rem] max-w-[calc(100vw-2rem)] p-0",
};

function PopoverContent({
  className,
  align = "center",
  sideOffset = 6,
  collisionPadding = 12,
  size,
  tone = "quiet",
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & {
  size?: PopoverSize;
  tone?: "quiet" | "morph";
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        data-tone={tone}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          // Quiet-instrument float: hairline + ladder shadow, origin-aware spring.
          // Caller width/padding utilities still win via tailwind-merge.
          "z-[60] flex w-72 max-w-[calc(100vw-1.5rem)] max-h-(--radix-popover-content-available-height) origin-(--radix-popover-content-transform-origin) flex-col overflow-y-auto overscroll-contain rounded-surface border border-border bg-popover p-4 text-sm leading-relaxed text-popover-foreground shadow-lg outline-hidden",
          "duration-[var(--motion-duration-panel)] ease-[var(--motion-ease-emphasized)]",
          "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.98]",
          "data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1",
          "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-[0.98] data-closed:duration-100",
          // Morph tone (forms, composer menus): a more expressive rise. Same
          // contract, no extra wrappers — the trigger-feel difference only.
          tone === "morph" &&
            "data-open:zoom-in-[0.96] data-open:duration-300 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
          size && popoverSizeClasses[size],
          "motion-reduce:animate-none motion-reduce:transition-none",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

function PopoverAnchor({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="popover-header"
      className={cn("flex flex-col gap-1 text-sm", className)}
      {...props}
    />
  );
}

function PopoverTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2 data-slot="popover-title" className={cn("text-sm font-medium", className)} {...props} />
  );
}

function PopoverDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="popover-description"
      className={cn("text-xs leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}

function PopoverFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="popover-footer"
      className={cn(
        "flex shrink-0 flex-wrap items-center gap-3 border-t border-border px-3 py-2 text-xs text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function PopoverKbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="popover-kbd"
      className={cn(
        "rounded-md border border-border bg-card px-1.5 py-px font-mono text-[10.5px] font-medium text-muted-foreground shadow-[0_1.5px_0_rgba(0,0,0,0.35)]",
        className,
      )}
      {...props}
    />
  );
}

export {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverFooter,
  PopoverHeader,
  PopoverKbd,
  PopoverTitle,
  PopoverTrigger,
};
