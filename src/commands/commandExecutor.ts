import type { AppDispatch, RootState } from "../app/store";
import { commitValidatedTemplateChange } from "./commitActions";
import {
  editCommandSchema,
  structureCommandSchema,
  validatedCommitPayloadSchema,
} from "./commandSchemas";
import type {
  CommandError,
  CommandExecutionResult,
  EditCommand,
  ElementValueSnapshot,
  JsonValue,
  PropertyChange,
  StructureCommand,
  StructureOperation,
  TargetEdit,
  ValidatedCommitPayload,
  ValidatedTargetCommit,
} from "./commandTypes";
import {
  getFieldName,
  isEditablePath,
  isProtectedPath,
  pathMatchesScope,
} from "./editableFields";
import { validateTemplateStructure } from "./templateStructure";
import { validateNewValue } from "./valueValidation";
import type { ViewportScope } from "../store/editorUISlice";
import type {
  EditScope,
  ElementId,
  ElementContent,
  ElementLayout,
  ElementStyle,
  TemplateDocument,
  TemplateElement,
  TemplateElementType,
  Viewport,
} from "../template/templateTypes";

type ScopedValues = ElementContent | ElementStyle | ElementLayout;

export function executeCommand(command: unknown) {
  return (
    dispatch: AppDispatch,
    getState: () => RootState,
  ): CommandExecutionResult => {
    const state = getState();
    const payloadResult = buildValidatedCommitPayload(
      command,
      state.template,
      state.editorUI.selectedIds,
    );

    if (!payloadResult.ok) {
      return payloadResult;
    }

    dispatch(commitValidatedTemplateChange(payloadResult.payload));

    return {
      ok: true,
      commandId: payloadResult.payload.commandId,
      affectedElementIds: payloadResult.payload.targets.map(
        (target) => target.elementId,
      ),
    };
  };
}

export type ValidatedCommitBuildResult =
  | { ok: true; payload: ValidatedCommitPayload }
  | { ok: false; error: CommandError };

export function buildValidatedCommitPayload(
  rawCommand: unknown,
  template: TemplateDocument,
  currentSelectedIds: ElementId[],
): ValidatedCommitBuildResult {
  if (isRawStructureCommand(rawCommand)) {
    return buildValidatedStructureCommitPayload(
      rawCommand,
      template,
      currentSelectedIds,
    );
  }

  const parsedCommand = editCommandSchema.safeParse(rawCommand);

  if (!parsedCommand.success) {
    return fail("INVALID_COMMAND_SCHEMA", "Command does not match the command schema.");
  }

  const command = parsedCommand.data as EditCommand;
  const duplicateTarget = findDuplicateTarget(command.targets.map((target) => target.elementId));

  if (duplicateTarget) {
    return fail("DUPLICATE_TARGET", "Command contains duplicate element targets.", {
      elementId: duplicateTarget,
    });
  }

  const existingStructureError = validateTemplateStructure(template);

  if (existingStructureError) {
    return { ok: false, error: existingStructureError };
  }

  const aiAuthorityError = validateAiAuthority(command, currentSelectedIds);

  if (aiAuthorityError) {
    return { ok: false, error: aiAuthorityError };
  }

  let prospectiveTemplate = template;
  const validatedTargets: ValidatedTargetCommit[] = [];

  for (const target of command.targets) {
    const element = template.elements[target.elementId];

    if (!element) {
      return fail("UNKNOWN_ELEMENT", "Command targets an unknown element.", {
        elementId: target.elementId,
      });
    }

    const targetResult = buildValidatedTargetCommit(command, target, element);

    if (!targetResult.ok) {
      return targetResult;
    }

    prospectiveTemplate = {
      ...prospectiveTemplate,
      elements: {
        ...prospectiveTemplate.elements,
        [target.elementId]: targetResult.target.afterElement,
      },
    };

    validatedTargets.push(targetResult.target);
  }

  const prospectiveStructureError = validateTemplateStructure(prospectiveTemplate);

  if (prospectiveStructureError) {
    return { ok: false, error: prospectiveStructureError };
  }

  const payload: ValidatedCommitPayload = {
    commandId: command.id,
    source: command.source,
    propertyScope: command.propertyScope,
    viewportScope: command.viewportScope,
    description: command.description,
    timestamp: command.timestamp,
    targets: validatedTargets,
    undoOfCommandId: command.undoOfCommandId,
  };

  const payloadValidation = validatedCommitPayloadSchema.safeParse(payload);

  if (!payloadValidation.success) {
    return fail(
      "INVALID_COMMIT_PAYLOAD",
      "Validated commit payload failed reducer-safe schema validation.",
    );
  }

  return { ok: true, payload };
}

