import { json } from "@codemirror/lang-json";
import CodeMirror from "@uiw/react-codemirror";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  createCodeEditCommand,
  getCodeEditableValues,
} from "../code/diffEditableValues";
import { formatCodeDraft, parseCodeDraft } from "../code/parseCodeDraft";
import { executeCommand } from "../commands/commandExecutor";
import type { EditScope } from "../template/templateTypes";
import {
  selectEditScope,
  selectSelectedIds,
} from "../store/selectors";
import { selectTemplateDocument } from "../template/templateSelectors";

const scopeOptions: Array<{ value: EditScope; label: string }> = [
  { value: "content", label: "Content" },
  { value: "style", label: "Style" },
  { value: "layout", label: "Layout" },
];

export function CodePanel() {
  const dispatch = useAppDispatch();
  const template = useAppSelector(selectTemplateDocument);
  const selectedIds = useAppSelector(selectSelectedIds);
  const viewportScope = useAppSelector(selectEditScope);
  const [propertyScope, setPropertyScope] = useState<EditScope>("content");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [applyVersion, setApplyVersion] = useState(0);
  const selectedElement =
    selectedIds.length === 1 ? template.elements[selectedIds[0]] : undefined;
  const selectedElementId = selectedElement?.id ?? "";
  useEffect(() => {
    setDraft(
      selectedElement
        ? formatCodeDraft(
            propertyScope,
            getCodeEditableValues(selectedElement, propertyScope, viewportScope),
          )
        : "",
    );
    setError(null);
    setStatus(null);
  }, [applyVersion, propertyScope, selectedElementId, viewportScope]);

  if (selectedIds.length === 0) {
    return (
      <div className="code-panel">
        <h2>Code</h2>
        <p>Select one element to edit its focused JSON.</p>
      </div>
    );
  }

  if (selectedIds.length > 1 || !selectedElement) {
    return (
      <div className="code-panel">
        <h2>Code</h2>
        <p>Code editing supports one selected element at a time.</p>
      </div>
    );
  }

  const applyDraft = () => {
    const parsed = parseCodeDraft(draft, propertyScope);

    if (!parsed.ok) {
      setError(`Invalid JSON: ${parsed.error}`);
      setStatus(null);
      return;
    }

    const commandResult = createCodeEditCommand({
      template,
      elementId: selectedElement.id,
      propertyScope,
      viewportScope,
      values: parsed.draft.values,
    });

    if (!commandResult.ok) {
      setError(commandResult.error);
      setStatus(null);
      return;
    }

    if (!commandResult.command) {
      setError(null);
      setStatus("No changes to apply.");
      return;
    }

    const result = dispatch(executeCommand(commandResult.command));

    if (!result.ok) {
      setError(result.error.message);
      setStatus(null);
      return;
    }

    setError(null);
    setStatus("Code changes applied.");
    setDraft(formatCodeDraft(propertyScope, parsed.draft.values));
    setApplyVersion((version) => version + 1);
  };

  return (
    <div className="code-panel">
      <h2>Code</h2>
      <p>
        Editing {selectedElement.name} <code>{selectedElement.id}</code>
      </p>
      <p className="field-status">
        Choose the matching scope, edit the JSON, then click Apply Changes.
      </p>
      <label className="field-control">
        <span>Code scope</span>
        <select
          value={propertyScope}
          onChange={(event) => setPropertyScope(event.currentTarget.value as EditScope)}
        >
          {scopeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <div className="code-mirror-wrap">
        <CodeMirror
          basicSetup={{
            foldGutter: false,
            highlightActiveLine: true,
            lineNumbers: true,
          }}
          extensions={[json()]}
          height="260px"
          value={draft}
          onChange={(value) => {
            setDraft(value);
            if (error) {
              setError(null);
            }
          }}
        />
      </div>
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
      {status ? (
        <p className="field-status" role="status">
          {status}
        </p>
      ) : null}
      <button type="button" className="primary-action" onClick={applyDraft}>
        Apply Changes
      </button>
    </div>
  );
}
