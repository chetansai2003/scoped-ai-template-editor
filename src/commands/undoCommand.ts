import {
  createRevisionToken,
  getScopedValueForCommand,
} from "./commandExecutor";
import type {
  CommandError,
  EditCommand,
  HistoryEntry,
  JsonValue,
  PropertyChange,
  StructureCommand,
  TemplateCommand,
} from "./commandTypes";
import type { HistoryCommandGroup } from "../history/historySelectors";
import type { ElementId, TemplateDocument, TemplateElement } from "../template/templateTypes";

export type UndoCommandResult =
  | { ok: true; command: TemplateCommand }
  | { ok: false; error: CommandError };

export function createUndoCommand(
  commandGroup: HistoryCommandGroup,
  template: TemplateDocument,
  meta: { id: string; timestamp: string },
): UndoCommandResult {
  if (commandGroup.entries.length === 0) {
    return fail("UNDO_NOOP", "There is no command to undo.");
  }

  return commandGroup.operationType === "structure"
    ? createStructuralUndoCommand(commandGroup, template, meta)
    : createPropertyUndoCommand(commandGroup, template, meta);
}

function createPropertyUndoCommand(
  commandGroup: HistoryCommandGroup,
  template: TemplateDocument,
  meta: { id: string; timestamp: string },
): UndoCommandResult {
  const [firstEntry] = commandGroup.entries;

  if (!firstEntry) {
    return fail("UNDO_NOOP", "There is no property command to undo.");
  }

  const targets = commandGroup.entries
    .map((entry) => {
      const element = template.elements[entry.elementId];
      const beforeValues = entry.before[entry.propertyScope] ?? {};

      if (!element) {
        return null;
      }

      const changes: PropertyChange[] = Object.entries(beforeValues)
        .map(([fieldName, beforeValue]) => {
          const currentValue = getScopedValueForCommand(
            element,
            entry.viewportScope,
            entry.propertyScope,
            fieldName,
          );
          const undoValue = getUndoValue(
            element,
            entry.viewportScope,
            entry.propertyScope,
            fieldName,
            beforeValue as JsonValue,
          );

          if (areJsonValuesEqual(currentValue, undoValue)) {
            return null;
          }

          return {
            path: `${entry.propertyScope}.${fieldName}`,
            oldValue: currentValue,
            newValue: undoValue,
          };
        })
        .filter((change): change is PropertyChange => Boolean(change));

      if (changes.length === 0) {
        return null;
      }

      return {
        elementId: entry.elementId,
        revisionToken: createRevisionToken(element, entry.viewportScope),
        changes,
      };
    })
    .filter((target): target is NonNullable<typeof target> => Boolean(target));

  if (targets.length === 0) {
    return fail("UNDO_NOOP", "The latest command already matches its previous values.");
  }

  const command: EditCommand = {
    id: meta.id,
    source: "restore",
    propertyScope: firstEntry.propertyScope,
    viewportScope: firstEntry.viewportScope,
    undoOfCommandId: commandGroup.commandId,
    targets,
    description: `Undo ${commandGroup.description}`,
    timestamp: meta.timestamp,
  };

  return { ok: true, command };
}

function getUndoValue(
  element: TemplateElement,
  viewportScope: HistoryEntry["viewportScope"],
  propertyScope: HistoryEntry["propertyScope"],
  fieldName: string,
  beforeValue: JsonValue,
): JsonValue {
  if (viewportScope === "all") {
    return beforeValue;
  }

  const baseValues = element[propertyScope] as Record<string, JsonValue | undefined>;
  const baseValue = baseValues[fieldName] ?? null;

  return areJsonValuesEqual(baseValue, beforeValue) ? null : beforeValue;
}

function createStructuralUndoCommand(
  commandGroup: HistoryCommandGroup,
  template: TemplateDocument,
  meta: { id: string; timestamp: string },
): UndoCommandResult {
  const beforeElements = collectStructuralBeforeElements(commandGroup.entries);

  if (Object.keys(beforeElements).length === 0) {
    return fail("UNDO_NOOP", "The latest structural command has no tree snapshot.");
  }

  const revisionTokens = Object.fromEntries(
    Object.keys(beforeElements)
      .filter((elementId) => Boolean(template.elements[elementId]))
      .map((elementId) => [
        elementId,
        createRevisionToken(template.elements[elementId], "all"),
      ]),
  );

  const command: StructureCommand = {
    kind: "structure",
    id: meta.id,
    source: "restore",
    viewportScope: "all",
    undoOfCommandId: commandGroup.commandId,
    revisionTokens,
    operation: {
      type: "restoreStructure",
      beforeElements,
    },
    description: `Undo ${commandGroup.description}`,
    timestamp: meta.timestamp,
  };

  return { ok: true, command };
}

function collectStructuralBeforeElements(
  entries: HistoryEntry[],
): Record<ElementId, TemplateElement | null> {
  const beforeElements: Record<ElementId, TemplateElement | null> = {};

  entries.forEach((entry) => {
    Object.entries(entry.structure?.beforeElements ?? {}).forEach(
      ([elementId, element]) => {
        beforeElements[elementId] = element ? structuredClone(element) : null;
      },
    );
  });

  return beforeElements;
}

function areJsonValuesEqual(left: JsonValue, right: JsonValue): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function fail(code: string, message: string): UndoCommandResult {
  return {
    ok: false,
    error: { code, message },
  };
}
