import { createRevisionToken, getScopedValueForCommand } from "./commandExecutor";
import type {
  EditCommand,
  JsonValue,
  StructureCommand,
} from "./commandTypes";
import type { ViewportScope } from "../store/editorUISlice";
import type {
  EditScope,
  ElementId,
  TemplateDocument,
  TemplateElement,
  TemplateElementType,
} from "../template/templateTypes";

let commandSequence = 0;

interface PropertyCommandInput {
  template: TemplateDocument;
  elementIds: ElementId[];
  propertyScope: EditScope;
  viewportScope: ViewportScope;
  path: string;
  newValue: JsonValue;
  description: string;
}

interface MultiPropertyCommandInput {
  template: TemplateDocument;
  elementId: ElementId;
  propertyScope: EditScope;
  viewportScope: ViewportScope;
  changes: Array<{ path: string; newValue: JsonValue }>;
  description: string;
}

export function createManualPropertyCommand({
  template,
  elementIds,
  propertyScope,
  viewportScope,
  path,
  newValue,
  description,
}: PropertyCommandInput): EditCommand | null {
  const fieldName = path.split(".")[1];

  if (!fieldName) {
    return null;
  }

  const targets = elementIds
    .map((elementId) => template.elements[elementId])
    .filter((element): element is TemplateElement => Boolean(element))
    .map((element) => {
      const oldValue = getScopedValueForCommand(
        element,
        viewportScope,
        propertyScope,
        fieldName,
      );

      if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
        return null;
      }

      return {
        elementId: element.id,
        revisionToken: createRevisionToken(element, viewportScope),
        changes: [{ path, oldValue, newValue }],
      };
    })
    .filter((target): target is NonNullable<typeof target> => Boolean(target));

  if (targets.length === 0) {
    return null;
  }

  return {
    id: nextCommandId("manual-property"),
    source: "canvas",
    propertyScope,
    viewportScope,
    targets,
    description,
    timestamp: new Date().toISOString(),
  };
}

export function createManualMultiPropertyCommand({
  template,
  elementId,
  propertyScope,
  viewportScope,
  changes,
  description,
}: MultiPropertyCommandInput): EditCommand | null {
  const element = template.elements[elementId];

  if (!element) {
    return null;
  }

  const preparedChanges = changes
    .map(({ path, newValue }) => {
      const fieldName = path.split(".")[1];

      if (!fieldName) {
        return null;
      }

      const oldValue = getScopedValueForCommand(
        element,
        viewportScope,
        propertyScope,
        fieldName,
      );

      if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
        return null;
      }

      return { path, oldValue, newValue };
    })
    .filter((change): change is NonNullable<typeof change> => Boolean(change));

  if (preparedChanges.length === 0) {
    return null;
  }

  return {
    id: nextCommandId("manual-layout"),
    source: "canvas",
    propertyScope,
    viewportScope,
    targets: [
      {
        elementId,
        revisionToken: createRevisionToken(element, viewportScope),
        changes: preparedChanges,
      },
    ],
    description,
    timestamp: new Date().toISOString(),
  };
}

export function createReorderCommand(
  template: TemplateDocument,
  parentId: ElementId,
  elementId: ElementId,
  toIndex: number,
  viewportScope: ViewportScope,
): StructureCommand {
  const parent = template.elements[parentId];
  const fromIndex = parent?.children.indexOf(elementId) ?? -1;

  return {
    kind: "structure",
    id: nextCommandId("manual-reorder"),
    source: "canvas",
    viewportScope,
    revisionTokens: createRevisionTokenMap(template, [parentId]),
    operation: {
      type: "reorder",
      parentId,
      elementId,
      fromIndex: Math.max(0, fromIndex),
      toIndex,
    },
    description: `Reorder ${elementId}`,
    timestamp: new Date().toISOString(),
  };
}

export function createAddElementCommand(
  template: TemplateDocument,
  parentId: ElementId,
  type: Extract<TemplateElementType, "text" | "button" | "card">,
  index: number,
  viewportScope: ViewportScope,
): StructureCommand {
  const element = createDefaultElement(template, parentId, type);

  return {
    kind: "structure",
    id: nextCommandId("manual-add"),
    source: "canvas",
    viewportScope,
    revisionTokens: createRevisionTokenMap(template, [parentId]),
    operation: {
      type: "add",
      parentId,
      index,
      element,
    },
    description: `Add ${type}`,
    timestamp: new Date().toISOString(),
  };
}

export function createMoveCommand(
  template: TemplateDocument,
  elementId: ElementId,
  toParentId: ElementId,
  toIndex: number,
  viewportScope: ViewportScope,
): StructureCommand | null {
  const element = template.elements[elementId];

  if (!element?.parentId) {
    return null;
  }

  return {
    kind: "structure",
    id: nextCommandId("manual-move"),
    source: "canvas",
    viewportScope,
    revisionTokens: createRevisionTokenMap(template, [
      element.id,
      element.parentId,
      toParentId,
    ]),
    operation: {
      type: "move",
      elementId,
      fromParentId: element.parentId,
      toParentId,
      fromIndex: template.elements[element.parentId]?.children.indexOf(elementId) ?? 0,
      toIndex,
    },
    description: `Move ${elementId}`,
    timestamp: new Date().toISOString(),
  };
}

