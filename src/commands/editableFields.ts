import type { EditScope, TemplateElementType } from "../template/templateTypes";

type EditableFieldRegistry = Record<TemplateElementType, ReadonlySet<string>>;

const boxStyleFields = [
  "style.background",
  "style.borderColor",
  "style.radius",
  "style.shadow",
] as const;

const textStyleFields = [
  "style.background",
  "style.borderColor",
  "style.color",
  "style.fontSize",
  "style.fontWeight",
  "style.radius",
  "style.shadow",
  "style.textAlign",
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
  page: new Set(["style.background", "layout.variant"]),
  section: new Set([...boxStyleFields, ...commonLayoutFields]),
  container: new Set([...boxStyleFields, ...commonLayoutFields]),
  stack: new Set([...boxStyleFields, ...commonLayoutFields]),
  text: new Set([
    "content.text",
    "content.role",
    ...textStyleFields,
    ...commonLayoutFields,
  ]),
  button: new Set([
    "content.text",
    "content.href",
    "style.background",
    "style.borderColor",
    "style.color",
    "style.fontSize",
    "style.fontWeight",
    "style.radius",
    "style.shadow",
    "style.textAlign",
    ...commonLayoutFields,
  ]),
  image: new Set(["content.alt", "content.src", ...boxStyleFields, ...commonLayoutFields]),
  card: new Set([...boxStyleFields, "style.color", ...commonLayoutFields]),
  badge: new Set(["content.text", ...textStyleFields, ...commonLayoutFields]),
  stat: new Set(["content.text", "content.label", ...textStyleFields, ...commonLayoutFields]),
  nav: new Set([
    "content.text",
    "style.background",
    "style.borderColor",
    "style.color",
    "style.fontSize",
    "style.fontWeight",
    "style.radius",
    "style.shadow",
    "style.textAlign",
    ...commonLayoutFields,
  ]),
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
