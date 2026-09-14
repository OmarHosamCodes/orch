"use client";

import { type ComponentProps } from "react";
import { PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { field, floating, ghostButton } from "./surfaces";

export function ComposerMenu({
  open,
  align = "start",
  className,
  ...props
}: ComponentProps<"div"> & { open: boolean; align?: "start" | "end" }) {
  return (
    <div
      data-slot="composer-menu"
      data-open={open || undefined}
      className={cn(
        floating,
        "absolute bottom-full z-10 mb-2 flex w-72 flex-col gap-0.5 rounded-2xl p-1.5",
        align === "start" ? "start-0 origin-bottom-left" : "end-0 origin-bottom-right",
        "transition-[opacity,scale] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
        open ? "scale-100 opacity-100" : "pointer-events-none scale-[0.97] opacity-0",
        className,
      )}
      {...props}
    />
  );
}

export function ComposerMenuItem({
  active = false,
  className,
  ...props
}: ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      data-slot="composer-menu-item"
      data-active={active || undefined}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13.5px] transition-colors",
        active ? field : "hover:bg-foreground/[0.04]",
        className,
      )}
      {...props}
    />
  );
}

export function ComposerAttachButton({
  className,
  ...props
}: Omit<ComponentProps<"button">, "children">) {
  return (
    <button
      type="button"
      aria-label="Add attachment"
      data-slot="composer-attach"
      disabled={props.disabled}
      className={cn(
        ghostButton,
        "size-8 disabled:pointer-events-none disabled:opacity-30",
        className,
      )}
      {...props}
    >
      <PlusIcon className="size-4" />
    </button>
  );
}
