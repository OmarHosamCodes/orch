import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AgencySettingsPaneSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function AgencySettingsPaneSection({
  title,
  description,
  children,
  className,
}: AgencySettingsPaneSectionProps) {
  return (
    <section className={cn("border-t border-border pt-6 first:border-t-0 first:pt-0", className)}>
      <header className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

type AgencySettingsFieldProps = {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
};

export function AgencySettingsField({
  label,
  htmlFor,
  hint,
  children,
  className,
}: AgencySettingsFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
      {hint ? <p className="text-[11px] leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
