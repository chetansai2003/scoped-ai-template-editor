import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  setActivePanel,
  type EditorPanel,
} from "../store/editorUISlice";
import {
  selectActivePanel,
} from "../store/selectors";
import { AIInstructionPanel } from "../ai/AIInstructionPanel";
import { CodePanel } from "./CodePanel";
import { DesignInspector } from "./DesignInspector";
import { HistoryPanel } from "./HistoryPanel";

const tabs: Array<{ id: EditorPanel; label: string }> = [
  { id: "design", label: "Design" },
  { id: "ai", label: "AI Edit" },
  { id: "code", label: "Code" },
  { id: "history", label: "History" },
];

export function RightPanel() {
  const dispatch = useAppDispatch();
  const activePanel = useAppSelector(selectActivePanel);

  return (
    <aside className="right-panel" aria-label="Right panel">
      <div className="panel-heading">
        <span>Inspector</span>
        <small>Manual, code, AI, and history tools</small>
      </div>

      <div className="tab-list" role="tablist" aria-label="Inspector sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${tab.id}-tab`}
            aria-selected={activePanel === tab.id}
            aria-controls={`${tab.id}-panel`}
            className="tab-button"
            onClick={() => dispatch(setActivePanel(tab.id))}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section
        role="tabpanel"
        id={`${activePanel}-panel`}
        aria-labelledby={`${activePanel}-tab`}
        className="tab-panel"
      >
        {activePanel === "design" && (
          <DesignInspector />
        )}

        {activePanel === "ai" && (
          <AIInstructionPanel />
        )}

        {activePanel === "code" && (
          <CodePanel />
        )}

        {activePanel === "history" && (
          <HistoryPanel />
        )}
      </section>
    </aside>
  );
}
