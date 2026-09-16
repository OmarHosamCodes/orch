import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { clientContactCompleteness } from "@/features/clients/client-contact-completeness";
import {
  clientBookCorridor,
  clientBookNeeds,
  groupClientsByCorridor,
  type ClientBookCorridorId,
  type ClientBookNeedId,
} from "@/features/clients/clients-book-corridors";
import { agencyListSearchMatches } from "@/features/shared/agency-list-search";
import {
  useAgencyClientsBookIndexQuery,
  useAgencyClientsQuery,
  useAgencyProjectTasksQuery,
  useAgencyProjectsQuery,
  useAgencyTimeEntriesQuery,
} from "@/features/shared/agency-queries";
import { useAgencyClientsActions } from "@/features/shared/agency-segment-filters";
import { catalogRateAmount, parseBillableRateAmount } from "@/features/shared/format-rate";
import {
  selectIsClientMutationPending,
  useAgencyOpsStore,
} from "@/features/shared/stores/agency-ops";
import type { AgencyListFiltersApplied } from "@/features/shared/use-agency-list-filters";
import { getTaskGroupKey } from "@/features/task-management/agency-task-utils";
import { teamDetailQueryOptions } from "@/features/team/team-queries";
import { getErrorMessage } from "@/lib/utils/get-error-message";

type AgencyClientCategory = "internal" | "external";

type AgencyClientsTableClient = {
  id: string;
  name: string;
  category: AgencyClientCategory;
  billableRateAmount: number | null;
  sourceBillableRateAmount: number | null;
  currency: string;
  archivedAt: string | null;
};

type AgencyClientsTableProject = {
  id: string;
  clientId: string;
  name: string;
  colorHueId: number | null;
  iconKey: string | null;
  deletedAt: string | null;
};

export type AgencyClientsBookRow = AgencyClientsTableClient & {
  corridor: ClientBookCorridorId;
  weekDurationSeconds: number;
  weekShare: number;
  monthUninvoicedDurationSeconds: number;
  outstandingAmount: number;
  billingCurrency: string;
  needs: ClientBookNeedId[];
  projects: AgencyClientsTableProject[];
};

type AgencyClientsBookCorridor = {
  id: ClientBookCorridorId;
  label: string;
  items: AgencyClientsBookRow[];
};

