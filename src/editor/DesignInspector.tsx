import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { executeCommand } from "../commands/commandExecutor";
import { getEditablePathsForElementType } from "../commands/editableFields";
import { createManualPropertyCommand } from "../commands/manualCommandCreators";
import type { JsonValue } from "../commands/commandTypes";
import {
  selectActiveViewport,
  selectEditScope,
  selectSelectedIds,
} from "../store/selectors";
import { getScopedValueForCommand } from "../commands/commandExecutor";
import { validateNewValue } from "../commands/valueValidation";
import {
  clearPreviewElements,
  clearPreviewValue,
  setPreviewValue,
} from "../store/editorUISlice";
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
  { path: "style.shadow", label: "Shadow", kind: "text" },
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
  { path: "layout.minWidth", label: "Minimum width", kind: "number" },
  { path: "layout.minHeight", label: "Minimum height", kind: "number" },
  { path: "layout.offsetX", label: "X offset", kind: "number" },
  { path: "layout.offsetY", label: "Y offset", kind: "number" },
  { path: "layout.padding", label: "Padding", kind: "text" },
  { path: "layout.margin", label: "Margin", kind: "text" },
  { path: "layout.gap", label: "Gap", kind: "text" },
  { path: "layout.maxWidth", label: "Max width", kind: "text" },
  { path: "layout.columns", label: "Columns", kind: "number" },
  {
    path: "layout.align",
    label: "Item alignment",
    kind: "select",
    options: ["start", "center", "end", "stretch"],
  },
];

interface RenderedMetrics {
  background: string;
  borderColor: string;
  color: string;
  elementId: string;
  fontSize: number;
  fontWeight: string;
  gap: string;
  height: number;
  margin: string;
  padding: string;
  radius: string;
  width: number;
}

