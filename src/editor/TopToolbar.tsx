import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  setActiveViewport,
  setEditScope,
  type ViewportScope,
} from "../store/editorUISlice";
import type { Viewport } from "../template/templateTypes";
import {
  selectActiveViewport,
  selectEditScope,
  selectTemplateMetadata,
} from "../store/selectors";

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
        <button type="button" className="toolbar-button" disabled>
          Reset
        </button>
        <span className="reset-note">
          Reset will be implemented with persistence in Step 6.
        </span>
      </div>
    </header>
  );
}
