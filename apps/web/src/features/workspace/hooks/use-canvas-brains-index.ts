import { useMemo, useState } from "react";

import { useNavigate } from "@/lib/navigation";

import { canvasWorkspaceHref } from "@/features/workspace/canvas-workspace-path";
import type { CanvasBrainsIndexViewProps } from "@/features/workspace/canvas-brains-index-view";
import {
  useCanvasBrainAppearanceUpdate,
  useCanvasBrainCreate,
  useCanvasBrainsList,
  type CanvasBrainListItem,
} from "@/features/workspace/hooks/use-canvas-brains";

export type CanvasBrainSort = CanvasBrainsIndexViewProps["sort"];

function filterAndSortBrains(
  items: CanvasBrainListItem[],
  searchTerm: string,
  sort: CanvasBrainSort,
) {
  const query = searchTerm.trim().toLowerCase();
  let rows = items;
  if (query) {
    rows = rows.filter(
      (brain) =>
        brain.title.toLowerCase().includes(query) ||
        brain.instructions.toLowerCase().includes(query),
    );
  }
  rows = [...rows].sort((left, right) => {
    if (sort === "alpha") {
      return left.title.localeCompare(right.title, undefined, { sensitivity: "base" });
    }
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
  return rows;
}

export function useCanvasBrainsIndex(): CanvasBrainsIndexViewProps {
  const navigate = useNavigate();
  const list = useCanvasBrainsList();
  const appearance = useCanvasBrainAppearanceUpdate();
  const [searchTerm, setSearchTerm] = useState("");
  const [sort, setSort] = useState<CanvasBrainSort>("recent");

  const create = useCanvasBrainCreate((brain) => {
    void navigate(canvasWorkspaceHref(brain.id));
  });

  const visibleItems = useMemo(
    () => filterAndSortBrains(list.items, searchTerm, sort),
    [list.items, searchTerm, sort],
  );

  return {
    items: visibleItems,
    brainCount: list.items.length,
    isPending: list.isPending,
    errorMessage: list.errorMessage,
    searchTerm,
    onSearchTermChange: setSearchTerm,
    sort,
    onSortChange: setSort,
    onBrainIconChange: (brainId, iconKey) => {
      void appearance.updateAppearance(brainId, { iconKey });
    },
    onBrainColorChange: (brainId, colorHueId) => {
      void appearance.updateAppearance(brainId, { colorHueId });
    },
    appearancePending: appearance.isPending,
    create,
  };
}
