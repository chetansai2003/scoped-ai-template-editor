import {
  createRevisionToken,
  getScopedValueForCommand,
} from "../commands/commandExecutor";
import {
  getEditablePathsForElementType,
  isEditablePath,
  isProtectedPath,
} from "../commands/editableFields";
import { validateNewValue } from "../commands/valueValidation";
import type { EditCommand, JsonValue, PropertyChange } from "../commands/commandTypes";
import type { ViewportScope } from "../store/editorUISlice";
import type {
  EditScope,
  ElementId,
  TemplateDocument,
  TemplateElement,
} from "../template/templateTypes";
import type { CodeCommandResult } from "./codeTypes";

interface CodeCommandInput {
  template: TemplateDocument;
  elementId: ElementId;
  propertyScope: EditScope;
  viewportScope: ViewportScope;
  values: Record<string, JsonValue>;
}

export function getCodeEditableValues(
  element: TemplateElement,
  propertyScope: EditScope,
  viewportScope: ViewportScope,
): Record<string, JsonValue> {
  const values: Record<string, JsonValue> = {};
  const paths = getEditablePathsForElementType(element.type).filter((path) =>
    path.startsWith(`${propertyScope}.`),
  );

  paths.forEach((path) => {
    const fieldName = path.split(".")[1];
    const value = getScopedValueForCommand(
      element,
      viewportScope,
      propertyScope,
      fieldName,
    );

    if (value !== null) {
      values[fieldName] = value;
    }
  });

  return values;
}

export function createCodeEditCommand({
  template,
  elementId,
  propertyScope,
  viewportScope,
  values,
}: CodeCommandInput): CodeCommandResult {
  const element = template.elements[elementId];

  if (!element) {
    return { ok: false, error: "Selected element is no longer available." };
  }

  const changes: PropertyChange[] = [];

  for (const [fieldName, newValue] of Object.entries(values)) {
    const path = `${propertyScope}.${fieldName}`;

    if (isProtectedPath(path) || !isEditablePath(element.type, path)) {
      return {
        ok: false,
        error: `${path} is not editable for ${element.type} elements.`,
      };
    }

    const valueError = validateNewValue(propertyScope, fieldName, newValue);

    if (valueError) {
      return {
        ok: false,
        error: `${path}: ${valueError.message}`,
      };
    }

    const oldValue = getScopedValueForCommand(
      element,
      viewportScope,
      propertyScope,
      fieldName,
    );

    if (!areJsonValuesEqual(oldValue, newValue)) {
      changes.push({ path, oldValue, newValue });
    }
  }

  if (changes.length === 0) {
    return { ok: true, command: null };
  }

  const command: EditCommand = {
    id: createStableCommandId("code", elementId, propertyScope, viewportScope, changes),
    source: "code",
    propertyScope,
    viewportScope,
    targets: [
      {
        elementId,
        revisionToken: createRevisionToken(element, viewportScope),
        changes,
      },
    ],
    description: `Code edit ${elementId} ${propertyScope}`,
    timestamp: new Date().toISOString(),
  };

  return { ok: true, command };
}

function createStableCommandId(
  prefix: string,
  elementId: ElementId,
  propertyScope: EditScope,
  viewportScope: ViewportScope,
  changes: PropertyChange[],
): string {
  return `${prefix}-${elementId}-${propertyScope}-${viewportScope}-${hashString(
    JSON.stringify(changes),
  )}`;
}

function hashString(value: string): string {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
}

function areJsonValuesEqual(left: JsonValue, right: JsonValue): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
