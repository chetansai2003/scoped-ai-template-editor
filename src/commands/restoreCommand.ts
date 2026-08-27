import {
  createRevisionToken,
  getScopedValueForCommand,
} from "./commandExecutor";
import type {
  CommandError,
  HistoryEntry,
  JsonValue,
  PropertyChange,
  TemplateCommand,
} from "./commandTypes";
import type { TemplateDocument } from "../template/templateTypes";

export interface RestoreCommandMeta {
  id: string;
  timestamp: string;
  description?: string;
}

export type RestoreCommandResult =
  | { ok: true; command: TemplateCommand }
  | { ok: false; error: CommandError };

export function createRestoreCommand(
  historyEntry: HistoryEntry,
  template: TemplateDocument,
  meta: RestoreCommandMeta,
): RestoreCommandResult {
  if (historyEntry.operationType === "structure" && historyEntry.structure) {
    return createStructureRestoreCommand(historyEntry, template, meta);
  }

  const element = template.elements[historyEntry.elementId];

  if (!element) {
    return {
      ok: false,
      error: {
        code: "UNKNOWN_ELEMENT",
        message: "Cannot restore a history entry for a missing element.",
        elementId: historyEntry.elementId,
      },
    };
  }

  const historicalValues = historyEntry.before[historyEntry.propertyScope] ?? {};
  const changes: PropertyChange[] = [];

  for (const [fieldName, historicalValue] of Object.entries(historicalValues)) {
    const currentValue = getScopedValueForCommand(
      element,
      historyEntry.viewportScope,
      historyEntry.propertyScope,
      fieldName,
    );

    if (!areJsonValuesEqual(currentValue, historicalValue as JsonValue)) {
      changes.push({
        path: `${historyEntry.propertyScope}.${fieldName}`,
        oldValue: currentValue,
        newValue: historicalValue as JsonValue,
      });
    }
  }

  if (changes.length === 0) {
    return {
      ok: false,
      error: {
        code: "RESTORE_NOOP",
        message: "Selected history entry already matches current scoped values.",
        elementId: historyEntry.elementId,
      },
    };
  }

  return {
    ok: true,
    command: {
      id: meta.id,
      source: "restore",
      propertyScope: historyEntry.propertyScope,
      viewportScope: historyEntry.viewportScope,
      targets: [
        {
          elementId: historyEntry.elementId,
          revisionToken: createRevisionToken(element, historyEntry.viewportScope),
          changes,
        },
      ],
      description:
        meta.description ?? `Restore ${historyEntry.elementId} from history`,
      timestamp: meta.timestamp,
    },
  };
}

function createStructureRestoreCommand(
  historyEntry: HistoryEntry,
  template: TemplateDocument,
  meta: RestoreCommandMeta,
): RestoreCommandResult {
  const beforeElements = historyEntry.structure?.beforeElements ?? {};
  const revisionTokens = Object.fromEntries(
    Object.keys(beforeElements)
      .filter((elementId) => Boolean(template.elements[elementId]))
      .map((elementId) => [
        elementId,
        createRevisionToken(template.elements[elementId], "all"),
      ]),
  );

  if (Object.keys(beforeElements).length === 0) {
    return {
      ok: false,
      error: {
        code: "RESTORE_NOOP",
        message: "Selected structural history entry has no structure snapshot.",
        elementId: historyEntry.elementId,
      },
    };
  }

  return {
    ok: true,
    command: {
      kind: "structure",
      id: meta.id,
      source: "restore",
      viewportScope: "all",
      revisionTokens,
      operation: {
        type: "restoreStructure",
        beforeElements,
      },
      description:
        meta.description ?? `Restore ${historyEntry.elementId} structure from history`,
      timestamp: meta.timestamp,
    },
  };
}

function areJsonValuesEqual(left: JsonValue, right: JsonValue): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
