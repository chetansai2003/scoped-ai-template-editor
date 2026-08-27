import type { EditScope, TemplateElementType } from "../template/templateTypes";

type EditableFieldRegistry = Record<TemplateElementType, ReadonlySet<string>>;

const commonStyleFields = [
  "style.background",
  "style.borderColor",
  "style.color",
  "style.fontSize",
  "style.fontWeight",
  "style.radius",
  "style.shadow",
  "style.textAlign",
  "style.tone",
] as const;

const commonLayoutFields = [
  "layout.align",
  "layout.columns",
  "layout.gap",
  "layout.height",
  "layout.margin",
  "layout.maxWidth",
  "layout.minHeight",
  "layout.minWidth",
  "layout.offsetX",
  "layout.offsetY",
  "layout.padding",
  "layout.variant",
  "layout.visible",
  "layout.width",
] as const;

export const editableFieldRegistry: EditableFieldRegistry = {
  page: new Set([...commonStyleFields, "layout.variant"]),
  section: new Set([...commonStyleFields, ...commonLayoutFields]),
  container: new Set(["style.background", ...commonLayoutFields]),
  stack: new Set(["style.background", ...commonLayoutFields]),
  text: new Set([
    "content.text",
    "content.role",
    "style.color",
    "style.textAlign",
    ...commonLayoutFields,
  ]),
  button: new Set([
    "content.text",
    "content.href",
    "style.background",
    "style.borderColor",
    "style.color",
    "style.radius",
    "style.shadow",
    "style.tone",
    "layout.padding",
    "layout.variant",
    "layout.visible",
    "layout.width",
    "layout.height",
  ]),
  image: new Set(["content.alt", "content.src", ...commonStyleFields, ...commonLayoutFields]),
  card: new Set([...commonStyleFields, ...commonLayoutFields]),
  badge: new Set(["content.text", ...commonStyleFields, "layout.variant"]),
  stat: new Set(["content.text", "content.label", ...commonStyleFields, ...commonLayoutFields]),
  nav: new Set(["content.text", ...commonStyleFields, "layout.padding", "layout.variant"]),
};

const protectedPathPrefixes = [
  "id",
  "type",
  "name",
  "parentId",
  "children",
  "revisions",
  "overrides",
  "metadata",
  "rootElementId",
  "elements",
  "viewportSettings",
];

export function isProtectedPath(path: string): boolean {
  return protectedPathPrefixes.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}.`),
  );
}

export function isEditablePath(
  elementType: TemplateElementType,
  path: string,
): boolean {
  return editableFieldRegistry[elementType].has(path);
}

export function pathMatchesScope(path: string, scope: EditScope): boolean {
  return path.startsWith(`${scope}.`);
}

export function getFieldName(path: string, scope: EditScope): string | undefined {
  const [pathScope, fieldName, ...rest] = path.split(".");

  if (pathScope !== scope || !fieldName || rest.length > 0) {
    return undefined;
  }

  return fieldName;
}

export function getEditablePathsForElementType(
  elementType: TemplateElementType,
): string[] {
  return [...editableFieldRegistry[elementType]];
}
