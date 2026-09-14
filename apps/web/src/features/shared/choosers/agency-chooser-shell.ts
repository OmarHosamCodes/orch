import { useEffect, useState, type RefObject } from "react";

export type AgencyChooserClientGroup<TProject> = {
  clientName: string;
  projects: TProject[];
};

type ProjectWithClient = { clientName: string };

export function groupItemsByClient<T extends ProjectWithClient>(
  items: T[],
  sort?: (left: T, right: T) => number,
): AgencyChooserClientGroup<T>[] {
  const sorted = sort ? [...items].sort(sort) : [...items];
  const clientGroups: AgencyChooserClientGroup<T>[] = [];
  let currentGroup: AgencyChooserClientGroup<T> | null = null;

  for (const item of sorted) {
    if (!currentGroup || currentGroup.clientName !== item.clientName) {
      currentGroup = { clientName: item.clientName, projects: [] };
      clientGroups.push(currentGroup);
    }
    currentGroup.projects.push(item);
  }

  return clientGroups;
}

export function sortProjectsByClientThenName<T extends ProjectWithClient & { name: string }>(
  left: T,
  right: T,
) {
  const clientSort = left.clientName.localeCompare(right.clientName);
  return clientSort || left.name.localeCompare(right.name);
}

type UseAgencyChooserOpenStateOptions = {
  controlledOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function useAgencyChooserOpenState({
  controlledOpen,
  onOpenChange,
}: UseAgencyChooserOpenStateOptions) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const open = controlledOpen ?? uncontrolledOpen;

  function setOpen(nextOpen: boolean) {
    onOpenChange?.(nextOpen);
    if (controlledOpen === undefined) {
      setUncontrolledOpen(nextOpen);
    }
    if (!nextOpen) {
      setSearchTerm("");
    }
  }

  return { open, searchTerm, setSearchTerm, setOpen };
}

type UseAgencyChooserScrollRevealOptions = {
  open: boolean;
  searchInputRef: RefObject<HTMLInputElement | null>;
  listRef: RefObject<HTMLDivElement | null>;
  selectedSelector: string;
  revealDeps: unknown[];
};

export function useAgencyChooserScrollReveal({
  open,
  searchInputRef,
  listRef,
  selectedSelector,
  revealDeps,
}: UseAgencyChooserScrollRevealOptions) {
  const [revealToken, setRevealToken] = useState(0);

  useEffect(() => {
    if (!open) return;
    setRevealToken((current) => current + 1);
  }, [open, ...revealDeps]);

  useEffect(() => {
    if (!open) return;

    const frame = requestAnimationFrame(() => {
      searchInputRef.current?.focus({ preventScroll: true });
      listRef.current?.querySelector<HTMLElement>(selectedSelector)?.scrollIntoView({
        block: "nearest",
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [open, revealToken, searchInputRef, listRef, selectedSelector]);

  return { bumpReveal: () => setRevealToken((current) => current + 1) };
}

/** Opt-out collapse: open unless the id is in the collapsed set. */
export function isChooserNodeExpanded(collapsedIds: Set<string>, id: string): boolean {
  return !collapsedIds.has(id);
}

/** Opt-in expand: closed unless the id is in the expanded set. */
export function isChooserNodeExpandedOptIn(expandedIds: Set<string>, id: string): boolean {
  return expandedIds.has(id);
}

/**
 * Projects start collapsed so task lists stay hidden until the user opens one.
 * The selected project auto-expands when the chooser opens.
 */
export function useAgencyChooserExpandedProjects(selectedProjectId: string | null, open: boolean) {
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!open || !selectedProjectId) return;

    setExpandedProjectIds((current) => {
      if (current.has(selectedProjectId)) return current;
      const next = new Set(current);
      next.add(selectedProjectId);
      return next;
    });
  }, [open, selectedProjectId]);

  function toggleProject(projectId: string) {
    setExpandedProjectIds((current) => {
      const next = new Set(current);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }

  function isProjectExpanded(projectId: string) {
    return isChooserNodeExpandedOptIn(expandedProjectIds, projectId);
  }

  return {
    isProjectExpanded,
    toggleProject,
    expandProject: (projectId: string) => {
      setExpandedProjectIds((current) => {
        if (current.has(projectId)) return current;
        const next = new Set(current);
        next.add(projectId);
        return next;
      });
    },
  };
}

/** Clients start open so project rows are visible without an extra click. */
export function useAgencyChooserExpandedClients(selectedClientName: string | null, open: boolean) {
  const [collapsedClientNames, setCollapsedClientNames] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!open || !selectedClientName) return;

    setCollapsedClientNames((current) => {
      if (!current.has(selectedClientName)) return current;
      const next = new Set(current);
      next.delete(selectedClientName);
      return next;
    });
  }, [open, selectedClientName]);

  function isClientExpanded(clientName: string) {
    return isChooserNodeExpanded(collapsedClientNames, clientName);
  }

  function toggleClient(clientName: string) {
    setCollapsedClientNames((current) => {
      const next = new Set(current);
      if (next.has(clientName)) {
        next.delete(clientName);
      } else {
        next.add(clientName);
      }
      return next;
    });
  }

  return {
    isClientExpanded,
    toggleClient,
    expandClient: (clientName: string) => {
      setCollapsedClientNames((current) => {
        if (!current.has(clientName)) return current;
        const next = new Set(current);
        next.delete(clientName);
        return next;
      });
    },
  };
}
