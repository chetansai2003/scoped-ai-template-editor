export type Viewport = "desktop" | "tablet" | "mobile";
export type EditScope = "content" | "style" | "layout";
export type ElementId = string;

export interface ElementRevisions {
  base: number;
  desktop: number;
  tablet: number;
  mobile: number;
}

export interface RevisionToken {
  base: number;
  viewport?: number;
}

export type TemplateElementType =
  | "page"
  | "section"
  | "container"
  | "stack"
  | "text"
  | "button"
  | "image"
  | "card"
  | "badge"
  | "stat"
  | "nav";

export type TextRole = "span" | "paragraph" | "heading1" | "heading2" | "heading3";

export interface TemplateMetadata {
  schemaVersion: number;
  templateId: string;
  templateName: string;
  source: "original";
  status: "renderable";
}

export interface ViewportSetting {
  label: string;
  width: number;
}

export interface ElementContent {
  text?: string;
  alt?: string;
  href?: string;
  role?: TextRole;
  label?: string;
  src?: string;
}

export interface ElementStyle {
  background?: string;
  borderColor?: string;
  color?: string;
  fontSize?: number;
  fontWeight?: 400 | 500 | 600 | 700 | 800;
  radius?: string;
  shadow?: string;
  textAlign?: "left" | "center" | "right";
  tone?: "dark" | "light" | "muted" | "accent";
}

export interface ElementLayout {
  align?: "start" | "center" | "end" | "stretch";
  columns?: number;
  gap?: string;
  height?: number;
  margin?: string;
  maxWidth?: string;
  minHeight?: number;
  minWidth?: number;
  offsetX?: number;
  offsetY?: number;
  padding?: string;
  variant?: string;
  visible?: boolean;
  width?: number;
}

export interface ResponsiveElementOverride {
  content?: Partial<ElementContent>;
  style?: Partial<ElementStyle>;
  layout?: Partial<ElementLayout>;
}

export type ElementViewportOverrides = Partial<
  Record<Viewport, ResponsiveElementOverride>
>;

export interface TemplateElement {
  id: ElementId;
  type: TemplateElementType;
  name: string;
  parentId?: ElementId;
  children: ElementId[];
  content: ElementContent;
  style: ElementStyle;
  layout: ElementLayout;
  overrides: ElementViewportOverrides;
  revisions: ElementRevisions;
}

export interface TemplateDocument {
  metadata: TemplateMetadata;
  rootElementId: ElementId;
  elements: Record<ElementId, TemplateElement>;
  viewportSettings: Record<Viewport, ViewportSetting>;
}

export interface ResolvedTemplateElement extends TemplateElement {
  resolvedContent: ElementContent;
  resolvedStyle: ElementStyle;
  resolvedLayout: ElementLayout;
}

export interface TemplateTreeItem {
  element: TemplateElement;
  depth: number;
}
