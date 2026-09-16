import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@/lib/navigation";

import {
  clientContactCompleteness,
  type ClientContactCompleteness,
} from "@/features/clients/client-contact-completeness";
import { agencyManagementHref } from "@/features/shared/agency-management-sections";
import { useAgencyClientsQuery, useAgencyProjectsQuery } from "@/features/shared/agency-queries";
import {
  catalogRateAmount,
  parseBillableRateAmount,
  previewConvertedRate,
} from "@/features/shared/format-rate";
import {
  selectIsClientMutationPending,
  selectIsContactMutationPending,
  useAgencyOpsStore,
} from "@/features/shared/stores/agency-ops";
import { teamDetailQueryOptions } from "@/features/team/team-queries";
import { orpc } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";

type AgencyClientDetailProject = {
  id: string;
  name: string;
  colorHueId: number | null;
  iconKey: string | null;
  deletedAt: string | null;
};

type AgencyClientDetailInvoice = {
  id: string;
  number: string;
  status: string;
  amount: number;
  remainingAmount: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
};

export type AgencyClientDetailViewModel = {
  teamId: string;
  clientId: string;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
  retryLoad: () => void;
  isOwner: boolean;
  client: {
    id: string;
    name: string;
    category: "internal" | "external";
    billableRateAmount: number | null;
    sourceBillableRateAmount: number | null;
    currency: string;
    archivedAt: string | null;
  } | null;
  isArchived: boolean;
  weekDurationSeconds: number;
  monthDurationSeconds: number;
  monthUninvoicedDurationSeconds: number;
  activeProjectCount: number;
  trashedProjectCount: number;
  projects: AgencyClientDetailProject[];
  contactCompleteness: ClientContactCompleteness;
  contactName: string;
  setContactName: (value: string) => void;
  contactEmail: string;
  setContactEmail: (value: string) => void;
  contactPhone: string;
  setContactPhone: (value: string) => void;
  contactDirty: boolean;
  saveContact: () => void;
  isContactMutationPending: boolean;
  editNameDraft: string;
  setEditNameDraft: (value: string) => void;
  editCategoryDraft: "internal" | "external";
  setEditCategoryDraft: (value: "internal" | "external") => void;
  editBillableRateDraft: string;
  setEditBillableRateDraft: (value: string) => void;
  editCurrencyDraft: string;
  setEditCurrencyDraft: (value: string) => void;
  agencyCurrency: string;
  ratePreviewAmount: number | null;
  saveCommercial: () => void;
  isClientMutationPending: boolean;
  canViewBilling: boolean;
  openInvoiceCount: number;
  outstandingAmount: number;
  billingCurrency: string;
  recentInvoices: AgencyClientDetailInvoice[];
  openMoney: () => void;
  archiveClient: () => void;
  unarchiveClient: () => void;
  createProjectOpen: boolean;
  setCreateProjectOpen: (open: boolean) => void;
  createProjectClients: Array<{
    id: string;
    name: string;
    category: "internal" | "external";
    billableRateAmount: number | null;
    currency: string;
    archivedAt: string | null;
  }>;
};

type UseAgencyClientDetailOptions = {
  teamId: string;
  clientId: string;
  onArchived?: () => void;
};

