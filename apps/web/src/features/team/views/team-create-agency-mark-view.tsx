import { Building2, Check, Upload } from "lucide-react";
import { AnimatePresence, motion, type Variants } from "motion/react";

import { shellFocusRingClass } from "@/features/app-shell/app-shell-ui";
import { AgencyMarkGlyph } from "@/features/team/team-avatar-glyphs";
import { TEAM_AVATAR_PRESETS } from "@/features/team/team-avatar-presets";
import { cn } from "@/lib/utils";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";

export type TeamCreateAgencyMarkViewProps = {
  name: string;
  pending: boolean;
  presetId: string | null;
  logoPreviewUrl: string | null;
  nameInputId?: string;
  onNameChange: (value: string) => void;
  onPresetChange: (presetId: string | null) => void;
  onPickLogo: () => void;
  onClearLogo: () => void;
  onNameSubmit: () => void;
};

const markStripVariants: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};

const markButtonVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } },
};

export function TeamCreateAgencyMarkView({
  name,
  pending,
  presetId,
  logoPreviewUrl,
  nameInputId = "create-agency-name",
  onNameChange,
  onPresetChange,
  onPickLogo,
  onClearLogo,
  onNameSubmit,
}: TeamCreateAgencyMarkViewProps) {
  const trimmedName = name.trim();
  const initial = trimmedName ? trimmedName.charAt(0).toUpperCase() : "?";
  const activePreset = TEAM_AVATAR_PRESETS.find((preset) => preset.id === presetId) ?? null;
  const canContinue = trimmedName.length > 0;
  const stageGlyph = logoPreviewUrl
    ? null
    : (activePreset?.glyph ?? (trimmedName ? "initial" : "question"));
  const stageKey =
    logoPreviewUrl ?? activePreset?.id ?? (trimmedName ? `initial:${initial}` : "question");
  const stageCaption = logoPreviewUrl
    ? "Custom logo"
    : activePreset
      ? activePreset.label
      : trimmedName
        ? "Initial"
        : "No mark yet";

  return (
    <div className="flex flex-col items-center gap-4 pt-1">
      <div className="relative size-40 shrink-0">
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-foreground/15"
          animate={{ opacity: activePreset || logoPreviewUrl ? 1 : 0.4 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        />
        <div className="relative size-40 overflow-hidden rounded-full">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={stageKey}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1, transition: { duration: 0.18, ease: "easeOut" } }}
              exit={{ opacity: 0, transition: { duration: 0.12, ease: "easeOut" } }}
            >
              {logoPreviewUrl ? (
                <img src={logoPreviewUrl} alt="" className="size-full object-cover" />
              ) : stageGlyph ? (
                <AgencyMarkGlyph glyph={stageGlyph} initial={initial} className="size-full" />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={stageKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.16, ease: "easeOut" } }}
          exit={{ opacity: 0, transition: { duration: 0.12, ease: "easeOut" } }}
          className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase"
          aria-live="polite"
        >
          {stageCaption}
        </motion.p>
      </AnimatePresence>

      <motion.div
        className="flex items-center gap-3"
        role="group"
        aria-label="Agency mark options"
        variants={markStripVariants}
        initial="initial"
        animate="animate"
      >
        {TEAM_AVATAR_PRESETS.map((preset) => {
          const selected = preset.id === presetId && !logoPreviewUrl;
          return (
            <motion.button
              key={preset.id}
              type="button"
              title={preset.label}
              aria-label={`Use ${preset.label} mark`}
              aria-pressed={selected}
              disabled={pending}
              onClick={() => {
                if (selected) {
                  onPresetChange(null);
                } else {
                  onClearLogo();
                  onPresetChange(preset.id);
                }
              }}
              variants={markButtonVariants}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              className={cn(
                "relative flex size-14 items-center justify-center overflow-hidden rounded-2xl",
                shellFocusRingClass,
                selected
                  ? "opacity-100 ring-2 ring-foreground ring-offset-2 ring-offset-background"
                  : "opacity-60 hover:opacity-100",
              )}
            >
              <AgencyMarkGlyph
                glyph={preset.glyph}
                initial={initial}
                className="absolute inset-0 size-full"
              />
              {selected ? (
                <span className="absolute right-1 bottom-1 flex size-5 items-center justify-center rounded-full bg-foreground text-background">
                  <Check className="size-3" aria-hidden />
                </span>
              ) : null}
            </motion.button>
          );
        })}
        <motion.button
          type="button"
          title={logoPreviewUrl ? "Replace custom logo" : "Upload custom logo"}
          aria-label={logoPreviewUrl ? "Replace custom logo" : "Upload custom logo"}
          aria-pressed={Boolean(logoPreviewUrl)}
          disabled={pending}
          onClick={onPickLogo}
          variants={markButtonVariants}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          className={cn(
            "relative flex size-14 items-center justify-center overflow-hidden rounded-2xl",
            shellFocusRingClass,
            logoPreviewUrl
              ? "opacity-100 ring-2 ring-foreground ring-offset-2 ring-offset-background"
              : "border border-dashed border-muted-foreground/40 text-muted-foreground opacity-70 hover:opacity-100",
          )}
        >
          {logoPreviewUrl ? (
            <>
              <img
                src={logoPreviewUrl}
                alt=""
                className="absolute inset-0 size-full object-cover"
              />
              <span className="absolute right-1 bottom-1 flex size-5 items-center justify-center rounded-full bg-foreground text-background">
                <Check className="size-3" aria-hidden />
              </span>
            </>
          ) : (
            <Upload className="size-5" aria-hidden />
          )}
        </motion.button>
      </motion.div>

      <div className="flex w-full max-w-md flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={nameInputId}>Agency name</Label>
          <span className="text-xs text-muted-foreground/60 tabular-nums">{name.length}/120</span>
        </div>
        <div className="relative">
          <Input
            id={nameInputId}
            value={name}
            placeholder="Acme Studio"
            autoFocus
            disabled={pending}
            maxLength={120}
            autoComplete="organization"
            className={cn("h-10 pr-3 pl-9", shellFocusRingClass)}
            onChange={(event) => onNameChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && canContinue && !pending) {
                event.preventDefault();
                onNameSubmit();
              }
            }}
          />
          <Building2
            aria-hidden="true"
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
        </div>
      </div>
    </div>
  );
}
