import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  setActivePanel,
  type EditorPanel,
} from "../store/editorUISlice";
import {
  selectActivePanel,
} from "../store/selectors";
import { DesignInspector } from "./DesignInspector";

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
        <small>Step 4 manual editing</small>
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
          <>
            <h2>AI Edit</h2>
            <p>
              AI proposal creation will be implemented in Step 5. This panel is
              intentionally non-functional in Step 4.
            </p>
          </>
        )}

        {activePanel === "code" && (
          <>
            <h2>Code</h2>
            <p>
              JSON code editing and shared-state synchronization will be
              implemented in Step 5.
            </p>
          </>
        )}

        {activePanel === "history" && (
          <>
            <h2>History</h2>
            <p>
              Per-element and per-viewport recovery will be implemented in a
              later step. Step 4 manual edits already create scoped history.
            </p>
          </>
        )}
      </section>
    </aside>
  );
}
