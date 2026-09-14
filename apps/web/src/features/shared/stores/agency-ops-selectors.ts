import type { AgencyOpsState } from "@/features/shared/stores/agency-ops";

export const selectIsClientMutationPending = (s: AgencyOpsState) => s.clientMutationCount > 0;
export const selectIsProjectMutationPending = (s: AgencyOpsState) => s.projectMutationCount > 0;
export const selectIsCreatingTask = (s: AgencyOpsState) => s.isCreatingTask;
export const selectIsContactMutationPending = (s: AgencyOpsState) => s.contactMutationCount > 0;
export const selectIsInvoiceMutationPending = (s: AgencyOpsState) => s.invoiceMutationCount > 0;