export function DesignInspector() {
  const dispatch = useAppDispatch();
  const template = useAppSelector(selectTemplateDocument);
  const selectedIds = useAppSelector(selectSelectedIds);
  const activeViewport = useAppSelector(selectActiveViewport);
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [renderedMetrics, setRenderedMetrics] = useState<RenderedMetrics | null>(null);

  useLayoutEffect(() => {
    const selectedElement = selectedElements.length === 1 ? selectedElements[0] : null;

    if (!selectedElement) {
      setRenderedMetrics(null);
      return;
    }

    const findRenderedNode = () =>
      Array.from(document.querySelectorAll<HTMLElement>("[data-element-id]")).find(
        (node) => node.dataset.elementId === selectedElement.id,
      );
    const measure = () => {
      const node = findRenderedNode();

      if (!node) {
        setRenderedMetrics(null);
        return;
      }

      const rect = node.getBoundingClientRect();
      const computed = getComputedStyle(node);
      const renderer = node.closest<HTMLElement>(".template-renderer");
      const rendererRect = renderer?.getBoundingClientRect();
      const rendererScale =
        renderer && rendererRect && renderer.offsetWidth > 0
          ? rendererRect.width / renderer.offsetWidth
          : 1;
      const scale = rendererScale > 0 ? rendererScale : 1;
      const width = Math.round(rect.width / scale);
      const height = Math.round(rect.height / scale);
      const metrics: RenderedMetrics = {
        background: normalizeColorDraft(computed.backgroundColor),
        borderColor: normalizeColorDraft(computed.borderColor),
        color: normalizeColorDraft(computed.color),
        elementId: selectedElement.id,
        fontSize: Math.round(Number.parseFloat(computed.fontSize) || 0),
        fontWeight: normalizeFontWeight(computed.fontWeight),
        gap: computed.gap,
        height,
        margin: computed.margin,
        padding: computed.padding,
        radius: computed.borderRadius,
        width,
      };

      if (width <= 0 || height <= 0) {
        return;
      }

      setRenderedMetrics((current) =>
        current?.elementId === selectedElement.id &&
        areRenderedMetricsEqual(current, metrics)
          ? current
          : metrics,
      );
    };

    measure();
    const node = findRenderedNode();
    const resizeObserver =
      node && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;

    if (node && resizeObserver) {
      resizeObserver.observe(node);
    }

    window.addEventListener("resize", measure);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [activeViewport, selectedElements]);

  useEffect(() => {
    setDrafts(createDrafts(template, selectedElements, editablePaths, viewportScope));
    setFieldErrors({});
    setStatus(null);
    dispatch(clearPreviewElements());
  }, [dispatch, editablePaths, selectedElements, template, viewportScope]);

  useEffect(() => {
    const selectedElement = selectedElements.length === 1 ? selectedElements[0] : null;

    if (!selectedElement || renderedMetrics?.elementId !== selectedElement.id) {
      return;
    }

    setDrafts((current) => {
      const nextDrafts = { ...current };
      const computedFallbacks = [
        ["layout.width", renderedMetrics.width, "layout"],
        ["layout.height", renderedMetrics.height, "layout"],
        ["style.fontSize", renderedMetrics.fontSize, "style"],
        ["style.fontWeight", renderedMetrics.fontWeight, "style"],
        ["style.radius", renderedMetrics.radius, "style"],
        ["layout.padding", renderedMetrics.padding, "layout"],
        ["layout.margin", renderedMetrics.margin, "layout"],
        ["layout.gap", renderedMetrics.gap, "layout"],
        ["style.color", renderedMetrics.color, "style"],
        ["style.background", renderedMetrics.background, "style"],
        ["style.borderColor", renderedMetrics.borderColor, "style"],
      ] as const;

      computedFallbacks.forEach(([path, measuredValue, scope]) => {
        if (!editablePaths.includes(path) || current[path] !== "") {
          return;
        }

        const fieldName = getFieldNameFromPath(path);
        const scopedValue = getScopedValueForCommand(
          selectedElement,
          viewportScope,
          scope,
          fieldName,
        );

        if (scopedValue === null && measuredValue !== "" && measuredValue !== 0) {
          nextDrafts[path] = String(measuredValue);
        }
      });

      return nextDrafts;
    });
  }, [editablePaths, renderedMetrics, selectedElements, viewportScope]);

  const applyField = (field: FieldDefinition) => {
    const parsedValue = parseFieldValue(field, drafts[field.path]);
    const scope = getScopeFromPath(field.path);

    if (!scope) {
      return;
    }

    if (!parsedValue.ok) {
      setFieldErrors((current) => ({
        ...current,
        [field.path]: parsedValue.error,
      }));
      setStatus(parsedValue.error);
      return;
    }

    const fieldName = getFieldNameFromPath(field.path);
    const valueError = validateNewValue(scope, fieldName, parsedValue.value);

    if (valueError) {
      setFieldErrors((current) => ({
        ...current,
        [field.path]: valueError.message,
      }));
      setStatus(valueError.message);
      dispatch(
        clearPreviewValue({
          elementIds: selectedElements.map((element) => element.id),
          scope,
          fieldName,
        }),
      );
      return;
    }

    const command = createManualPropertyCommand({
      template,
      elementIds: selectedElements.map((element) => element.id),
      propertyScope: scope,
      viewportScope,
      path: field.path,
      newValue: parsedValue.value,
      description: `Manual inspector edit ${field.path}`,
    });

    if (!command) {
      setStatus("No changes to apply.");
      return;
    }

    const result = dispatch(executeCommand(command));

    if (result.ok) {
      setFieldErrors((current) => {
        const nextErrors = { ...current };
        delete nextErrors[field.path];

        return nextErrors;
      });
      dispatch(
        clearPreviewValue({
          elementIds: selectedElements.map((element) => element.id),
          scope,
          fieldName,
        }),
      );
      setStatus("Change applied.");
      return;
    }

    setFieldErrors((current) => ({
      ...current,
      [field.path]: result.error.message,
    }));
    setStatus(result.error.message);
  };

  const updateDraft = (field: FieldDefinition, draftValue: string) => {
    setDrafts((current) => ({ ...current, [field.path]: draftValue }));

    const scope = getScopeFromPath(field.path);

    if (!scope) {
      return;
    }

    const fieldName = getFieldNameFromPath(field.path);
    const parsedValue = parseFieldValue(field, draftValue);

    if (!parsedValue.ok) {
      setFieldErrors((current) => ({
        ...current,
        [field.path]: parsedValue.error,
      }));
      dispatch(
        clearPreviewValue({
          elementIds: selectedElements.map((element) => element.id),
          scope,
          fieldName,
        }),
      );
      return;
    }

    const valueError = validateNewValue(scope, fieldName, parsedValue.value);

    if (valueError) {
      setFieldErrors((current) => ({
        ...current,
        [field.path]: valueError.message,
      }));
      dispatch(
        clearPreviewValue({
          elementIds: selectedElements.map((element) => element.id),
          scope,
          fieldName,
        }),
      );
      return;
    }

    setFieldErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors[field.path];

      return nextErrors;
    });
    dispatch(
      setPreviewValue({
        elementIds: selectedElements.map((element) => element.id),
        scope,
        fieldName,
        value: parsedValue.value,
      }),
    );
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
      {selectedElements.length === 1 && isFixedElement(selectedElements[0]) ? (
        <p className="field-status" role="status">
          This element is fixed in the template structure, so it cannot be moved
          or dragged. You can still edit its available design fields.
        </p>
      ) : null}
      {renderedMetrics && selectedElements.length === 1 ? (
        <div className="rendered-size-readout" aria-label="Rendered element size">
          <span>Rendered size</span>
          <strong>
            {renderedMetrics.width} x {renderedMetrics.height} px
          </strong>
          <small>
            Blank fields use the visible canvas value. Editing Width, Height, or
            Font size stores a fixed value.
          </small>
        </div>
      ) : null}
      <p className="field-status">
        Changes preview immediately. Blur, Enter, or Apply commits one safe edit.
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
            error={fieldErrors[field.path]}
            field={field}
            onApply={() => applyField(field)}
            onChange={(value) => updateDraft(field, value)}
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
  error?: string;
  field: FieldDefinition;
  onApply: () => void;
  onChange: (value: string) => void;
}

