import { Loader2 } from "lucide-react";
import { AnimatePresence, MotionConfig, motion, type Variants } from "motion/react";

import { AGENCY_CURRENCY_OPTIONS } from "@/features/shared/format-rate";
import { AgencyMarkGlyph } from "@/features/team/team-avatar-glyphs";
import { TEAM_AVATAR_PRESETS } from "@/features/team/team-avatar-presets";
import { TeamCreateAgencyMarkView } from "@/features/team/views/team-create-agency-mark-view";
import {
  TeamInviteCardView,
  type TeamInviteCardPending,
  type TeamInviteCardYou,
} from "@/features/team/views/team-invite-card-view";
import type { TeamSettingsRole } from "@/features/team/hooks/use-team-settings-modal-actions";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { AgencyCurrencyGlyph } from "@/features/shared/dialog-kit/agency-currency-glyph";
import { AgencySearchSelect } from "@/features/shared/agency-search-select";

export type CreateAgencyInviteDraft = {
  email: string;
  role: TeamSettingsRole;
};

type TeamCreateAgencyDialogViewProps = {
  open: boolean;
  step: number;
  stepDirection: number;
  name: string;
  pending: boolean;
  errorMessage: string | null;
  presetId: string | null;
  logoPreviewUrl: string | null;
  you: TeamInviteCardYou | null;
  inviteInputId: string;
  invites: CreateAgencyInviteDraft[];
  inviteEmail: string;
  inviteRole: TeamSettingsRole;
  currency: string;
  onOpenChange: (open: boolean) => void;
  onNameChange: (value: string) => void;
  onStepChange: (step: number) => void;
  onPresetChange: (presetId: string | null) => void;
  onPickLogo: () => void;
  onClearLogo: () => void;
  onInviteEmailChange: (value: string) => void;
  onInviteRoleChange: (role: TeamSettingsRole) => void;
  onAddInvite: () => void;
  onRemoveInvite: (email: string) => void;
  onCurrencyChange: (currency: string) => void;
  onSubmit: () => void;
};

const QUESTIONS = ["Pick your agency mark", "Who should join?", "Who are we?"] as const;

const HINTS = [
  "Choose a mark, then name your agency to continue. Both stay editable.",
  "Invite people now or skip — everyone joins after the agency is created.",
  "Your agency at a glance. Set its currency to finish.",
] as const;

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const stepPanelVariants: Variants = {
  initial: (direction: number) => ({ opacity: 0, x: 12 * direction }),
  animate: { opacity: 1, x: 0, transition: { duration: 0.22, ease: EASE_OUT } },
  exit: (direction: number) => ({
    opacity: 0,
    x: -8 * direction,
    transition: { duration: 0.15, ease: "easeOut" },
  }),
};