export function getCompatibleParentIds(
  template: TemplateDocument,
  elementId: ElementId,
): ElementId[] {
  const element = template.elements[elementId];

  if (!element || element.id === template.rootElementId) {
    return [];
  }

  return Object.values(template.elements)
    .filter((candidate) => {
      if (candidate.id === element.id) {
        return false;
      }

      if (isDescendant(template, candidate.id, element.id)) {
        return false;
      }

      return canParentContain(candidate.type, element.type);
    })
    .map((candidate) => candidate.id);
}

export function createDuplicateCommand(
  template: TemplateDocument,
  sourceElementId: ElementId,
  viewportScope: ViewportScope,
): StructureCommand | null {
  const source = template.elements[sourceElementId];

  if (!source?.parentId) {
    return null;
  }

  const parent = template.elements[source.parentId];

  if (!parent) {
    return null;
  }

  const existingIds = new Set(Object.keys(template.elements));
  const clonedElements = cloneSubtree(template, sourceElementId, source.parentId, existingIds);
  const clonedRootId = Object.keys(clonedElements).find(
    (id) => clonedElements[id].parentId === source.parentId,
  );

  if (!clonedRootId) {
    return null;
  }

  return {
    kind: "structure",
    id: nextCommandId("manual-duplicate"),
    source: "canvas",
    viewportScope,
    revisionTokens: createRevisionTokenMap(template, [source.parentId]),
    operation: {
      type: "duplicate",
      sourceElementId,
      parentId: source.parentId,
      index: parent.children.indexOf(sourceElementId) + 1,
      clonedRootId,
      clonedElements,
    },
    description: `Duplicate ${sourceElementId}`,
    timestamp: new Date().toISOString(),
  };
}

function cloneSubtree(
  template: TemplateDocument,
  rootId: ElementId,
  destinationParentId: ElementId,
  reservedIds: Set<ElementId>,
): Record<ElementId, TemplateElement> {
  const idMap = new Map<ElementId, ElementId>();

  const reserveSubtreeIds = (elementId: ElementId) => {
    const element = template.elements[elementId];
    const nextId = createUniqueElementId(`${element.id}-copy`, reservedIds);
    idMap.set(element.id, nextId);
    reservedIds.add(nextId);
    element.children.forEach(reserveSubtreeIds);
  };

  reserveSubtreeIds(rootId);

  const clonedElements: Record<ElementId, TemplateElement> = {};
  const cloneElement = (elementId: ElementId) => {
    const element = template.elements[elementId];
    const nextId = idMap.get(element.id) ?? element.id;
    const parentId =
      element.id === rootId
        ? destinationParentId
        : element.parentId
          ? idMap.get(element.parentId)
          : undefined;

    clonedElements[nextId] = {
      ...structuredClone(element),
      id: nextId,
      name: element.id === rootId ? `${element.name} Copy` : element.name,
      parentId,
      children: element.children.map((childId) => idMap.get(childId) ?? childId),
      revisions: { base: 0, desktop: 0, tablet: 0, mobile: 0 },
    };
    element.children.forEach(cloneElement);
  };

  cloneElement(rootId);
  return clonedElements;
}

function createDefaultElement(
  template: TemplateDocument,
  parentId: ElementId,
  type: Extract<TemplateElementType, "text" | "button" | "card">,
): TemplateElement {
  const id = createUniqueElementId(`new-${type}`, new Set(Object.keys(template.elements)));
  const base = {
    id,
    type,
    name: `New ${capitalize(type)}`,
    parentId,
    children: [],
    overrides: {},
    revisions: { base: 0, desktop: 0, tablet: 0, mobile: 0 },
  };

  if (type === "button") {
    return {
      ...base,
      content: { href: "#cta-section", text: "New button" },
      style: { background: "#1f5f55", color: "#ffffff", radius: "8px" },
      layout: { padding: "12px 16px", variant: "primary-button", visible: true },
    };
  }

  if (type === "card") {
    return {
      ...base,
      content: {},
      style: { background: "#ffffff", borderColor: "#e2dbcf", radius: "18px" },
      layout: { padding: "24px", variant: "feature-card", visible: true },
    };
  }

  return {
    ...base,
    content: { role: "paragraph", text: "New text" },
    style: { color: "#17202a" },
    layout: { variant: "card-body", visible: true },
  };
}

function createRevisionTokenMap(
  template: TemplateDocument,
  elementIds: ElementId[],
): Record<ElementId, ReturnType<typeof createRevisionToken>> {
  return Object.fromEntries(
    elementIds
      .map((elementId) => template.elements[elementId])
      .filter((element): element is TemplateElement => Boolean(element))
      .map((element) => [element.id, createRevisionToken(element, "all")]),
  );
}

function createUniqueElementId(baseId: string, reservedIds: Set<ElementId>): ElementId {
  let candidate = baseId;
  let index = 1;

  while (reservedIds.has(candidate)) {
    candidate = `${baseId}-${index}`;
    index += 1;
  }

  return candidate;
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

function nextCommandId(prefix: string): string {
  commandSequence += 1;
  return `${prefix}-${Date.now()}-${commandSequence}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
