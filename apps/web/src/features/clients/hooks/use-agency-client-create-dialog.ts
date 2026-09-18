import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useState, type FormEvent } from "react";

import { parseBillableRateAmount } from "@/features/shared/format-rate";
import {
  selectIsClientMutationPending,
  useAgencyOpsStore,
} from "@/features/shared/stores/agency-ops";
import { agencyTeamCapabilities } from "@/features/shared/agency-team-capabilities";
import { teamDetailQueryOptions } from "@/features/team/team-queries";

export type AgencyClientCreateCategory = "internal" | "external";

export type AgencyClientCreateDialogViewModel = {
  formId: string;
  name: string;
  setName: (value: string) => void;
  category: AgencyClientCreateCategory;
  setCategory: (value: AgencyClientCreateCategory) => void;
  billableRate: string;
  setBillableRate: (value: string) => void;
  currency: string;
  setCurrency: (value: string) => void;
  canEditRates: boolean;
  rateInvalid: boolean;
  canSubmit: boolean;
  isClientMutationPending: boolean;
  handleSubmit: (event: FormEvent) => Promise<void>;
};

type UseAgencyClientCreateDialogOptions = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  defaultCategory?: AgencyClientCreateCategory;
  onCreated?: (clientId: string) => void;
};

export function useAgencyClientCreateDialog({
  open,
  onOpenChange,
  teamId,
  defaultCategory = "external",
  onCreated,
}: UseAgencyClientCreateDialogOptions): AgencyClientCreateDialogViewModel {
  const agencyOps = useAgencyOpsStore();
  const isClientMutationPending = useAgencyOpsStore(selectIsClientMutationPending);
  const formId = useId();
  const teamQuery = useQuery({
    ...teamDetailQueryOptions(teamId),
    enabled: Boolean(teamId) && open,
  });
  const { canEditRecords, canEditRates } = agencyTeamCapabilities(teamQuery.data?.role);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<AgencyClientCreateCategory>(defaultCategory);
  const [billableRate, setBillableRate] = useState("");
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    if (!open) return;
    setName("");
    setCategory(defaultCategory);
    setBillableRate("");
    setCurrency("USD");
  }, [open, defaultCategory]);

  const parsedRate = parseBillableRateAmount(billableRate);
  const rateInvalid = Boolean(canEditRates && billableRate.trim() && parsedRate === null);
  const canSubmit =
    Boolean(name.trim()) &&
    Boolean(teamId) &&
    canEditRecords &&
    !isClientMutationPending &&
    !rateInvalid;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !teamId || !canEditRecords || rateInvalid || isClientMutationPending) return;

    await agencyOps.createClient(
      {
        teamId,
        name: trimmed,
        ...(canEditRates
          ? {
              category,
              billableRateAmount: parsedRate,
              currency,
            }
          : {}),
      },
      {
        onSuccess: (clientId) => {
          onOpenChange(false);
          onCreated?.(clientId);
        },
      },
    );
  }

  return {
    formId,
    name,
    setName,
    category,
    setCategory,
    billableRate,
    setBillableRate,
    currency,
    setCurrency,
    canEditRates,
    rateInvalid,
    canSubmit,
    isClientMutationPending,
    handleSubmit,
  };
}