function buildValidatedStructureCommitPayload(
  rawCommand: unknown,
  template: TemplateDocument,
  currentSelectedIds: ElementId[],
): ValidatedCommitBuildResult {
  const parsedCommand = structureCommandSchema.safeParse(rawCommand);

  if (!parsedCommand.success) {
    return fail("INVALID_COMMAND_SCHEMA", "Command does not match the command schema.");
  }

  const command = parsedCommand.data as StructureCommand;

  const aiAuthorityError = validateStructureAiAuthority(
    command,
    currentSelectedIds,
  );

  if (aiAuthorityError) {
    return { ok: false, error: aiAuthorityError };
  }

  if (command.viewportScope !== "all") {
    return fail(
      "STRUCTURE_SCOPE_MISMATCH",
      "Structural commands must use all-viewports scope.",
    );
  }

  const existingStructureError = validateTemplateStructure(template);

  if (existingStructureError) {
    return { ok: false, error: existingStructureError };
  }

  const operationResult = applyStructureOperation(template, command.operation);

  if (!operationResult.ok) {
    return operationResult;
  }

  const revisionError = validateStructureRevisionTokens(
    command,
    template,
    operationResult.existingAffectedIds,
  );

  if (revisionError) {
    return { ok: false, error: revisionError };
  }

  const prospectiveStructureError = validateTemplateStructure(
    operationResult.template,
  );

  if (prospectiveStructureError) {
    return { ok: false, error: prospectiveStructureError };
  }

  const targets = operationResult.affectedIds.map((elementId) =>
    createStructureTargetCommit(
      command,
      template.elements[elementId],
      operationResult.template.elements[elementId],
      operationResult.beforeElements,
      operationResult.afterElements,
    ),
  );

  const payload: ValidatedCommitPayload = {
    commandId: command.id,
    source: command.source,
    propertyScope: "layout",
    viewportScope: "all",
    description: command.description,
    timestamp: command.timestamp,
    targets,
    removedElementIds: operationResult.removedElementIds,
    undoOfCommandId: command.undoOfCommandId,
  };

  const payloadValidation = validatedCommitPayloadSchema.safeParse(payload);

  if (!payloadValidation.success) {
    return fail(
      "INVALID_COMMIT_PAYLOAD",
      "Validated commit payload failed reducer-safe schema validation.",
    );
  }

  return { ok: true, payload };
}

function validateStructureAiAuthority(
  command: StructureCommand,
  currentSelectedIds: ElementId[],
): CommandError | null {
  if (command.source !== "ai") {
    return null;
  }

  if (!command.selectedIdsSnapshot) {
    return {
      code: "AI_SELECTION_REQUIRED",
      message: "AI structural commands require the selected IDs snapshot captured at proposal time.",
    };
  }

  const authorizedId = getStructureAuthorityElementId(command.operation);
  const snapshot = new Set(command.selectedIdsSnapshot);
  const currentSelection = new Set(currentSelectedIds);

  if (!snapshot.has(authorizedId) || !currentSelection.has(authorizedId)) {
    return {
      code: "AI_TARGET_UNAUTHORIZED",
      message: "AI structural command target is outside proposal-time or current selection authority.",
      elementId: authorizedId,
    };
  }

  return null;
}