export function useAgencyClientDetail({
  teamId,
  clientId,
  onArchived,
}: UseAgencyClientDetailOptions): AgencyClientDetailViewModel {
  const navigate = useNavigate();
  const agencyOps = useAgencyOpsStore();
  const isClientMutationPending = useAgencyOpsStore(selectIsClientMutationPending);
  const isContactMutationPending = useAgencyOpsStore(selectIsContactMutationPending);

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactDirty, setContactDirty] = useState(false);
  const [editNameDraft, setEditNameDraft] = useState("");
  const [editCategoryDraft, setEditCategoryDraft] = useState<"internal" | "external">("external");
  const [editBillableRateDraft, setEditBillableRateDraft] = useState("");
  const [editCurrencyDraft, setEditCurrencyDraft] = useState("USD");
  const [createProjectOpen, setCreateProjectOpen] = useState(false);

  const teamQuery = useQuery({
    ...teamDetailQueryOptions(teamId),
    enabled: Boolean(teamId),
  });
  const isOwner = teamQuery.data?.role === "owner";

  const summaryQuery = useQuery({
    ...orpc.agencyOps.clients.commercialSummary.queryOptions({
      input: { teamId, clientId },
    }),
    enabled: Boolean(teamId && clientId),
  });

  const clientsQuery = useAgencyClientsQuery(teamId, { archiveFilter: "all" });

  const projectsQuery = useAgencyProjectsQuery(teamId, {
    clientId,
    trashFilter: "all",
    archiveFilter: "all",
  });

  const fxRatesQuery = useQuery({
    ...orpc.agencyOps.fxRates.list.queryOptions({
      input: { teamId },
    }),
    enabled: Boolean(teamId) && isOwner,
  });

  const summary = summaryQuery.data;
  const client = summary?.client ?? null;

  useEffect(() => {
    const contact = summary?.contact;
    if (contact) {
      setContactName(contact.name);
      setContactEmail(contact.email);
      setContactPhone(contact.phone);
    } else {
      setContactName("");
      setContactEmail("");
      setContactPhone("");
    }
    setContactDirty(false);
  }, [summary?.contact]);

  useEffect(() => {
    if (!client) return;
    setEditNameDraft(client.name);
    setEditCategoryDraft(client.category);
    const catalogAmount = catalogRateAmount(
      client.sourceBillableRateAmount,
      client.billableRateAmount,
    );
    setEditBillableRateDraft(catalogAmount === null ? "" : String(catalogAmount / 100));
    setEditCurrencyDraft(client.currency);
  }, [client]);

  const projects = useMemo(
    () =>
      (projectsQuery.data?.items ?? []).map((project) => ({
        id: project.id,
        name: project.name,
        colorHueId: project.colorHueId ?? null,
        iconKey: project.iconKey ?? null,
        deletedAt: project.deletedAt ?? null,
      })),
    [projectsQuery.data?.items],
  );

  const contactCompleteness = clientContactCompleteness({
    name: contactName,
    email: contactEmail,
    phone: contactPhone,
  });

  function saveContact() {
    if (!teamId || !clientId) return;
    void agencyOps.upsertContact(
      {
        teamId,
        clientId,
        name: contactName.trim(),
        email: contactEmail.trim(),
        phone: contactPhone.trim(),
      },
      {
        onSuccess: () => {
          setContactDirty(false);
          void summaryQuery.refetch();
        },
      },
    );
  }

  function saveCommercial() {
    if (!client || !teamId) return;
    const name = editNameDraft.trim();
    if (!name) return;
    const billableRateAmount = parseBillableRateAmount(editBillableRateDraft);
    if (editBillableRateDraft.trim() && billableRateAmount === null) return;

    const patch: {
      teamId: string;
      clientId: string;
      name?: string;
      category?: "internal" | "external";
      billableRateAmount?: number | null;
      currency?: string;
    } = { teamId, clientId: client.id };

    if (name !== client.name) patch.name = name;
    if (editCategoryDraft !== client.category) patch.category = editCategoryDraft;
    const catalogAmount = catalogRateAmount(
      client.sourceBillableRateAmount,
      client.billableRateAmount,
    );
    if (billableRateAmount !== catalogAmount || editCurrencyDraft !== client.currency) {
      patch.billableRateAmount = billableRateAmount;
      patch.currency = editCurrencyDraft;
    }
    if (Object.keys(patch).length === 2) return;
    void agencyOps.updateClient(patch).then(() => {
      void summaryQuery.refetch();
    });
  }

  function archiveClient() {
    if (!client || !teamId) return;
    void agencyOps
      .archiveClient({
        teamId,
        clientId: client.id,
        clientName: client.name,
      })
      .then((ok) => {
        if (ok) onArchived?.();
      });
  }

  function unarchiveClient() {
    if (!client || !teamId) return;
    void agencyOps.unarchiveClient({
      teamId,
      clientId: client.id,
      clientName: client.name,
    });
  }

  const isLoading = summaryQuery.isPending || projectsQuery.isPending;
  const isError = summaryQuery.isError;
  const errorMessage = getErrorMessage(summaryQuery.error, "Try refreshing.");
  const agencyCurrency = fxRatesQuery.data?.agencyCurrency ?? client?.currency ?? "USD";
  const parsedRateDraft = parseBillableRateAmount(editBillableRateDraft);
  const ratePreviewAmount =
    parsedRateDraft != null && editCurrencyDraft !== agencyCurrency
      ? previewConvertedRate(
          parsedRateDraft,
          editCurrencyDraft,
          agencyCurrency,
          fxRatesQuery.data?.items ?? [],
        )
      : null;

  return {
    teamId,
    clientId,
    isLoading,
    isError,
    errorMessage,
    retryLoad: () => {
      void summaryQuery.refetch();
      void projectsQuery.refetch();
    },
    isOwner,
    client,
    isArchived: Boolean(client?.archivedAt),
    weekDurationSeconds: summary?.weekDurationSeconds ?? 0,
    monthDurationSeconds: summary?.monthDurationSeconds ?? 0,
    monthUninvoicedDurationSeconds: summary?.monthUninvoicedDurationSeconds ?? 0,
    activeProjectCount: summary?.activeProjectCount ?? 0,
    trashedProjectCount: summary?.trashedProjectCount ?? 0,
    projects,
    contactCompleteness,
    contactName,
    setContactName: (value) => {
      setContactName(value);
      setContactDirty(true);
    },
    contactEmail,
    setContactEmail: (value) => {
      setContactEmail(value);
      setContactDirty(true);
    },
    contactPhone,
    setContactPhone: (value) => {
      setContactPhone(value);
      setContactDirty(true);
    },
    contactDirty,
    saveContact,
    isContactMutationPending,
    editNameDraft,
    setEditNameDraft,
    editCategoryDraft,
    setEditCategoryDraft,
    editBillableRateDraft,
    setEditBillableRateDraft,
    editCurrencyDraft,
    setEditCurrencyDraft,
    agencyCurrency,
    ratePreviewAmount,
    saveCommercial,
    isClientMutationPending,
    canViewBilling: summary?.billing.canView ?? false,
    openInvoiceCount: summary?.billing.openInvoiceCount ?? 0,
    outstandingAmount: summary?.billing.outstandingAmount ?? 0,
    billingCurrency: summary?.billing.currency ?? client?.currency ?? "USD",
    recentInvoices: summary?.billing.recentInvoices ?? [],
    openMoney: () => {
      navigate(agencyManagementHref("money"));
    },
    archiveClient,
    unarchiveClient,
    createProjectOpen,
    setCreateProjectOpen,
    createProjectClients: clientsQuery.data?.items ?? [],
  };
}
