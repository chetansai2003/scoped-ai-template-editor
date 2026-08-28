import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  setActiveViewport,
  setEditScope,
  setPersistenceNotice,
  type ViewportScope,
} from "../store/editorUISlice";
import type { Viewport } from "../template/templateTypes";
import {
  selectActiveViewport,
  selectEditScope,
  selectTemplateMetadata,
} from "../store/selectors";
import { executeCommand } from "../commands/commandExecutor";
import { createUndoCommand } from "../commands/undoCommand";
import { selectLatestUndoableCommandGroup } from "../history/historySelectors";
import { ResetDialog } from "./ResetDialog";

const viewportOptions: Array<{ value: Viewport; label: string }> = [
  { value: "desktop", label: "Desktop" },
  { value: "tablet", label: "Tablet" },
  { value: "mobile", label: "Mobile" },
];

const scopeOptions: Array<{ value: ViewportScope; label: string }> = [
  { value: "all", label: "All views" },
  { value: "desktop", label: "Desktop only" },
  { value: "tablet", label: "Tablet only" },
  { value: "mobile", label: "Mobile only" },
];

export function TopToolbar() {
  const dispatch = useAppDispatch();
  const template = useAppSelector(selectTemplateMetadata);
  const activeViewport = useAppSelector(selectActiveViewport);
  const editScope = useAppSelector(selectEditScope);
  const latestUndoableCommand = useAppSelector(selectLatestUndoableCommandGroup);
  const templateDocument = useAppSelector((state) => state.template);
  const [isResetOpen, setIsResetOpen] = useState(false);

  const undoLatestCommand = () => {
    if (!latestUndoableCommand) {
      return;
    }

    const undoCommand = createUndoCommand(latestUndoableCommand, templateDocument, {
      id: `undo-${Date.now()}`,
      timestamp: new Date().toISOString(),
    });

    if (!undoCommand.ok) {
      dispatch(setPersistenceNotice(`Undo failed: ${undoCommand.error.message}`));
      return;
    }

    const result = dispatch(executeCommand(undoCommand.command));

    dispatch(
      setPersistenceNotice(
        result.ok ? "Undid latest edit." : `Undo failed: ${result.error.message}`,
      ),
    );
  };

  return (
    <header className="top-toolbar" aria-label="Editor toolbar">
      <div className="template-title">
        <span className="template-kicker">Template</span>
        <strong>{template.templateName}</strong>
      </div>

      <nav className="viewport-switcher" aria-label="Preview viewport">
        {viewportOptions.map((option) => (
          <button
            key={option.value}
            className="toolbar-button"
            type="button"
            aria-pressed={activeViewport === option.value}
            onClick={() => dispatch(setActiveViewport(option.value))}
          >
            {option.label}
          </button>
        ))}
      </nav>

      <label className="scope-control">
        <span>Scope</span>
        <select
          value={editScope}
          onChange={(event) =>
            dispatch(setEditScope(event.currentTarget.value as ViewportScope))
          }
        >
          {scopeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="reset-area">
        <button
          type="button"
          className="toolbar-button"
          disabled={!latestUndoableCommand}
          onClick={undoLatestCommand}
        >
          Undo
        </button>
        {!latestUndoableCommand ? (
          <span className="toolbar-helper">Nothing to undo.</span>
        ) : null}
        <button
          type="button"
          className="toolbar-button"
          onClick={() => setIsResetOpen(true)}
        >
          Reset
        </button>
      </div>
      <ResetDialog isOpen={isResetOpen} onClose={() => setIsResetOpen(false)} />
    </header>
  );
}