function getStructureAuthorityElementId(operation: StructureOperation): ElementId {
  switch (operation.type) {
    case "reorder":
    case "move":
      return operation.elementId;
    case "duplicate":
      return operation.sourceElementId;
    case "add":
      return operation.parentId;
    case "restoreStructure":
      return Object.keys(operation.beforeElements)[0] ?? "";
  }
}

type StructureApplyResult =
  | {
      ok: true;
      template: TemplateDocument;
      affectedIds: ElementId[];
      existingAffectedIds: ElementId[];
      removedElementIds?: ElementId[];
      beforeElements: Record<ElementId, TemplateElement | null>;
      afterElements: Record<ElementId, TemplateElement | null>;
    }
  | { ok: false; error: CommandError };

function applyStructureOperation(
  template: TemplateDocument,
  operation: StructureOperation,
): StructureApplyResult {
  switch (operation.type) {
    case "reorder":
      return applyReorderOperation(template, operation);
    case "move":
      return applyMoveOperation(template, operation);
    case "add":
      return applyAddOperation(template, operation);
    case "duplicate":
      return applyDuplicateOperation(template, operation);
    case "restoreStructure":
      return applyRestoreStructureOperation(template, operation);
  }
}

function applyReorderOperation(
  template: TemplateDocument,
  operation: Extract<StructureOperation, { type: "reorder" }>,
): StructureApplyResult {
  const parent = template.elements[operation.parentId];

  if (!parent) {
    return failStructure("UNKNOWN_ELEMENT", "Reorder targets an unknown parent.", operation.parentId);
  }

  if (parent.children[operation.fromIndex] !== operation.elementId) {
    return failStructure("INVALID_STRUCTURE_OPERATION", "Reorder source index does not match the element.", operation.elementId);
  }

  if (operation.toIndex >= parent.children.length) {
    return failStructure("INVALID_STRUCTURE_OPERATION", "Reorder target index is outside the parent children.", operation.parentId);
  }

  const children = [...parent.children];
  const [movedId] = children.splice(operation.fromIndex, 1);
  children.splice(operation.toIndex, 0, movedId);
  const afterParent = incrementRevision({ ...parent, children }, "all");
  const nextTemplate = replaceElements(template, { [parent.id]: afterParent });

  return buildStructureResult(template, nextTemplate, [parent.id]);
}

function applyMoveOperation(
  template: TemplateDocument,
  operation: Extract<StructureOperation, { type: "move" }>,
): StructureApplyResult {
  const element = template.elements[operation.elementId];
  const fromParent = template.elements[operation.fromParentId];
  const toParent = template.elements[operation.toParentId];

  if (!element || !fromParent || !toParent) {
    return failStructure("UNKNOWN_ELEMENT", "Move targets an unknown element or parent.", operation.elementId);
  }

  if (element.id === template.rootElementId) {
    return failStructure("INVALID_STRUCTURE_OPERATION", "Root element cannot be moved.", element.id);
  }

  if (element.parentId !== fromParent.id || fromParent.children[operation.fromIndex] !== element.id) {
    return failStructure("INVALID_STRUCTURE_OPERATION", "Move source parent or index does not match.", element.id);
  }

  if (operation.toIndex > toParent.children.length) {
    return failStructure("INVALID_STRUCTURE_OPERATION", "Move target index is outside the destination parent.", toParent.id);
  }

  if (isDescendant(template, toParent.id, element.id) || toParent.id === element.id) {
    return failStructure("INVALID_STRUCTURE_OPERATION", "Element cannot move into itself or a descendant.", element.id);
  }

  if (!canParentContain(toParent.type, element.type)) {
    return failStructure("INVALID_STRUCTURE_OPERATION", "Destination parent cannot contain this element type.", toParent.id);
  }

  const fromChildren = fromParent.children.filter((childId) => childId !== element.id);
  const insertionIndex =
    fromParent.id === toParent.id && operation.toIndex > operation.fromIndex
      ? operation.toIndex - 1
      : operation.toIndex;
  const toChildren =
    fromParent.id === toParent.id
      ? [...fromChildren]
      : [...toParent.children];

  toChildren.splice(insertionIndex, 0, element.id);

  const updatedElement = incrementRevision(
    { ...element, parentId: toParent.id },
    "all",
  );
  const updatedFromParent = incrementRevision(
    { ...fromParent, children: fromParent.id === toParent.id ? toChildren : fromChildren },
    "all",
  );
  const updatedElements: Record<ElementId, TemplateElement> = {
    [element.id]: updatedElement,
    [fromParent.id]: updatedFromParent,
  };

  if (fromParent.id !== toParent.id) {
    updatedElements[toParent.id] = incrementRevision(
      { ...toParent, children: toChildren },
      "all",
    );
  }

  const nextTemplate = replaceElements(template, updatedElements);

  return buildStructureResult(template, nextTemplate, Object.keys(updatedElements));
}

