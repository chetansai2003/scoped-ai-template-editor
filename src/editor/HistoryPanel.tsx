import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { selectHistoryBoundary } from "../store/selectors";
import { selectSelectedTemplateElements } from "../template/templateSelectors";
import type { ViewportScope } from "../store/editorUISlice";
import { createRestoreCommand } from "../commands/restoreCommand";
import { executeCommand } from "../commands/commandExecutor";
import type { HistoryEntry } from "../commands/commandTypes";
import { setPersistenceNotice } from "../store/editorUISlice";

const scopeOptions: Array<{ value: ViewportScope; label: string }> = [
  { value: "all", label: "All views" },
  { value: "desktop", label: "Desktop" },
  { value: "tablet", label: "Tablet" },
  { value: "mobile", label: "Mobile" },
];

export function HistoryPanel() {
  const dispatch = useAppDispatch();
  const selectedElements = useAppSelector(selectSelectedTemplateElements);
  const historyState = useAppSelector(selectHistoryBoundary);
  // Get the full template state for the restore command
  const templateState = useAppSelector((state) => state.template);
  
  const [filterScope, setFilterScope] = useState<ViewportScope>("all");

  if (selectedElements.length === 0) {
    return (
      <div className="history-panel-empty">
        <p>Select an element to view its history.</p>
      </div>
    );
  }

  if (selectedElements.length > 1) {
    return (
      <div className="history-panel-empty">
        <p>Select a single element to view its history.</p>
      </div>
    );
  }

  const selectedElement = selectedElements[0];
  const elementHistory = historyState.byElement[selectedElement.id];

  if (!elementHistory) {
    return (
      <div className="history-panel-empty">
        <p>No history available for this element.</p>
      </div>
    );
  }

  const entries = elementHistory[filterScope] || [];

  const handleRestore = (historyEntry: HistoryEntry) => {
    try {
      const commandResult = createRestoreCommand(
        historyEntry, 
        templateState, 
        { 
          id: `restore-${Date.now()}`, 
          timestamp: new Date().toISOString() 
        }
      );
      if (!commandResult.ok) {
        dispatch(setPersistenceNotice(`Restore failed: ${commandResult.error.message}`));
      } else {
        // Assume executeCommand handles dispatching the action? 
        // Actually executeCommand was used, let's keep executeCommand but we need to pass the command payload
        const execResult = dispatch(executeCommand(commandResult.command));
        if (!execResult.ok) {
          dispatch(setPersistenceNotice(`Restore failed: ${execResult.error.message}`));
        } else {
          dispatch(setPersistenceNotice(`Successfully restored to past state.`));
        }
      }
    } catch (e) {
      dispatch(setPersistenceNotice(`Restore failed: ${e instanceof Error ? e.message : "Unknown error"}`));
    }
  };

  return (
    <div className="history-panel">
      <div className="history-filters">
        <label>
          <span>Scope:</span>
          <select 
            value={filterScope} 
            onChange={(e) => setFilterScope(e.target.value as ViewportScope)}
          >
            {scopeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
      </div>

      {entries.length === 0 ? (
        <p className="no-history-entries">No {filterScope} history for this element.</p>
      ) : (
        <ul className="history-entries">
          {entries.map((entry) => (
            <li key={entry.id} className="history-entry" tabIndex={0}>
              <div className="history-entry-header">
                <strong>{entry.description}</strong>
                <span className="history-entry-source">{entry.source}</span>
              </div>
              <time dateTime={entry.timestamp}>{new Date(entry.timestamp).toLocaleString()}</time>
              <div className="history-entry-actions">
                <button 
                  type="button" 
                  onClick={() => handleRestore(entry)}
                  aria-label={`Restore ${selectedElement.name} ${filterScope} to this state`}
                >
                  Restore
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
