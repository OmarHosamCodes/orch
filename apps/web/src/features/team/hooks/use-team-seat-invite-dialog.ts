import { useState } from "react";
import { toast } from "sonner";

import { agencySeatInviteCopy } from "@/features/billing/agency-paywall-copy";
import { checkoutSeats } from "@/features/billing/billing-queries";
import { resolveNextSeatCount } from "@/features/billing/billing-seat-checkout";
import { useTeamStore } from "@/features/team/team-store";
import { getQueryClient } from "@/lib/query-client";
import { getErrorMessage } from "@/lib/utils/get-error-message";

export function useTeamSeatInviteDialog() {
  const seatInviteTeamId = useTeamStore((state) => state.seatInviteTeamId);
  const clearSeatInvite = useTeamStore((state) => state.clearSeatInvite);
  const [continuing, setContinuing] = useState(false);

  async function onContinue() {
    if (!seatInviteTeamId) {
      return;
    }

    setContinuing(true);
    try {
      const nextSeats = await resolveNextSeatCount(getQueryClient(), seatInviteTeamId);
      await checkoutSeats(seatInviteTeamId, nextSeats);
    } catch (error) {
      toast.error("Checkout unavailable", {
        description: getErrorMessage(error, "Please try again."),
      });
    } finally {
      setContinuing(false);
    }
  }

  function onCancel() {
    clearSeatInvite();
  }

  return {
    open: Boolean(seatInviteTeamId),
    copy: agencySeatInviteCopy(),
    continuing,
    onContinue: () => void onContinue(),
    onCancel,
    onOpenChange: (open: boolean) => {
      if (!open) {
        onCancel();
      }
    },
  };
}