function applyAddOperation(
  template: TemplateDocument,
  operation: Extract<StructureOperation, { type: "add" }>,
): StructureApplyResult {
  const parent = template.elements[operation.parentId];

  if (!parent) {
    return failStructure("UNKNOWN_ELEMENT", "Add targets an unknown parent.", operation.parentId);
  }

  if (template.elements[operation.element.id]) {
    return failStructure("INVALID_STRUCTURE_OPERATION", "Added element ID already exists.", operation.element.id);
  }

  if (operation.index > parent.children.length) {
    return failStructure("INVALID_STRUCTURE_OPERATION", "Add index is outside the parent children.", parent.id);
  }

  if (operation.element.parentId !== parent.id || operation.element.children.length > 0) {
    return failStructure("INVALID_STRUCTURE_OPERATION", "Added Step 4 elements must be leaves with the requested parent.", operation.element.id);
  }

  if (!canParentContain(parent.type, operation.element.type)) {
    return failStructure("INVALID_STRUCTURE_OPERATION", "Parent cannot contain the added element type.", parent.id);
  }

  const nextChildren = [...parent.children];
  nextChildren.splice(operation.index, 0, operation.element.id);

  const afterParent = incrementRevision({ ...parent, children: nextChildren }, "all");
  const nextTemplate = replaceElements(template, {
    [parent.id]: afterParent,
    [operation.element.id]: operation.element,
  });

  return buildStructureResult(template, nextTemplate, [parent.id, operation.element.id]);
}

function applyDuplicateOperation(
  template: TemplateDocument,
  operation: Extract<StructureOperation, { type: "duplicate" }>,
): StructureApplyResult {
  const source = template.elements[operation.sourceElementId];
  const parent = template.elements[operation.parentId];
  const clonedRoot = operation.clonedElements[operation.clonedRootId];

  if (!source || !parent || !clonedRoot) {
    return failStructure("UNKNOWN_ELEMENT", "Duplicate targets an unknown source, parent, or cloned root.", operation.sourceElementId);
  }

  if (source.id === template.rootElementId) {
    return failStructure("INVALID_STRUCTURE_OPERATION", "Root element cannot be duplicated.", source.id);
  }

  if (operation.index > parent.children.length) {
    return failStructure("INVALID_STRUCTURE_OPERATION", "Duplicate index is outside the parent children.", parent.id);
  }

  if (!canParentContain(parent.type, clonedRoot.type)) {
    return failStructure("INVALID_STRUCTURE_OPERATION", "Parent cannot contain the cloned root type.", parent.id);
  }

  const duplicateId = Object.keys(operation.clonedElements).find(
    (elementId) => Boolean(template.elements[elementId]),
  );

  if (duplicateId) {
    return failStructure("INVALID_STRUCTURE_OPERATION", "Cloned element ID already exists.", duplicateId);
  }

  if (clonedRoot.parentId !== parent.id) {
    return failStructure("INVALID_STRUCTURE_OPERATION", "Cloned root parent must match duplicate destination.", clonedRoot.id);
  }

  const nextChildren = [...parent.children];
  nextChildren.splice(operation.index, 0, clonedRoot.id);
  const afterParent = incrementRevision({ ...parent, children: nextChildren }, "all");
  const nextTemplate = replaceElements(template, {
    ...operation.clonedElements,
    [parent.id]: afterParent,
  });

  return buildStructureResult(template, nextTemplate, [
    parent.id,
    ...Object.keys(operation.clonedElements),
  ]);
}

