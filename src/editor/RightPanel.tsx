import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  setActivePanel,
  type EditorPanel,
} from "../store/editorUISlice";
import {
  selectActivePanel,
  selectActiveViewport,
  selectEditScope,
  selectSelectedIds,
} from "../store/selectors";

const tabs: Array<{ id: EditorPanel; label: string }> = [
  { id: "design", label: "Design" },
  { id: "ai", label: "AI Edit" },
  { id: "code", label: "Code" },
  { id: "history", label: "History" },
];

export function RightPanel() {
  const dispatch = useAppDispatch();
  const activePanel = useAppSelector(selectActivePanel);
  const selectedIds = useAppSelector(selectSelectedIds);
  const activeViewport = useAppSelector(selectActiveViewport);
  const editScope = useAppSelector(selectEditScope);

  return (
    <aside className="right-panel" aria-label="Right panel">
      <div className="panel-heading">
        <span>Inspector</span>
        <small>Step 1 shell</small>
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
          <>
            <h2>Design</h2>
            <p>Inspector controls begin in Step 4</p>
            <dl>
              <div>
                <dt>Selected</dt>
                <dd>
                  {selectedIds.length > 0
                    ? selectedIds.join(", ")
                    : "No selected IDs"}
                </dd>
              </div>
              <div>
                <dt>Viewport</dt>
                <dd>{activeViewport}</dd>
              </div>
              <div>
                <dt>Edit scope</dt>
                <dd>{editScope}</dd>
              </div>
            </dl>
          </>
        )}

        {activePanel === "ai" && (
          <>
            <h2>AI Edit</h2>
            <p>
              AI proposal creation will be implemented in Step 5. This panel is
              intentionally non-functional in Step 1.
            </p>
          </>
        )}

        {activePanel === "code" && (
          <>
            <h2>Code</h2>
            <p>
              JSON code editing and shared-state synchronization will be
              implemented in a later step.
            </p>
          </>
        )}

        {activePanel === "history" && (
          <>
            <h2>History</h2>
            <p>
              Per-element and per-viewport recovery will be implemented in a
              later step.
            </p>
          </>
        )}
      </section>
    </aside>
  );
}
