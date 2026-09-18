export type EntryDescriptionDisplayMode = "visible" | "omitted";

export function entryDescriptionDisplayMode(description: string): EntryDescriptionDisplayMode {
  return description.trim().length > 0 ? "visible" : "omitted";
}