function applyRestoreStructureOperation(
  template: TemplateDocument,
  operation: Extract<StructureOperation, { type: "restoreStructure" }>,
): StructureApplyResult {
  const replacements: Record<ElementId, TemplateElement> = {};
  const removedElementIds: ElementId[] = [];

  Object.entries(operation.beforeElements).forEach(([elementId, beforeElement]) => {
    if (beforeElement) {
      const currentElement = template.elements[elementId];
      replacements[elementId] = currentElement
        ? {
            ...beforeElement,
            revisions: {
              ...beforeElement.revisions,
              base: currentElement.revisions.base + 1,
            },
          }
        : beforeElement;
      return;
    }

    removedElementIds.push(elementId);
  });

  const nextTemplate: TemplateDocument = {
    ...template,
    elements: {
      ...template.elements,
      ...replacements,
    },
  };

  removedElementIds.forEach((elementId) => {
    delete nextTemplate.elements[elementId];
  });

  return buildStructureResult(
    template,
    nextTemplate,
    [...Object.keys(replacements), ...removedElementIds],
    removedElementIds,
  );
}

function buildStructureResult(
  beforeTemplate: TemplateDocument,
  afterTemplate: TemplateDocument,
  affectedIds: ElementId[],
  removedElementIds?: ElementId[],
): Extract<StructureApplyResult, { ok: true }> {
  const uniqueAffectedIds = [...new Set(affectedIds)];
  const beforeElements = createElementMapSnapshot(beforeTemplate, uniqueAffectedIds);
  const afterElements = createElementMapSnapshot(afterTemplate, uniqueAffectedIds);

  return {
    ok: true,
    template: afterTemplate,
    affectedIds: uniqueAffectedIds.filter((id) => Boolean(afterTemplate.elements[id])),
    existingAffectedIds: uniqueAffectedIds.filter((id) => Boolean(beforeTemplate.elements[id])),
    removedElementIds,
    beforeElements,
    afterElements,
  };
}

function createStructureTargetCommit(
  command: StructureCommand,
  beforeElement: TemplateElement | undefined,
  afterElement: TemplateElement,
  beforeElements: Record<ElementId, TemplateElement | null>,
  afterElements: Record<ElementId, TemplateElement | null>,
): ValidatedTargetCommit {
  const previousRevision = beforeElement?.revisions.base ?? 0;
  const resultingRevision = afterElement.revisions.base;

  return {
    elementId: afterElement.id,
    beforeElement,
    afterElement,
    before: { layout: {} },
    after: { layout: {} },
    previousRevision,
    resultingRevision,
    historyEntry: {
      id: `${command.id}:${afterElement.id}:structure`,
      commandId: command.id,
      elementId: afterElement.id,
      operationType: "structure",
      propertyScope: "layout",
      viewportScope: "all",
      source: command.source,
      description: command.description,
      before: { layout: {} },
      after: { layout: {} },
      structure: {
        operation: command.operation.type,
        beforeElements,
        afterElements,
      },
      previousRevision,
      resultingRevision,
      timestamp: command.timestamp,
    },
  };
}

function validateStructureRevisionTokens(
  command: StructureCommand,
  template: TemplateDocument,
  elementIds: ElementId[],
): CommandError | null {
  for (const elementId of elementIds) {
    const element = template.elements[elementId];
    const token = command.revisionTokens[elementId];
    const revisionError = validateRevisionToken("all", element, token);

    if (revisionError) {
      return { ...revisionError, elementId };
    }
  }

  return null;
}

