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

const sizeAndPositionFields = [
  "layout.height",
  "layout.margin",
  "layout.maxWidth",
  "layout.minHeight",
  "layout.minWidth",
  "layout.offsetX",
  "layout.offsetY",
  "layout.padding",
  "layout.visible",
  "layout.width",
] as const;

const flexLayoutFields = [
  "layout.align",
  "layout.gap",
  ...sizeAndPositionFields,
  "layout.variant",
] as const;

export const editableFieldRegistry: EditableFieldRegistry = {
  page: new Set(["style.background", "layout.variant"]),
  section: new Set([
    ...boxStyleFields,
    ...flexLayoutFields,
    "layout.columns",
  ]),
  container: new Set([...boxStyleFields, ...flexLayoutFields]),
  stack: new Set([...boxStyleFields, ...flexLayoutFields]),
  text: new Set([
    "content.text",
    "content.role",
    ...textStyleFields,
    ...sizeAndPositionFields,
    "layout.variant",
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
    ...sizeAndPositionFields,
    "layout.variant",
  ]),
  image: new Set([
    "content.alt",
    "content.src",
    ...boxStyleFields,
    ...sizeAndPositionFields,
    "layout.variant",
  ]),
  card: new Set([
    ...boxStyleFields,
    "style.color",
    ...sizeAndPositionFields,
    "layout.gap",
    "layout.variant",
  ]),
  badge: new Set([
    "content.text",
    ...textStyleFields,
    ...sizeAndPositionFields,
    "layout.variant",
  ]),
  stat: new Set([
    "content.text",
    "content.label",
    ...textStyleFields,
    ...sizeAndPositionFields,
    "layout.gap",
    "layout.variant",
  ]),
  nav: new Set([
    "content.text",
    "style.background",
    "style.borderColor",
    "style.color",
    "style.fontSize",
    "style.fontWeight",
    "style.radius",
    "style.shadow",
    ...sizeAndPositionFields,
    "layout.align",
    "layout.gap",
    "layout.variant",
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
