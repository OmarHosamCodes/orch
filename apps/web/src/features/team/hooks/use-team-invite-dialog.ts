import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { teamInvitesMineQueryOptions } from "@/features/team/team-queries";
import { useTeamInvitesStore } from "@/features/team/stores/team-invites";
import { authClient } from "@/lib/auth-client";
import { useNavigate } from "@/lib/navigation";

function roleLabel(role: "owner" | "editor" | "viewer") {
  switch (role) {
    case "owner":
      return "owner";
    case "editor":
      return "editor";
    case "viewer":
      return "viewer";
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

export function useTeamInviteDialog() {
  const session = authClient.useSession();
  const navigate = useNavigate();
  const enabled = Boolean(session.data?.user);
  const invitesQuery = useQuery({
    ...teamInvitesMineQueryOptions(),
    enabled,
  });

  const reviewInviteId = useTeamInvitesStore((state) => state.reviewInviteId);
  const dismissedDialogIds = useTeamInvitesStore((state) => state.dismissedDialogIds);
  const acceptingId = useTeamInvitesStore((state) => state.acceptingId);
  const decliningId = useTeamInvitesStore((state) => state.decliningId);
  const actionError = useTeamInvitesStore((state) => state.actionError);
  const dismissDialog = useTeamInvitesStore((state) => state.dismissDialog);
  const acceptInvite = useTeamInvitesStore((state) => state.acceptInvite);
  const declineInvite = useTeamInvitesStore((state) => state.declineInvite);

  const invites = invitesQuery.data?.items ?? [];
  const reviewed = reviewInviteId
    ? (invites.find((item) => item.id === reviewInviteId) ?? null)
    : null;
  const auto = invites.find((item) => !dismissedDialogIds.includes(item.id)) ?? null;
  const invite = reviewed ?? auto;
  const [heldInvite, setHeldInvite] = useState(invite);
  useEffect(() => {
    if (invite) setHeldInvite(invite);
  }, [invite]);
  const displayInvite = invite ?? heldInvite;
  const pending = Boolean(
    displayInvite && (acceptingId === displayInvite.id || decliningId === displayInvite.id),
  );

  return {
    open: Boolean(invite),
    teamId: displayInvite?.teamId ?? null,
    teamName: displayInvite?.teamName ?? "",
    teamImage: displayInvite?.teamImage ?? null,
    invitedByName: displayInvite?.invitedByName ?? "Someone",
    invitedByAvatar: displayInvite?.invitedByAvatar ?? null,
    roleLabel: displayInvite ? roleLabel(displayInvite.role) : "viewer",
    actionError,
    pending,
    accepting: Boolean(displayInvite && acceptingId === displayInvite.id),
    declining: Boolean(displayInvite && decliningId === displayInvite.id),
    onOpenChange: (open: boolean) => {
      if (!open && invite) dismissDialog(invite.id);
    },
    onAccept: () => {
      if (!invite || pending) return;
      void (async () => {
        const team = await acceptInvite(invite.id);
        if (team) await navigate("/agency", { replace: true });
      })();
    },
    onDecline: () => {
      if (!invite || pending) return;
      void declineInvite(invite.id);
    },
  };
}

export type TeamInviteDialogViewModel = ReturnType<typeof useTeamInviteDialog>;
