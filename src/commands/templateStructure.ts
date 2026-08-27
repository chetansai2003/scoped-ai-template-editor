import type { CommandError } from "./commandTypes";
import type { ElementId, TemplateDocument } from "../template/templateTypes";

export function validateTemplateStructure(
  template: TemplateDocument,
): CommandError | null {
  const root = template.elements[template.rootElementId];

  if (!root) {
    return {
      code: "INVALID_TEMPLATE_STRUCTURE",
      message: "Template root element is missing.",
      elementId: template.rootElementId,
    };
  }

  if (root.parentId) {
    return {
      code: "INVALID_TEMPLATE_STRUCTURE",
      message: "Root element must not have a parent.",
      elementId: root.id,
    };
  }

  const visited = new Set<ElementId>();
  const activePath = new Set<ElementId>();

  const visitResult = visitElement(template, template.rootElementId, visited, activePath);

  if (visitResult) {
    return visitResult;
  }

  const unreachableId = Object.keys(template.elements).find((id) => !visited.has(id));

  if (unreachableId) {
    return {
      code: "INVALID_TEMPLATE_STRUCTURE",
      message: "Template element is unreachable from the root.",
      elementId: unreachableId,
    };
  }

  return null;
}

function visitElement(
  template: TemplateDocument,
  elementId: ElementId,
  visited: Set<ElementId>,
  activePath: Set<ElementId>,
): CommandError | null {
  const element = template.elements[elementId];

  if (!element) {
    return {
      code: "INVALID_TEMPLATE_STRUCTURE",
      message: "Template references a missing element.",
      elementId,
    };
  }

  if (activePath.has(elementId)) {
    return {
      code: "INVALID_TEMPLATE_STRUCTURE",
      message: "Template contains an ancestor cycle.",
      elementId,
    };
  }

  if (element.parentId === element.id) {
    return {
      code: "INVALID_TEMPLATE_STRUCTURE",
      message: "Element cannot be its own parent.",
      elementId,
    };
  }

  visited.add(elementId);
  activePath.add(elementId);

  const childIds = new Set<ElementId>();

  for (const childId of element.children) {
    if (childIds.has(childId)) {
      return {
        code: "INVALID_TEMPLATE_STRUCTURE",
        message: "Element contains duplicate child references.",
        elementId,
      };
    }

    childIds.add(childId);

    const child = template.elements[childId];

    if (!child) {
      return {
        code: "INVALID_TEMPLATE_STRUCTURE",
        message: "Element references a missing child.",
        elementId: childId,
      };
    }

    if (child.parentId !== element.id) {
      return {
        code: "INVALID_TEMPLATE_STRUCTURE",
        message: "Parent and child references are inconsistent.",
        elementId: child.id,
      };
    }

    const childResult = visitElement(template, childId, visited, activePath);

    if (childResult) {
      return childResult;
    }
  }

  activePath.delete(elementId);
  return null;
}
