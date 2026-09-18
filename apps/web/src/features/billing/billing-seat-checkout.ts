import type { QueryClient } from "@tanstack/react-query";

import { orpcClient } from "@/lib/orpc";

import { billingStateQueryKey } from "./billing-queries";

type BillingStateSeats = {
  seats: number;
};

export async function resolveNextSeatCount(
  queryClient: QueryClient,
  teamId: string,
): Promise<number> {
  const cached = queryClient.getQueryData<BillingStateSeats>(billingStateQueryKey(teamId));
  if (cached?.seats != null) {
    return cached.seats + 1;
  }

  const billing = await orpcClient.billing.state({ teamId });
  queryClient.setQueryData(billingStateQueryKey(teamId), billing);
  return billing.seats + 1;
}
