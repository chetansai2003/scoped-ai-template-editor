import type { RootState } from "../app/store";
import type { HistoryEntry } from "../commands/commandTypes";
import type { ViewportScope } from "../store/editorUISlice";
import type { ElementId } from "../template/templateTypes";

export function selectHistoryForElementScope(
  state: RootState,
  elementId: ElementId,
  viewportScope: ViewportScope,
): HistoryEntry[] {
  return state.history.byElement[elementId]?.[viewportScope] ?? [];
}

export function selectHistoryEntryById(
  state: RootState,
  historyEntryId: string,
): HistoryEntry | undefined {
  for (const scopedHistory of Object.values(state.history.byElement)) {
    for (const entries of Object.values(scopedHistory)) {
      const foundEntry = entries.find((entry) => entry.id === historyEntryId);

      if (foundEntry) {
        return foundEntry;
      }
    }
  }

  return undefined;
}

export function selectTotalCommittedHistoryEntries(state: RootState): number {
  return Object.values(state.history.byElement).reduce(
    (totalEntries, scopedHistory) =>
      totalEntries +
      Object.values(scopedHistory).reduce(
        (scopeTotal, entries) => scopeTotal + entries.length,
        0,
      ),
    0,
  );
}