export function TeamCreateAgencyDialogView({
  open,
  step,
  stepDirection,
  name,
  pending,
  errorMessage,
  presetId,
  logoPreviewUrl,
  you,
  inviteInputId,
  invites,
  inviteEmail,
  inviteRole,
  currency,
  onOpenChange,
  onNameChange,
  onStepChange,
  onPresetChange,
  onPickLogo,
  onClearLogo,
  onInviteEmailChange,
  onInviteRoleChange,
  onAddInvite,
  onRemoveInvite,
  onCurrencyChange,
  onSubmit,
}: TeamCreateAgencyDialogViewProps) {
  const trimmedName = name.trim();
  const initial = trimmedName ? trimmedName.charAt(0).toUpperCase() : "?";
  const activePreset = TEAM_AVATAR_PRESETS.find((preset) => preset.id === presetId) ?? null;
  const safeStep = Math.min(Math.max(step, 0), 2);
  const canContinue = trimmedName.length > 0;
  const direction = stepDirection >= 0 ? 1 : -1;
  const stageGlyph = logoPreviewUrl
    ? null
    : (activePreset?.glyph ?? (trimmedName ? "initial" : "question"));

  function handleStepChange(next: number) {
    onStepChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <MotionConfig reducedMotion="user">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Create agency · Step {safeStep + 1} of 3
              </p>
            </div>
            <div
              className="h-0.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={safeStep + 1}
              aria-valuemin={1}
              aria-valuemax={3}
              aria-label="Onboarding progress"
            >
              <motion.div
                className="h-full w-full origin-left bg-foreground"
                initial={false}
                animate={{ scaleX: (safeStep + 1) / 3 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              />
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={safeStep}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.16, ease: "easeOut" } }}
                exit={{ opacity: 0, transition: { duration: 0.12, ease: "easeOut" } }}
                className="flex flex-col gap-1.5 pt-1"
              >
                <DialogTitle className="text-xl font-semibold tracking-tight">
                  {QUESTIONS[safeStep]}
                </DialogTitle>
                <DialogDescription>{HINTS[safeStep]}</DialogDescription>
              </motion.div>
            </AnimatePresence>
          </DialogHeader>

          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={safeStep}
              custom={direction}
              variants={stepPanelVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {safeStep === 0 ? (
                <TeamCreateAgencyMarkView
                  name={name}
                  pending={pending}
                  presetId={presetId}
                  logoPreviewUrl={logoPreviewUrl}
                  onNameChange={onNameChange}
                  onPresetChange={onPresetChange}
                  onPickLogo={onPickLogo}
                  onClearLogo={onClearLogo}
                  onNameSubmit={() => handleStepChange(1)}
                />
              ) : null}

              {safeStep === 1 ? (
                <div className="pt-1">
                  <TeamInviteCardView
                    you={you}
                    members={[]}
                    emailInputId={inviteInputId}
                    pending={invites.map(
                      (invite): TeamInviteCardPending => ({ email: invite.email }),
                    )}
                    inviteEmail={inviteEmail}
                    defaultRole={inviteRole}
                    staging={pending}
                    formError={null}
                    onInviteEmailChange={onInviteEmailChange}
                    onDefaultRoleChange={onInviteRoleChange}
                    onStageInvite={onAddInvite}
                    onRemovePending={onRemoveInvite}
                  />
                </div>
              ) : null}

              {safeStep === 2 ? (
                <div className="flex flex-col gap-4 pt-1">
                  <div className="flex items-center gap-3">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-2xl">
                      {logoPreviewUrl ? (
                        <img src={logoPreviewUrl} alt="" className="size-full object-cover" />
                      ) : stageGlyph ? (
                        <AgencyMarkGlyph
                          glyph={stageGlyph}
                          initial={initial}
                          className="size-full"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-semibold tracking-tight text-highlighted">
                        {trimmedName || "Unnamed agency"}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {invites.length === 0
                          ? "Just you"
                          : `You + ${invites.length} invite${invites.length === 1 ? "" : "s"}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-default pt-4">
                    <div>
                      <span className="block text-sm font-semibold text-muted">
                        Agency currency
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted">
                        Bills, payouts, and reports settle here.
                      </span>
                    </div>
                    <AgencySearchSelect
                      id="create-agency-currency"
                      value={currency}
                      onValueChange={onCurrencyChange}
                      disabled={pending}
                      options={AGENCY_CURRENCY_OPTIONS.map((code) => ({
                        value: code,
                        label: code,
                        glyph: <AgencyCurrencyGlyph code={code} />,
                      }))}
                      variant="chip"
                      aria-label="Agency currency"
                      className="w-28 shrink-0"
                    />
                  </div>
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {errorMessage ? (
              <motion.p
                key={errorMessage}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.16, ease: "easeOut" } }}
                exit={{ opacity: 0, transition: { duration: 0.12, ease: "easeOut" } }}
                className="text-sm text-destructive"
                role="alert"
              >
                {errorMessage}
              </motion.p>
            ) : null}
          </AnimatePresence>

          <DialogFooter className="gap-2 sm:gap-0">
            {safeStep > 0 ? (
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => handleStepChange(safeStep - 1)}
              >
                Back
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
            )}
            <div className="flex flex-1 justify-end gap-2">
              {safeStep < 2 ? (
                <Button
                  type="button"
                  disabled={pending || !canContinue}
                  onClick={() => handleStepChange(safeStep + 1)}
                >
                  Continue
                </Button>
              ) : (
                <Button type="button" disabled={pending || !canContinue} onClick={onSubmit}>
                  {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Create agency
                </Button>
              )}
            </div>
          </DialogFooter>
        </MotionConfig>
      </DialogContent>
    </Dialog>
  );
}
