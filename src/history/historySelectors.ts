import type { RootState } from "../app/store";
import type { EditSource, HistoryEntry } from "../commands/commandTypes";
import type { ViewportScope } from "../store/editorUISlice";
import type { ElementId } from "../template/templateTypes";

export interface HistoryCommandGroup {
  commandId: string;
  description: string;
  entries: HistoryEntry[];
  latestTimestamp: string;
  operationType: "property" | "structure";
  source: EditSource;
}

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

export function selectLatestUndoableCommandGroup(
  state: RootState,
): HistoryCommandGroup | null {
  const undoneCommandIds = new Set(state.history.undoneCommandIds ?? []);
  const groups = new Map<string, HistoryCommandGroup>();

  Object.values(state.history.byElement).forEach((scopedHistory) => {
    Object.values(scopedHistory).forEach((entries) => {
      entries.forEach((entry) => {
        if (entry.source === "restore" || undoneCommandIds.has(entry.commandId)) {
          return;
        }

        const existingGroup = groups.get(entry.commandId);

        if (existingGroup) {
          existingGroup.entries.push(entry);
          if (entry.timestamp > existingGroup.latestTimestamp) {
            existingGroup.latestTimestamp = entry.timestamp;
          }
          return;
        }

        groups.set(entry.commandId, {
          commandId: entry.commandId,
          description: entry.description,
          entries: [entry],
          latestTimestamp: entry.timestamp,
          operationType: entry.operationType,
          source: entry.source,
        });
      });
    });
  });

  return [...groups.values()].sort((left, right) =>
    right.latestTimestamp.localeCompare(left.latestTimestamp),
  )[0] ?? null;
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
