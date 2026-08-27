import { useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { executeCommand } from "../commands/commandExecutor";
import {
  createAddElementCommand,
  createDuplicateCommand,
  createMoveCommand,
  createReorderCommand,
  getCompatibleParentIds,
} from "../commands/manualCommandCreators";
import { selectEditScope, selectSelectedIds } from "../store/selectors";
import { selectTemplateDocument } from "../template/templateSelectors";
import type { TemplateElementType } from "../template/templateTypes";

const addableTypes = ["text", "button", "card"] as const;

export function StructureControls() {
  const dispatch = useAppDispatch();
  const template = useAppSelector(selectTemplateDocument);
  const selectedIds = useAppSelector(selectSelectedIds);
  const viewportScope = useAppSelector(selectEditScope);
  const [addType, setAddType] =
    useState<Extract<TemplateElementType, "text" | "button" | "card">>("text");
  const [targetParentId, setTargetParentId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const selectedElement =
    selectedIds.length === 1 ? template.elements[selectedIds[0]] : undefined;
  const selectedParent = selectedElement?.parentId
    ? template.elements[selectedElement.parentId]
    : undefined;
  const structureAllowed = viewportScope === "all";
  const compatibleParentIds = useMemo(
    () =>
      selectedElement
        ? getCompatibleParentIds(template, selectedElement.id)
        : [],
    [selectedElement, template],
  );
  const insertionParentId = selectedElement?.children.length
    ? selectedElement.id
    : selectedElement?.parentId;

  const runCommand = (
    command:
      | ReturnType<typeof createReorderCommand>
      | ReturnType<typeof createMoveCommand>
      | ReturnType<typeof createAddElementCommand>
      | ReturnType<typeof createDuplicateCommand>
      | null,
  ) => {
    if (!command) {
      setMessage("Select one movable element.");
      return;
    }

    const result = dispatch(executeCommand(command));

    setMessage(result.ok ? "Structure updated." : result.error.message);
  };

  const moveBy = (delta: -1 | 1) => {
    if (!selectedElement?.parentId || !selectedParent) {
      setMessage("Select one movable element.");
      return;
    }

    const fromIndex = selectedParent.children.indexOf(selectedElement.id);
    const toIndex = fromIndex + delta;

    if (toIndex < 0 || toIndex >= selectedParent.children.length) {
      setMessage("Element is already at that edge.");
      return;
    }

    runCommand(
      createReorderCommand(
        template,
        selectedParent.id,
        selectedElement.id,
        toIndex,
        viewportScope,
      ),
    );
  };

  const addElement = () => {
    if (!insertionParentId) {
      setMessage("Select a parent or child element before adding.");
      return;
    }

    const parent = template.elements[insertionParentId];

    if (!parent) {
      setMessage("Selected parent is unavailable.");
      return;
    }

    runCommand(
      createAddElementCommand(
        template,
        parent.id,
        addType,
        parent.children.length,
        viewportScope,
      ),
    );
  };

  return (
    <section className="structure-controls" aria-label="Structure controls">
      <div className="field-heading">
        <span>Structure</span>
        <small>All views only</small>
      </div>
      {!structureAllowed ? (
        <p className="field-error" role="status">
          Reorder, move, add, and duplicate require All views scope.
        </p>
      ) : null}
      <div className="button-grid">
        <button
          type="button"
          disabled={!structureAllowed}
          onClick={() => moveBy(-1)}
        >
          Move up
        </button>
        <button
          type="button"
          disabled={!structureAllowed}
          onClick={() => moveBy(1)}
        >
          Move down
        </button>
        <button
          type="button"
          disabled={!structureAllowed || !selectedElement}
          onClick={() =>
            runCommand(
              selectedElement
                ? createDuplicateCommand(template, selectedElement.id, viewportScope)
                : null,
            )
          }
        >
          Duplicate
        </button>
      </div>
      <label className="field-control">
        <span>Move to parent</span>
        <select
          disabled={!structureAllowed || compatibleParentIds.length === 0}
          value={targetParentId}
          onChange={(event) => setTargetParentId(event.currentTarget.value)}
        >
          <option value="">Choose parent</option>
          {compatibleParentIds.map((parentId) => (
            <option key={parentId} value={parentId}>
              {parentId}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={!structureAllowed || !selectedElement || !targetParentId}
        onClick={() => {
          if (!selectedElement || !targetParentId) {
            return;
          }

          const parent = template.elements[targetParentId];
          runCommand(
            parent
              ? createMoveCommand(
                  template,
                  selectedElement.id,
                  targetParentId,
                  parent.children.length,
                  viewportScope,
                )
              : null,
          );
        }}
      >
        Move to parent
      </button>
      <div className="add-row">
        <label className="field-control">
          <span>Add element</span>
          <select
            disabled={!structureAllowed}
            value={addType}
            onChange={(event) =>
              setAddType(
                event.currentTarget.value as Extract<
                  TemplateElementType,
                  "text" | "button" | "card"
                >,
              )
            }
          >
            {addableTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <button type="button" disabled={!structureAllowed} onClick={addElement}>
          Add
        </button>
      </div>
      {message ? (
        <p className="field-status" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