function replaceElements(
  template: TemplateDocument,
  elements: Record<ElementId, TemplateElement>,
): TemplateDocument {
  return {
    ...template,
    elements: {
      ...template.elements,
      ...elements,
    },
  };
}

function createElementMapSnapshot(
  template: TemplateDocument,
  elementIds: ElementId[],
): Record<ElementId, TemplateElement | null> {
  return Object.fromEntries(
    elementIds.map((elementId) => [
      elementId,
      template.elements[elementId] ? structuredClone(template.elements[elementId]) : null,
    ]),
  );
}

function canParentContain(
  parentType: TemplateElementType,
  childType: TemplateElementType,
): boolean {
  if (childType === "page" || childType === "nav") {
    return false;
  }

  if (parentType === "page") {
    return childType === "section";
  }

  if (parentType === "section" || parentType === "container" || parentType === "stack") {
    return true;
  }

  if (parentType === "card") {
    return childType === "text" || childType === "badge" || childType === "button" || childType === "image";
  }

  return false;
}

function isDescendant(
  template: TemplateDocument,
  possibleDescendantId: ElementId,
  ancestorId: ElementId,
): boolean {
  const ancestor = template.elements[ancestorId];

  if (!ancestor) {
    return false;
  }

  if (ancestor.children.includes(possibleDescendantId)) {
    return true;
  }

  return ancestor.children.some((childId) =>
    isDescendant(template, possibleDescendantId, childId),
  );
}

function buildValidatedTargetCommit(
  command: EditCommand,
  target: TargetEdit,
  element: TemplateElement,
):
  | { ok: true; target: ValidatedTargetCommit }
  | { ok: false; error: CommandError } {
  const elementId = target.elementId;
  let afterElement = element;
  const before = createEmptySnapshot(command.propertyScope);
  const after = createEmptySnapshot(command.propertyScope);
  const preparedChanges: Array<{ change: PropertyChange; fieldName: string }> = [];

  for (const change of target.changes) {
    const pathError = validatePath(command.propertyScope, element, change);

    if (pathError) {
      return { ok: false, error: { ...pathError, elementId, path: change.path } };
    }

    const fieldName = getFieldName(change.path, command.propertyScope);

    if (!fieldName) {
      return {
        ok: false,
        error: {
          code: "INVALID_PROPERTY_PATH",
          message: "Property path must contain exactly one editable field.",
          elementId,
          path: change.path,
        },
      };
    }

    preparedChanges.push({ change, fieldName });
  }

  const revisionError = validateRevisionToken(
    command.viewportScope,
    element,
    target.revisionToken,
  );

  if (revisionError) {
    return { ok: false, error: { ...revisionError, elementId } };
  }

  for (const { change, fieldName } of preparedChanges) {
    const currentValue = getCurrentScopedValue(
      element,
      command.viewportScope,
      command.propertyScope,
      fieldName,
    );

    if (!areJsonValuesEqual(currentValue, change.oldValue)) {
      return {
        ok: false,
        error: {
          code: "OLD_VALUE_MISMATCH",
          message: "Command oldValue does not match the current scoped value.",
          elementId,
          path: change.path,
        },
      };
    }

    const newValueError = validateNewValue(
      command.propertyScope,
      fieldName,
      change.newValue,
    );

    if (newValueError) {
      return { ok: false, error: { ...newValueError, elementId, path: change.path } };
    }

    setSnapshotValue(before, command.propertyScope, fieldName, change.oldValue);
    setSnapshotValue(after, command.propertyScope, fieldName, change.newValue);
    afterElement = applyChange(afterElement, command.viewportScope, command.propertyScope, fieldName, change.newValue);
  }

  const previousRevision = getRevisionForScope(element, command.viewportScope);
  afterElement = incrementRevision(afterElement, command.viewportScope);
  const resultingRevision = getRevisionForScope(afterElement, command.viewportScope);

  return {
    ok: true,
    target: {
      elementId,
      beforeElement: element,
      afterElement,
      before,
      after,
      previousRevision,
      resultingRevision,
      historyEntry: {
        id: `${command.id}:${elementId}:${command.viewportScope}`,
        commandId: command.id,
        elementId,
        propertyScope: command.propertyScope,
        viewportScope: command.viewportScope,
        source: command.source,
        description: command.description,
        operationType: "property",
        before,
        after,
        previousRevision,
        resultingRevision,
        timestamp: command.timestamp,
      },
    },
  };
}

