import type { RootState } from "../app/store";
import { createSelector } from "@reduxjs/toolkit";
import { resolveTemplateElement } from "./resolveResponsiveValue";
import type {
  ElementId,
  ResolvedTemplateElement,
  TemplateDocument,
  TemplateElement,
  TemplateTreeItem,
  ViewportSetting,
} from "./templateTypes";

const emptyTemplateElements: TemplateElement[] = [];
const emptyResolvedTemplateElements: ResolvedTemplateElement[] = [];

export const selectTemplateDocument = (state: RootState): TemplateDocument =>
  state.template;

export const selectRootElement = (state: RootState): TemplateElement =>
  selectTemplateDocument(state).elements[selectTemplateDocument(state).rootElementId];

export const selectOrderedTemplateTree = createSelector(
  [selectTemplateDocument],
  (template): TemplateTreeItem[] => {
  const tree: TemplateTreeItem[] = [];

  const visit = (elementId: ElementId, depth: number) => {
    const element = template.elements[elementId];

    if (!element) {
      return;
    }

    tree.push({ element, depth });
    element.children.forEach((childId) => visit(childId, depth + 1));
  };

  visit(template.rootElementId, 0);
  return tree;
  },
);

export const selectSelectedTemplateElements = createSelector(
  [selectTemplateDocument, (state: RootState) => state.editorUI.selectedIds],
  (template, selectedIds): TemplateElement[] => {
    if (selectedIds.length === 0) {
      return emptyTemplateElements;
    }

    return selectedIds
      .map((id) => template.elements[id])
      .filter((element): element is TemplateElement => Boolean(element));
  },
);

export const selectResolvedElementById = (
  state: RootState,
  elementId: ElementId,
): ResolvedTemplateElement | undefined => {
  const element = selectTemplateDocument(state).elements[elementId];

  if (!element) {
    return undefined;
  }

  return resolveTemplateElement(element, state.editorUI.activeViewport);
};

export const selectResolvedSelectedTemplateElements = createSelector(
  [selectSelectedTemplateElements, (state: RootState) => state.editorUI.activeViewport],
  (selectedElements, activeViewport): ResolvedTemplateElement[] => {
    if (selectedElements.length === 0) {
      return emptyResolvedTemplateElements;
    }

    return selectedElements.map((element) =>
      resolveTemplateElement(element, activeViewport),
    );
  },
);

export const selectActiveViewportSettings = (
  state: RootState,
): ViewportSetting =>
  selectTemplateDocument(state).viewportSettings[state.editorUI.activeViewport];
