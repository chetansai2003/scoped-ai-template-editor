import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { executeCommand } from "../commands/commandExecutor";
import { getEditablePathsForElementType } from "../commands/editableFields";
import { createManualPropertyCommand } from "../commands/manualCommandCreators";
import type { JsonValue } from "../commands/commandTypes";
import { selectEditScope, selectSelectedIds } from "../store/selectors";
import { getScopedValueForCommand } from "../commands/commandExecutor";
import { selectTemplateDocument } from "../template/templateSelectors";
import type { EditScope, TemplateElement } from "../template/templateTypes";
import { StructureControls } from "./StructureControls";
import { ViewportImpactIndicator } from "./ViewportImpactIndicator";

interface FieldDefinition {
  path: string;
  label: string;
  kind: "text" | "textarea" | "color" | "number" | "select" | "checkbox";
  options?: string[];
}

const fieldDefinitions: FieldDefinition[] = [
  { path: "content.text", label: "Text", kind: "textarea" },
  { path: "content.href", label: "Link", kind: "text" },
  { path: "content.src", label: "Image source", kind: "text" },
  { path: "content.alt", label: "Image alt", kind: "text" },
  {
    path: "content.role",
    label: "Text role",
    kind: "select",
    options: ["span", "paragraph", "heading1", "heading2", "heading3"],
  },
  { path: "style.color", label: "Text color", kind: "color" },
  { path: "style.background", label: "Background", kind: "color" },
  { path: "style.borderColor", label: "Border color", kind: "color" },
  { path: "style.radius", label: "Border radius", kind: "text" },
  { path: "style.fontSize", label: "Font size", kind: "number" },
  {
    path: "style.fontWeight",
    label: "Font weight",
    kind: "select",
    options: ["400", "500", "600", "700", "800"],
  },
  {
    path: "style.textAlign",
    label: "Text alignment",
    kind: "select",
    options: ["left", "center", "right"],
  },
  {
    path: "style.tone",
    label: "Tone",
    kind: "select",
    options: ["dark", "light", "muted", "accent"],
  },
  { path: "layout.visible", label: "Visible", kind: "checkbox" },
  { path: "layout.width", label: "Width", kind: "number" },
  { path: "layout.height", label: "Height", kind: "number" },
  { path: "layout.offsetX", label: "X offset", kind: "number" },
  { path: "layout.offsetY", label: "Y offset", kind: "number" },
  { path: "layout.padding", label: "Padding", kind: "text" },
  { path: "layout.margin", label: "Margin", kind: "text" },
  { path: "layout.gap", label: "Gap", kind: "text" },
  { path: "layout.maxWidth", label: "Max width", kind: "text" },
  { path: "layout.columns", label: "Columns", kind: "number" },
];

export function DesignInspector() {
  const dispatch = useAppDispatch();
  const template = useAppSelector(selectTemplateDocument);
  const selectedIds = useAppSelector(selectSelectedIds);
  const viewportScope = useAppSelector(selectEditScope);
  const selectedElements = useMemo(
    () =>
      selectedIds
        .map((id) => template.elements[id])
        .filter((element): element is TemplateElement => Boolean(element)),
    [selectedIds, template],
  );
  const editablePaths = useMemo(
    () => getCommonEditablePaths(selectedElements),
    [selectedElements],
  );
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setDrafts(createDrafts(template, selectedElements, editablePaths, viewportScope));
    setStatus(null);
  }, [editablePaths, selectedElements, template, viewportScope]);

  const applyField = (field: FieldDefinition) => {
    const value = parseFieldValue(field, drafts[field.path]);
    const scope = getScopeFromPath(field.path);

    if (!scope) {
      return;
    }

    const command = createManualPropertyCommand({
      template,
      elementIds: selectedElements.map((element) => element.id),
      propertyScope: scope,
      viewportScope,
      path: field.path,
      newValue: value,
      description: `Manual inspector edit ${field.path}`,
    });

    if (!command) {
      setStatus("No changes to apply.");
      return;
    }

    const result = dispatch(executeCommand(command));

    setStatus(result.ok ? "Change applied." : result.error.message);
  };

  if (selectedElements.length === 0) {
    return (
      <div className="design-inspector">
        <h2>Design</h2>
        <p>No selection. Select an element on the canvas or in Layers.</p>
        <ViewportImpactIndicator viewportScope={viewportScope} />
      </div>
    );
  }

  const sameType = selectedElements.every(
    (element) => element.type === selectedElements[0].type,
  );
  const visibleFields = fieldDefinitions.filter((field) =>
    editablePaths.includes(field.path),
  );

  return (
    <div className="design-inspector">
      <h2>Design</h2>
      <p>
        {selectedElements.length === 1
          ? `${selectedElements[0].name} (${selectedElements[0].id})`
          : `${selectedElements.length} selected${sameType ? "" : " across mixed types"}`}
      </p>
      <ViewportImpactIndicator viewportScope={viewportScope} />
      {!sameType ? (
        <p className="field-status">
          Mixed element types show only controls shared by every selection.
        </p>
      ) : null}
      <div className="inspector-fields">
        {visibleFields.map((field) => (
          <InspectorField
            key={field.path}
            draft={drafts[field.path] ?? ""}
            field={field}
            onApply={() => applyField(field)}
            onChange={(value) =>
              setDrafts((current) => ({ ...current, [field.path]: value }))
            }
          />
        ))}
      </div>
      <StructureControls />
      {status ? (
        <p className="field-status" role="status">
          {status}
        </p>
      ) : null}
    </div>
  );
}

