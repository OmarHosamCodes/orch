import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import { AgencyMarkGlyph } from "@/features/team/team-avatar-glyphs";
import { getTeamPreset, getTeamPresetId } from "@/features/team/team-avatar-presets";
import { getTeamAvatarPublicUrl } from "@/features/team/team-avatar-url";
import type { TeamInviteDialogViewModel } from "@/features/team/hooks/use-team-invite-dialog";
import { getServerUrl } from "@/lib/env";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/ui/avatar";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";

type TeamInviteDialogViewProps = {
  view: TeamInviteDialogViewModel;
};

function InviteAgencyMark({
  name,
  image,
  teamId,
}: {
  name: string;
  image: string | null;
  teamId: string | null;
}) {
  const serverUrl = getServerUrl();
  const preset = getTeamPreset(getTeamPresetId(image));
  const avatarUrl =
    preset || !image || !teamId || !serverUrl
      ? null
      : getTeamAvatarPublicUrl({ baseUrl: serverUrl, teamId, storageKey: image });
  const initial = name ? name.charAt(0).toUpperCase() : "?";

  return (
    <Avatar className="size-12 rounded-xl after:rounded-xl" aria-hidden="true">
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} alt="" className="rounded-xl object-cover" />
      ) : (
        <AgencyMarkGlyph
          glyph={preset ? preset.glyph : "initial"}
          initial={initial}
          className="absolute inset-0 size-full rounded-xl"
        />
      )}
      <AvatarFallback className="rounded-xl bg-primary/10 text-base font-semibold text-primary">
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}

export function TeamInviteDialogView({ view }: TeamInviteDialogViewProps) {
  return (
    <Dialog open={view.open} onOpenChange={view.onOpenChange}>
      <DialogContent showCloseButton overlayClassName="z-[70]" className={cn("z-[70] sm:max-w-md")}>
        <DialogHeader>
          <div className="flex items-start gap-3">
            <InviteAgencyMark name={view.teamName} image={view.teamImage} teamId={view.teamId} />
            <div className="min-w-0 flex-1">
              <DialogTitle>Join {view.teamName || "this agency"}?</DialogTitle>
              <DialogDescription className="mt-1.5">
                {view.invitedByName} invited you to join as {view.roleLabel}. Accept to start
                working with this agency.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
          <AgencyMemberAvatar
            name={view.invitedByName}
            avatarUrl={view.invitedByAvatar}
            size="sm"
            className="shrink-0"
          />
          <p className="min-w-0 truncate text-sm text-muted-foreground">
            Invited by <span className="font-medium text-foreground">{view.invitedByName}</span>
          </p>
        </div>

        {view.actionError ? <p className="text-sm text-destructive">{view.actionError}</p> : null}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" disabled={view.pending} onClick={view.onDecline}>
            {view.declining ? "Declining…" : "Decline"}
          </Button>
          <Button type="button" disabled={view.pending} onClick={view.onAccept}>
            {view.accepting ? "Joining…" : "Accept"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
