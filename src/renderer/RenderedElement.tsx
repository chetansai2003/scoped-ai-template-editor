import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from "react";
import { resolveTemplateElement } from "../template/resolveResponsiveValue";
import type {
  ElementId,
  ElementLayout,
  ElementStyle,
  ResolvedTemplateElement,
  TemplateDocument,
  Viewport,
} from "../template/templateTypes";

interface RenderedElementProps {
  elementId: ElementId;
  draftLayouts?: Partial<Record<ElementId, Partial<ElementLayout>>>;
  onElementKeySelect?: (elementId: ElementId, append: boolean) => void;
  onElementSelect?: (elementId: ElementId, append: boolean) => void;
  selectedIds: ElementId[];
  template: TemplateDocument;
  viewport: Viewport;
}

type CustomStyle = CSSProperties & Record<`--${string}`, string | number | undefined>;

export function RenderedElement({
  elementId,
  draftLayouts,
  onElementKeySelect,
  onElementSelect,
  selectedIds,
  template,
  viewport,
}: RenderedElementProps) {
  const element = template.elements[elementId];

  if (!element) {
    return null;
  }

  const resolvedElement = resolveTemplateElement(element, viewport);
  const resolvedLayout = {
    ...resolvedElement.resolvedLayout,
    ...draftLayouts?.[elementId],
  };

  if (resolvedLayout.visible === false) {
    return null;
  }

  const renderedElement = {
    ...resolvedElement,
    resolvedLayout,
  };
  const children = element.children.map((childId) => (
    <RenderedElement
      key={childId}
      elementId={childId}
      draftLayouts={draftLayouts}
      onElementKeySelect={onElementKeySelect}
      onElementSelect={onElementSelect}
      selectedIds={selectedIds}
      template={template}
      viewport={viewport}
    />
  ));
  const commonProps = buildCommonProps(
    renderedElement,
    selectedIds,
    onElementSelect,
    onElementKeySelect,
  );

  switch (renderedElement.type) {
    case "page":
      return <div {...commonProps}>{children}</div>;
    case "nav":
      return (
        <nav {...commonProps} aria-label="Template navigation">
          <strong>{renderedElement.resolvedContent.text}</strong>
          <span>Work</span>
          <span>Process</span>
          <span>Contact</span>
        </nav>
      );
    case "section":
      return <section {...commonProps}>{children}</section>;
    case "container":
    case "stack":
      return <div {...commonProps}>{children}</div>;
    case "card":
      return <article {...commonProps}>{children}</article>;
    case "badge":
      return <span {...commonProps}>{renderedElement.resolvedContent.text}</span>;
    case "stat":
      return (
        <article {...commonProps}>
          <strong>{renderedElement.resolvedContent.text}</strong>
          <span>{renderedElement.resolvedContent.label}</span>
        </article>
      );
    case "button":
      return renderButton(renderedElement, commonProps);
    case "image":
      return (
        <figure {...commonProps}>
          {renderedElement.resolvedContent.src ? (
            <img
              alt={renderedElement.resolvedContent.alt ?? ""}
              src={renderedElement.resolvedContent.src}
            />
          ) : (
            <div aria-label={renderedElement.resolvedContent.alt} role="img" />
          )}
        </figure>
      );
    case "text":
      return renderText(renderedElement, commonProps);
  }
}

function renderText(
  element: ResolvedTemplateElement,
  commonProps: ReturnType<typeof buildCommonProps>,
): ReactNode {
  const text = element.resolvedContent.text ?? "";

  switch (element.resolvedContent.role) {
    case "heading1":
      return <h1 {...commonProps}>{text}</h1>;
    case "heading2":
      return <h2 {...commonProps}>{text}</h2>;
    case "heading3":
      return <h3 {...commonProps}>{text}</h3>;
    case "span":
      return <span {...commonProps}>{text}</span>;
    case "paragraph":
    default:
      return <p {...commonProps}>{text}</p>;
  }
}

function renderButton(
  element: ResolvedTemplateElement,
  commonProps: ReturnType<typeof buildCommonProps>,
) {
  return (
    <a {...commonProps} href={element.resolvedContent.href ?? "#"}>
      {element.resolvedContent.text}
    </a>
  );
}

function buildCommonProps(
  element: ResolvedTemplateElement,
  selectedIds: ElementId[],
  onElementSelect?: (elementId: ElementId, append: boolean) => void,
  onElementKeySelect?: (elementId: ElementId, append: boolean) => void,
) {
  const selected = selectedIds.includes(element.id);

  return {
    className: buildClassName(element, selected),
    "data-element-id": element.id,
    "data-element-name": element.name,
    "data-selected": selected,
    onClick: (event: MouseEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      onElementSelect?.(element.id, event.ctrlKey || event.metaKey || event.shiftKey);
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === "Enter") {
        event.stopPropagation();
        onElementKeySelect?.(element.id, false);
      }

      if (event.key === " " && (event.ctrlKey || event.metaKey || event.shiftKey)) {
        event.preventDefault();
        event.stopPropagation();
        onElementKeySelect?.(element.id, true);
      }
    },
    style: buildInlineStyle(element.resolvedStyle, element.resolvedLayout),
    tabIndex: 0,
    title: `${element.name}, ${element.id}`,
  };
}

function buildClassName(element: ResolvedTemplateElement, selected: boolean) {
  return [
    "rendered-element",
    `rendered-${element.type}`,
    element.resolvedLayout.variant
      ? `rendered-variant-${element.resolvedLayout.variant.replace(/\s+/g, "-")}`
      : "",
    selected ? "rendered-selected" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildInlineStyle(style: ElementStyle, layout: ElementLayout): CustomStyle {
  return {
    "--element-align": layout.align,
    "--element-background": style.background,
    "--element-border-color": style.borderColor,
    "--element-color": style.color,
    "--element-columns": layout.columns,
    "--element-font-size": style.fontSize ? `${style.fontSize}px` : undefined,
    "--element-font-weight": style.fontWeight,
    "--element-gap": layout.gap,
    "--element-height": layout.height !== undefined ? `${layout.height}px` : undefined,
    "--element-margin": layout.margin,
    "--element-max-width": layout.maxWidth,
    "--element-min-height": layout.minHeight !== undefined ? `${layout.minHeight}px` : undefined,
    "--element-min-width": layout.minWidth !== undefined ? `${layout.minWidth}px` : undefined,
    "--element-offset-x": layout.offsetX !== undefined ? `${layout.offsetX}px` : undefined,
    "--element-offset-y": layout.offsetY !== undefined ? `${layout.offsetY}px` : undefined,
    "--element-padding": layout.padding,
    "--element-radius": style.radius,
    "--element-shadow": style.shadow,
    "--element-text-align": style.textAlign,
    "--element-width": layout.width !== undefined ? `${layout.width}px` : undefined,
  };
}