interface InspectorFieldProps {
  draft: string;
  field: FieldDefinition;
  onApply: () => void;
  onChange: (value: string) => void;
}

function InspectorField({
  draft,
  field,
  onApply,
  onChange,
}: InspectorFieldProps) {
  const id = `inspector-${field.path.replace(".", "-")}`;

  return (
    <div className="inspector-field">
      <label className="field-control" htmlFor={id}>
        <span>{field.label}</span>
        {renderFieldInput(id, field, draft, onChange)}
      </label>
      <button type="button" onClick={onApply}>
        Apply
      </button>
    </div>
  );
}

function renderFieldInput(
  id: string,
  field: FieldDefinition,
  draft: string,
  onChange: (value: string) => void,
) {
  if (field.kind === "textarea") {
    return (
      <textarea
        id={id}
        rows={3}
        value={draft}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    );
  }

  if (field.kind === "select") {
    return (
      <select
        id={id}
        value={field.options?.includes(draft) ? draft : ""}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        <option value="" disabled>
          Mixed
        </option>
        {field.options?.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (field.kind === "checkbox") {
    return (
      <input
        id={id}
        checked={draft === "true"}
        type="checkbox"
        onChange={(event) => onChange(String(event.currentTarget.checked))}
      />
    );
  }

  return (
    <input
      id={id}
      type={field.kind === "number" ? "number" : field.kind}
      value={draft}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  );
}

function createDrafts(
  template: ReturnType<typeof selectTemplateDocument>,
  selectedElements: TemplateElement[],
  editablePaths: string[],
  viewportScope: ReturnType<typeof selectEditScope>,
): Record<string, string> {
  return Object.fromEntries(
    editablePaths.map((path) => [
      path,
      stringifyMixedValue(
        path,
        selectedElements.map((element) =>
          getScopedValueForCommand(
            template.elements[element.id],
            viewportScope,
            getScopeFromPath(path) ?? "content",
            path.split(".")[1],
          ),
        ),
      ),
    ]),
  );
}

function stringifyMixedValue(path: string, values: JsonValue[]): string {
  const [firstValue] = values;
  const hasMixedValue = values.some(
    (value) => JSON.stringify(value) !== JSON.stringify(firstValue),
  );

  if (hasMixedValue) {
    return "Mixed";
  }

  if (path === "layout.visible" && firstValue === null) {
    return "true";
  }

  if (firstValue === null) {
    return "";
  }

  return String(firstValue);
}

function parseFieldValue(field: FieldDefinition, value: string): JsonValue {
  if (field.kind === "number") {
    return Number(value);
  }

  if (field.kind === "checkbox") {
    return value === "true";
  }

  return value;
}

function getScopeFromPath(path: string): EditScope | null {
  const [scope] = path.split(".");

  if (scope === "content" || scope === "style" || scope === "layout") {
    return scope;
  }

  return null;
}

function getCommonEditablePaths(selectedElements: TemplateElement[]): string[] {
  if (selectedElements.length === 0) {
    return [];
  }

  const [firstElement, ...remainingElements] = selectedElements;
  const commonPaths = new Set(getEditablePathsForElementType(firstElement.type));

  remainingElements.forEach((element) => {
    const elementPaths = new Set(getEditablePathsForElementType(element.type));

    commonPaths.forEach((path) => {
      if (!elementPaths.has(path)) {
        commonPaths.delete(path);
      }
    });
  });

  return fieldDefinitions
    .map((field) => field.path)
    .filter((path) => commonPaths.has(path));
}