function validatePath(
  propertyScope: EditScope,
  element: TemplateElement,
  change: PropertyChange,
): CommandError | null {
  if (isProtectedPath(change.path)) {
    return {
      code: "FORBIDDEN_PROPERTY_PATH",
      message: "Command cannot modify protected template fields.",
    };
  }

  if (!isEditablePath(element.type, change.path)) {
    return {
      code: "FORBIDDEN_PROPERTY_PATH",
      message: "Property path is not editable for this element type.",
    };
  }

  if (!pathMatchesScope(change.path, propertyScope)) {
    return {
      code: "PROPERTY_SCOPE_MISMATCH",
      message: "Property path is outside the command property scope.",
    };
  }

  return null;
}

function validateAiAuthority(
  command: EditCommand,
  currentSelectedIds: ElementId[],
): CommandError | null {
  if (command.source !== "ai") {
    return null;
  }

  if (!command.selectedIdsSnapshot) {
    return {
      code: "AI_SELECTION_REQUIRED",
      message: "AI commands require the selected IDs snapshot captured at proposal time.",
    };
  }

  const snapshot = new Set(command.selectedIdsSnapshot);
  const currentSelection = new Set(currentSelectedIds);
  const unauthorizedTarget = command.targets.find(
    (target) => !snapshot.has(target.elementId) || !currentSelection.has(target.elementId),
  );

  if (unauthorizedTarget) {
    return {
      code: "AI_TARGET_UNAUTHORIZED",
      message: "AI command target is outside proposal-time or current selection authority.",
      elementId: unauthorizedTarget.elementId,
    };
  }

  return null;
}

function validateRevisionToken(
  viewportScope: ViewportScope,
  element: TemplateElement,
  token:
    | {
        base: number;
        viewport?: number;
      }
    | undefined,
): CommandError | null {
  if (!token) {
    return {
      code: "MISSING_REVISION_TOKEN",
      message: "Command target requires a revision token.",
    };
  }

  if (token.base !== element.revisions.base) {
    return {
      code: "STALE_REVISION",
      message: "Command base revision token is stale.",
    };
  }

  if (viewportScope === "all") {
    return token.viewport === undefined
      ? null
      : {
          code: "STALE_REVISION",
          message: "Base-scope commands must not include a viewport revision token.",
        };
  }

  if (token.viewport !== element.revisions[viewportScope]) {
    return {
      code: "STALE_REVISION",
      message: "Command viewport revision token is stale.",
    };
  }

  return null;
}

function getCurrentScopedValue(
  element: TemplateElement,
  viewportScope: ViewportScope,
  propertyScope: EditScope,
  fieldName: string,
): JsonValue {
  const baseValue = readField(element[propertyScope], fieldName);

  if (viewportScope === "all") {
    return baseValue;
  }

  const overrideValues = element.overrides[viewportScope]?.[propertyScope];

  if (
    overrideValues &&
    Object.prototype.hasOwnProperty.call(overrideValues, fieldName)
  ) {
    return readField(overrideValues, fieldName);
  }

  return baseValue;
}

function readField(values: Partial<ScopedValues>, fieldName: string): JsonValue {
  const value = (values as Record<string, JsonValue | undefined>)[fieldName];

  return value === undefined ? null : value;
}

