import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { executeCommand } from "../commands/commandExecutor";
import { createManualPropertyCommand } from "../commands/manualCommandCreators";
import { selectEditScope, selectSelectedIds } from "../store/selectors";
import { resolveTemplateElement } from "../template/resolveResponsiveValue";
import { selectTemplateDocument } from "../template/templateSelectors";

const inlineEditableTypes = new Set(["text", "button", "badge", "stat"]);

export function InlineTextEditor() {
  const dispatch = useAppDispatch();
  const template = useAppSelector(selectTemplateDocument);
  const selectedIds = useAppSelector(selectSelectedIds);
  const viewportScope = useAppSelector(selectEditScope);
  const activeViewport = useAppSelector((state) => state.editorUI.activeViewport);
  const selectedElement =
    selectedIds.length === 1 ? template.elements[selectedIds[0]] : undefined;
  const resolvedElement = selectedElement
    ? resolveTemplateElement(selectedElement, activeViewport)
    : undefined;
  const currentText = resolvedElement?.resolvedContent.text ?? "";
  const canEdit =
    Boolean(selectedElement) &&
    inlineEditableTypes.has(selectedElement?.type ?? "") &&
    currentText.length > 0;
  const [draft, setDraft] = useState(currentText);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(currentText);
    setIsEditing(false);
    setError(null);
  }, [currentText, selectedElement?.id, viewportScope]);

  const label = useMemo(() => {
    if (!selectedElement) {
      return "Select one text element to edit inline.";
    }

    if (!canEdit) {
      return "Inline editing is available for one text-like element.";
    }

    return `Inline editing ${selectedElement.name}`;
  }, [canEdit, selectedElement]);

  if (!canEdit || !selectedElement) {
    return <p className="inline-editor-note">{label}</p>;
  }

  const commit = () => {
    if (draft === currentText) {
      setIsEditing(false);
      return;
    }

    const command = createManualPropertyCommand({
      template,
      elementIds: [selectedElement.id],
      propertyScope: "content",
      viewportScope,
      path: "content.text",
      newValue: draft,
      description: `Inline edit ${selectedElement.id}`,
    });

    if (!command) {
      setIsEditing(false);
      return;
    }

    const result = dispatch(executeCommand(command));

    if (!result.ok) {
      setError(result.error.message);
      setDraft(currentText);
      return;
    }

    setError(null);
    setIsEditing(false);
  };

  return (
    <section className="inline-text-editor" aria-label="Inline text editor">
      <div className="field-heading">
        <span>{label}</span>
        <small>{viewportScope === "all" ? "All views" : `${viewportScope} only`}</small>
      </div>
      {isEditing ? (
        <textarea
          aria-label="Inline text draft"
          rows={3}
          value={draft}
          onBlur={commit}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setDraft(currentText);
              setError(null);
              setIsEditing(false);
            }

            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              commit();
            }
          }}
        />
      ) : (
        <button
          type="button"
          className="secondary-action"
          onClick={() => setIsEditing(true)}
        >
          Edit text inline
        </button>
      )}
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
