import { describe, expect, test } from "bun:test";

import {
  applyExcludeEntries,
  applyExcludeEntry,
  applyRedoExclude,
  applyStartEditing,
  applyUndoExclude,
} from "./use-agency-report-creator";

describe("agency report creator entry targeting", () => {
  test("applyStartEditing selects and edits the given entry id", () => {
    expect(applyStartEditing("b")).toEqual({
      selectedEntryId: "b",
      editingEntryId: "b",
    });
  });

  test("applyExcludeEntry removes only the given id and clears selection when it matches", () => {
    const withOtherSelected = applyExcludeEntry({
      excludedEntryIds: new Set(),
      excludeUndoStack: [],
      selectedEntryId: "a",
      editingEntryId: null,
      entryId: "b",
    });
    expect([...withOtherSelected.excludedEntryIds]).toEqual(["b"]);
    expect(withOtherSelected.selectedEntryId).toBe("a");
    expect(withOtherSelected.excludeUndoStack).toEqual([{ entryIds: ["b"] }]);
    expect(withOtherSelected.excludeRedoStack).toEqual([]);

    const withSameSelected = applyExcludeEntry({
      excludedEntryIds: new Set(["b"]),
      excludeUndoStack: [{ entryIds: ["b"] }],
      selectedEntryId: "a",
      editingEntryId: "a",
      entryId: "a",
    });
    expect([...withSameSelected.excludedEntryIds].sort()).toEqual(["a", "b"]);
    expect(withSameSelected.selectedEntryId).toBeNull();
    expect(withSameSelected.editingEntryId).toBeNull();
  });

  test("applyExcludeEntries batches a clustered row as one undo step and clears redo", () => {
    const next = applyExcludeEntries({
      excludedEntryIds: new Set(),
      excludeUndoStack: [],
      excludeRedoStack: [{ entryIds: ["old"] }],
      selectedEntryId: "a",
      editingEntryId: "b",
      entryIds: ["a", "b", "a"],
    });
    expect([...next.excludedEntryIds].sort()).toEqual(["a", "b"]);
    expect(next.excludeUndoStack).toEqual([{ entryIds: ["a", "b"] }]);
    expect(next.excludeRedoStack).toEqual([]);
    expect(next.selectedEntryId).toBeNull();
    expect(next.editingEntryId).toBeNull();
  });

  test("applyUndoExclude restores a batch and applyRedoExclude reapplies it", () => {
    const excluded = applyExcludeEntries({
      excludedEntryIds: new Set(),
      excludeUndoStack: [],
      selectedEntryId: null,
      editingEntryId: null,
      entryIds: ["a", "b"],
    });
    const undone = applyUndoExclude({
      excludedEntryIds: excluded.excludedEntryIds,
      excludeUndoStack: excluded.excludeUndoStack,
      excludeRedoStack: excluded.excludeRedoStack,
    });
    expect([...undone.excludedEntryIds]).toEqual([]);
    expect(undone.excludeUndoStack).toEqual([]);
    expect(undone.restored).toEqual({ entryIds: ["a", "b"] });

    const redone = applyRedoExclude({
      excludedEntryIds: undone.excludedEntryIds,
      excludeUndoStack: undone.excludeUndoStack,
      excludeRedoStack: undone.excludeRedoStack,
    });
    expect([...redone.excludedEntryIds].sort()).toEqual(["a", "b"]);
    expect(redone.excludeRedoStack).toEqual([]);
    expect(redone.redone).toEqual({ entryIds: ["a", "b"] });
  });
});