function applyChange(
  element: TemplateElement,
  viewportScope: ViewportScope,
  propertyScope: EditScope,
  fieldName: string,
  value: JsonValue,
): TemplateElement {
  if (viewportScope === "all") {
    return applyBaseChange(element, propertyScope, fieldName, value);
  }

  const existingViewportOverride = element.overrides[viewportScope] ?? {};
  const existingScopedOverride = existingViewportOverride[propertyScope] ?? {};
  const nextScopedOverride = writeField(existingScopedOverride, fieldName, value);

  return {
    ...element,
    overrides: {
      ...element.overrides,
      [viewportScope]: {
        ...existingViewportOverride,
        [propertyScope]: nextScopedOverride,
      },
    },
  };
}

function applyBaseChange(
  element: TemplateElement,
  propertyScope: EditScope,
  fieldName: string,
  value: JsonValue,
): TemplateElement {
  switch (propertyScope) {
    case "content":
      return {
        ...element,
        content: writeField(element.content, fieldName, value) as ElementContent,
      };
    case "style":
      return {
        ...element,
        style: writeField(element.style, fieldName, value) as ElementStyle,
      };
    case "layout":
      return {
        ...element,
        layout: writeField(element.layout, fieldName, value) as ElementLayout,
      };
  }
}

function writeField(
  values: Partial<ScopedValues>,
  fieldName: string,
  value: JsonValue,
): Partial<ScopedValues> {
  return {
    ...values,
    [fieldName]: value,
  };
}

function createEmptySnapshot(scope: EditScope): ElementValueSnapshot {
  return { [scope]: {} };
}

function setSnapshotValue(
  snapshot: ElementValueSnapshot,
  scope: EditScope,
  fieldName: string,
  value: JsonValue,
) {
  const scopedSnapshot = snapshot[scope] ?? {};
  snapshot[scope] = {
    ...scopedSnapshot,
    [fieldName]: value,
  };
}

function getRevisionForScope(
  element: TemplateElement,
  viewportScope: ViewportScope,
): number {
  return viewportScope === "all"
    ? element.revisions.base
    : element.revisions[viewportScope];
}

function incrementRevision(
  element: TemplateElement,
  viewportScope: ViewportScope,
): TemplateElement {
  if (viewportScope === "all") {
    return {
      ...element,
      revisions: {
        ...element.revisions,
        base: element.revisions.base + 1,
      },
    };
  }

  return {
    ...element,
    revisions: {
      ...element.revisions,
      [viewportScope]: element.revisions[viewportScope] + 1,
    },
  };
}

function findDuplicateTarget(elementIds: ElementId[]): ElementId | null {
  const seen = new Set<ElementId>();

  for (const elementId of elementIds) {
    if (seen.has(elementId)) {
      return elementId;
    }

    seen.add(elementId);
  }

  return null;
}

function areJsonValuesEqual(left: JsonValue, right: JsonValue): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function fail(
  code: string,
  message: string,
  detail?: Pick<CommandError, "elementId" | "path">,
): ValidatedCommitBuildResult {
  return {
    ok: false,
    error: {
      code,
      message,
      ...detail,
    },
  };
}

function failStructure(
  code: string,
  message: string,
  elementId?: ElementId,
): Extract<StructureApplyResult, { ok: false }> {
  return {
    ok: false,
    error: {
      code,
      message,
      elementId,
    },
  };
}

function isRawStructureCommand(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === "object" &&
    "kind" in value &&
    (value as { kind?: unknown }).kind === "structure"
  );
}

export function createRevisionToken(
  element: TemplateElement,
  viewportScope: ViewportScope,
) {
  if (viewportScope === "all") {
    return { base: element.revisions.base };
  }

  return {
    base: element.revisions.base,
    viewport: element.revisions[viewportScope],
  };
}

export function getScopedValueForCommand(
  element: TemplateElement,
  viewportScope: ViewportScope,
  propertyScope: EditScope,
  fieldName: string,
): JsonValue {
  return getCurrentScopedValue(element, viewportScope, propertyScope, fieldName);
}

export function isViewportScope(value: ViewportScope): value is Viewport {
  return value !== "all";
}