export type AgencyClientsTableViewModel = {
  openNewClient: () => void;
  isOwner: boolean;
  corridors: AgencyClientsBookCorridor[];
  filteredClients: AgencyClientsBookRow[];
  clients: AgencyClientsTableClient[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
  refetch: () => void;
  isClientMutationPending: boolean;
  editClientId: string;
  setEditClientId: (id: string) => void;
  editNameDraft: string;
  setEditNameDraft: (value: string) => void;
  editCategoryDraft: AgencyClientCategory;
  setEditCategoryDraft: (value: AgencyClientCategory) => void;
  editBillableRateDraft: string;
  setEditBillableRateDraft: (value: string) => void;
  editCurrencyDraft: string;
  setEditCurrencyDraft: (value: string) => void;
  saveClientEdits: (clientId: string) => void;
  createProjectClientId: string;
  setCreateProjectClientId: (id: string) => void;
  createProjectClients: AgencyClientsTableClient[];
  archiveClient: (clientId: string) => void;
  unarchiveClient: (clientId: string) => void;
};

type UseAgencyClientsTableOptions = {
  teamId: string;
  filters: AgencyListFiltersApplied;
};

export function useAgencyClientsTable({
  teamId,
  filters,
}: UseAgencyClientsTableOptions): AgencyClientsTableViewModel {
  const { openNewClient } = useAgencyClientsActions();
  const agencyOps = useAgencyOpsStore();
  const isClientMutationPending = useAgencyOpsStore(selectIsClientMutationPending);

  const [editClientId, setEditClientId] = useState("");
  const [createProjectClientId, setCreateProjectClientId] = useState("");
  const [editNameDraft, setEditNameDraft] = useState("");
  const [editCategoryDraft, setEditCategoryDraft] = useState<AgencyClientCategory>("external");
  const [editBillableRateDraft, setEditBillableRateDraft] = useState("");
  const [editCurrencyDraft, setEditCurrencyDraft] = useState("USD");

  const teamQuery = useQuery({
    ...teamDetailQueryOptions(teamId),
    enabled: Boolean(teamId),
  });
  const isOwner = teamQuery.data?.role === "owner";

  const clientsQuery = useAgencyClientsQuery(teamId, { archiveFilter: filters.archiveFilter });
  const bookIndexQuery = useAgencyClientsBookIndexQuery(teamId, {
    archiveFilter: filters.archiveFilter,
  });
  const projectsQuery = useAgencyProjectsQuery(teamId, { trashFilter: "all" });
  const entriesQuery = useAgencyTimeEntriesQuery(teamId, 1, 100);
  const tasksQuery = useAgencyProjectTasksQuery(teamId, {
    search: filters.filterTerm.trim() || undefined,
    pageSize: 100,
  });

  const clients = (clientsQuery.data?.items ?? []) as AgencyClientsTableClient[];
  const projects = (projectsQuery.data?.items ?? []).map((project) => ({
    id: project.id,
    clientId: project.clientId,
    name: project.name,
    colorHueId: project.colorHueId ?? null,
    iconKey: project.iconKey ?? null,
    deletedAt: project.deletedAt ?? null,
  }));
  const entries = entriesQuery.data?.items ?? [];
  const tasks = tasksQuery.data?.items ?? [];
  const canViewBilling = bookIndexQuery.data?.canViewBilling ?? false;
  const bookItems = bookIndexQuery.data?.items ?? [];

  const projectsByClient = useMemo(() => {
    const map = new Map<string, AgencyClientsTableProject[]>();
    for (const project of projects) {
      if (project.deletedAt) continue;
      const list = map.get(project.clientId) ?? [];
      list.push(project);
      map.set(project.clientId, list);
    }
    return map;
  }, [projects]);

  const bookByClient = useMemo(() => {
    return new Map(bookItems.map((item) => [item.clientId, item]));
  }, [bookItems]);

  const filteredClients = useMemo(() => {
    const term = filters.filterTerm;
    const { peopleSet, clientsSet, projectsSet, tasksSet } = filters;
    const matching = clients.filter((client) => {
      const clientProjects = projects.filter((project) => project.clientId === client.id);
      if (
        term &&
        !agencyListSearchMatches(
          term,
          client.name,
          ...clientProjects.map((project) => project.name),
        )
      ) {
        return false;
      }
      if (clientsSet.size > 0 && !clientsSet.has(client.id)) return false;
      if (projectsSet.size > 0 && !clientProjects.some((project) => projectsSet.has(project.id))) {
        return false;
      }
      if (
        peopleSet.size > 0 &&
        !clientProjects.some((project) =>
          entries.some((entry) => entry.projectId === project.id && peopleSet.has(entry.userId)),
        )
      ) {
        return false;
      }
      if (
        tasksSet.size > 0 &&
        !clientProjects.some((project) =>
          tasks.some(
            (task) => task.projectId === project.id && tasksSet.has(getTaskGroupKey(task)),
          ),
        )
      ) {
        return false;
      }
      return true;
    });

    const maxWeek = matching.reduce((highest, client) => {
      const week = bookByClient.get(client.id)?.weekDurationSeconds ?? 0;
      return Math.max(highest, week);
    }, 0);

    const rows: AgencyClientsBookRow[] = matching.map((client) => {
      const book = bookByClient.get(client.id);
      const weekDurationSeconds = book?.weekDurationSeconds ?? 0;
      const monthUninvoicedDurationSeconds = book?.monthUninvoicedDurationSeconds ?? 0;
      const outstandingAmount = book?.outstandingAmount ?? 0;
      const rateMissing =
        catalogRateAmount(client.sourceBillableRateAmount, client.billableRateAmount) === null;
      const contactIncomplete =
        clientContactCompleteness({
          name: book?.contactName,
          email: book?.contactEmail,
          phone: book?.contactPhone,
        }) !== "complete";
      return {
        ...client,
        corridor: clientBookCorridor({
          category: client.category,
          archivedAt: client.archivedAt,
          weekDurationSeconds,
          monthUninvoicedDurationSeconds,
          canViewBilling,
        }),
        weekDurationSeconds,
        weekShare: maxWeek > 0 ? weekDurationSeconds / maxWeek : 0,
        monthUninvoicedDurationSeconds,
        outstandingAmount,
        billingCurrency: book?.billingCurrency ?? client.currency,
        needs: clientBookNeeds({
          category: client.category,
          canViewBilling,
          monthUninvoicedDurationSeconds,
          outstandingAmount,
          rateMissing,
          contactIncomplete,
        }),
        projects: projectsByClient.get(client.id) ?? [],
      };
    });

    rows.sort((left, right) => {
      if (right.weekDurationSeconds !== left.weekDurationSeconds) {
        return right.weekDurationSeconds - left.weekDurationSeconds;
      }
      if (right.outstandingAmount !== left.outstandingAmount) {
        return right.outstandingAmount - left.outstandingAmount;
      }
      return left.name.localeCompare(right.name);
    });

    return rows;
  }, [bookByClient, canViewBilling, clients, entries, filters, projects, projectsByClient, tasks]);

  const corridors = useMemo(() => groupClientsByCorridor(filteredClients), [filteredClients]);

  function openEdit(clientId: string) {
    const client = clients.find((entry) => entry.id === clientId);
    if (client) {
      const catalogAmount = catalogRateAmount(
        client.sourceBillableRateAmount,
        client.billableRateAmount,
      );
      setEditNameDraft(client.name);
      setEditCategoryDraft(client.category);
      setEditBillableRateDraft(catalogAmount === null ? "" : String(catalogAmount / 100));
      setEditCurrencyDraft(client.currency);
    }
    setEditClientId(clientId);
  }

  function saveClientEdits(clientId: string) {
    const client = clients.find((entry) => entry.id === clientId);
    if (!client || !teamId) return;

    const name = editNameDraft.trim();
    if (!name) return;

    const billableRateAmount = parseBillableRateAmount(editBillableRateDraft);
    if (editBillableRateDraft.trim() && billableRateAmount === null) return;

    const patch: {
      teamId: string;
      clientId: string;
      name?: string;
      category?: AgencyClientCategory;
      billableRateAmount?: number | null;
      currency?: string;
    } = { teamId, clientId };

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

    setEditClientId("");
    if (Object.keys(patch).length === 2) return;
    void agencyOps.updateClient(patch);
  }

  function archiveClient(clientId: string) {
    const client = clients.find((entry) => entry.id === clientId);
    if (!client || !teamId) return;
    void agencyOps.archiveClient({
      teamId,
      clientId: client.id,
      clientName: client.name,
    });
  }

  function unarchiveClient(clientId: string) {
    const client = clients.find((entry) => entry.id === clientId);
    if (!client || !teamId) return;
    void agencyOps.unarchiveClient({
      teamId,
      clientId: client.id,
      clientName: client.name,
    });
  }

  const isLoading = clientsQuery.isPending || projectsQuery.isPending || bookIndexQuery.isPending;
  const isError = clientsQuery.isError || projectsQuery.isError || bookIndexQuery.isError;
  const errorMessage = getErrorMessage(
    clientsQuery.error ?? projectsQuery.error ?? bookIndexQuery.error,
    "Try refreshing.",
  );

  return {
    openNewClient,
    isOwner,
    corridors,
    filteredClients,
    clients,
    isLoading,
    isError,
    errorMessage,
    refetch: () => {
      void clientsQuery.refetch();
      void projectsQuery.refetch();
      void bookIndexQuery.refetch();
    },
    isClientMutationPending,
    editClientId,
    setEditClientId: (id) => {
      if (id) openEdit(id);
      else setEditClientId("");
    },
    editNameDraft,
    setEditNameDraft,
    editCategoryDraft,
    setEditCategoryDraft,
    editBillableRateDraft,
    setEditBillableRateDraft,
    editCurrencyDraft,
    setEditCurrencyDraft,
    saveClientEdits,
    createProjectClientId,
    setCreateProjectClientId,
    createProjectClients: clients,
    archiveClient,
    unarchiveClient,
  };
}
