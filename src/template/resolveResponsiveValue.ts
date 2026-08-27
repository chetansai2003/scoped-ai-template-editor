import type {
  ElementContent,
  ElementLayout,
  ElementStyle,
  ResolvedTemplateElement,
  TemplateElement,
  Viewport,
} from "./templateTypes";

export function resolveResponsiveValue<T extends object>(
  baseValue: T,
  viewportOverride: Partial<T> | undefined,
): T {
  return {
    ...baseValue,
    ...viewportOverride,
  };
}

export function resolveElementContent(
  element: TemplateElement,
  viewport: Viewport,
): ElementContent {
  return resolveResponsiveValue(
    element.content,
    element.overrides[viewport]?.content,
  );
}

export function resolveElementStyle(
  element: TemplateElement,
  viewport: Viewport,
): ElementStyle {
  return resolveResponsiveValue(element.style, element.overrides[viewport]?.style);
}

export function resolveElementLayout(
  element: TemplateElement,
  viewport: Viewport,
): ElementLayout {
  return resolveResponsiveValue(element.layout, element.overrides[viewport]?.layout);
}

export function resolveTemplateElement(
  element: TemplateElement,
  viewport: Viewport,
): ResolvedTemplateElement {
  return {
    ...element,
    resolvedContent: resolveElementContent(element, viewport),
    resolvedStyle: resolveElementStyle(element, viewport),
    resolvedLayout: resolveElementLayout(element, viewport),
  };
}