function InspectorField({
  draft,
  error,
  field,
  onApply,
  onChange,
}: InspectorFieldProps) {
  const id = `inspector-${field.path.replace(".", "-")}`;

  return (
    <div className="inspector-field">
      <label className="field-control" htmlFor={id}>
        <span>{field.label}</span>
        {renderFieldInput(id, field, draft, onChange, onApply)}
      </label>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={onApply}>
        Apply
      </button>
      {error ? (
        <p className="field-error inspector-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function renderFieldInput(
  id: string,
  field: FieldDefinition,
  draft: string,
  onChange: (value: string) => void,
  onCommit: () => void,
) {
  if (field.kind === "color") {
    const colorValue = normalizeColorDraft(draft);

    return (
      <span className="color-field">
        <input
          id={id}
          aria-label={field.label}
          type="color"
          value={colorValue}
          onChange={(event) => onChange(event.currentTarget.value)}
          onBlur={onCommit}
        />
        <input
          aria-label={`${field.label} hex value`}
          type="text"
          value={draft}
          onChange={(event) => onChange(event.currentTarget.value.trim())}
          onBlur={onCommit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onCommit();
            }
          }}
          placeholder="#000000"
        />
      </span>
    );
  }

  if (field.kind === "textarea") {
    return (
      <textarea
        id={id}
        aria-label={field.label}
        rows={3}
        value={draft}
        onChange={(event) => onChange(event.currentTarget.value)}
        onBlur={onCommit}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            onCommit();
          }
        }}
      />
    );
  }

  if (field.kind === "select") {
    return (
      <select
        id={id}
        aria-label={field.label}
        value={field.options?.includes(draft) ? draft : ""}
        onChange={(event) => onChange(event.currentTarget.value)}
        onBlur={onCommit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            onCommit();
          }
        }}
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
        aria-label={field.label}
        checked={draft === "true"}
        type="checkbox"
        onChange={(event) => onChange(String(event.currentTarget.checked))}
        onBlur={onCommit}
      />
    );
  }

  return (
    <input
      id={id}
      aria-label={field.label}
      type={field.kind === "number" ? "number" : "text"}
      value={draft}
      onChange={(event) => onChange(event.currentTarget.value)}
      onBlur={onCommit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onCommit();
        }
      }}
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

  if (isColorPath(path) && firstValue === null) {
    return "#000000";
  }

  if (firstValue === null) {
    return "";
  }

  const stringValue = String(firstValue);

  return isColorPath(path) ? normalizeColorDraft(stringValue) : stringValue;
}

