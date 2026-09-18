import { CornerDownRight } from "lucide-react";

import { LucideIcon } from "@/lib/lucide-icon";

type AgencyPlaceholderSurfaceProps = {
  icon: string;
  title: string;
  body: string;
  hints?: string[];
};

export function AgencyPlaceholderSurface({
  icon,
  title,
  body,
  hints,
}: AgencyPlaceholderSurfaceProps) {
  return (
    <div className="rounded-surface border border-dashed border-default bg-card px-surface py-12 text-center">
      <LucideIcon name={icon} className="mx-auto size-7 text-muted" />
      <p className="mt-4 text-sm font-bold text-highlighted">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs text-muted">{body}</p>

      {hints && hints.length > 0 ? (
        <ul className="mx-auto mt-6 max-w-md space-y-2 text-left text-xs text-muted">
          {hints.map((hint) => (
            <li key={hint} className="flex items-start gap-2">
              <CornerDownRight className="mt-0.5 size-3.5 shrink-0 text-dimmed" />
              <span>{hint}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