function isColorPath(path: string): boolean {
  return path === "style.color" ||
    path === "style.background" ||
    path === "style.borderColor";
}

function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function normalizeColorDraft(value: string): string {
  const trimmedValue = value.trim();

  if (isHexColor(trimmedValue)) {
    return trimmedValue.toLowerCase();
  }

  const shortHexMatch = /^#([0-9a-fA-F]{3})$/.exec(trimmedValue);

  if (shortHexMatch) {
    return `#${shortHexMatch[1]
      .split("")
      .map((character) => `${character}${character}`)
      .join("")
      .toLowerCase()}`;
  }

  const rgbMatch = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i.exec(
    trimmedValue,
  );

  if (rgbMatch) {
    return `#${rgbChannelToHex(rgbMatch[1])}${rgbChannelToHex(rgbMatch[2])}${rgbChannelToHex(rgbMatch[3])}`;
  }

  return "#000000";
}

function rgbChannelToHex(value: string): string {
  return Math.max(0, Math.min(255, Number(value)))
    .toString(16)
    .padStart(2, "0");
}

function normalizeFontWeight(value: string): string {
  if (/^\d+$/.test(value)) {
    return value;
  }

  return value === "bold" ? "700" : "400";
}

function areRenderedMetricsEqual(left: RenderedMetrics, right: RenderedMetrics): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isFixedElement(element: TemplateElement): boolean {
  return element.type === "page" || element.type === "nav";
}

type InspectorFieldValue = string | number | boolean | null;

type ParsedFieldValue =
  | { ok: true; value: InspectorFieldValue }
  | { ok: false; error: string };

function parseFieldValue(field: FieldDefinition, value: string): ParsedFieldValue {
  if (field.kind === "number") {
    if (value.trim() === "") {
      return { ok: false, error: `${field.label} needs a number.` };
    }

    const numberValue = Number(value);

    return Number.isFinite(numberValue)
      ? { ok: true, value: numberValue }
      : { ok: false, error: `${field.label} needs a valid number.` };
  }

  if (field.kind === "checkbox") {
    return { ok: true, value: value === "true" };
  }

  if (field.path === "style.fontWeight") {
    const numberValue = Number(value);

    return Number.isFinite(numberValue)
      ? { ok: true, value: numberValue }
      : { ok: false, error: `${field.label} needs a valid number.` };
  }

  if (isCssDimensionPath(field.path)) {
    return { ok: true, value: normalizeCssDimension(value) };
  }

  return { ok: true, value };
}

function isCssDimensionPath(path: string): boolean {
  return path === "style.radius" ||
    path === "layout.gap" ||
    path === "layout.margin" ||
    path === "layout.maxWidth" ||
    path === "layout.padding";
}

function normalizeCssDimension(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => (/^\d+(?:\.\d+)?$/.test(part) && part !== "0" ? `${part}px` : part))
    .join(" ");
}

function getScopeFromPath(path: string): EditScope | null {
  const [scope] = path.split(".");

  if (scope === "content" || scope === "style" || scope === "layout") {
    return scope;
  }

  return null;
}

function getFieldNameFromPath(path: string): string {
  return path.split(".")[1] ?? "";
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
