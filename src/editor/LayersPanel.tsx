import type { KeyboardEvent, MouseEvent } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  clearSelection,
  replaceSelection,
  toggleSelectionId,
} from "../store/editorUISlice";
import { selectSelectedIds } from "../store/selectors";
import { selectOrderedTemplateTree } from "../template/templateSelectors";

export function LayersPanel() {
  const dispatch = useAppDispatch();
  const selectedIds = useAppSelector(selectSelectedIds);
  const templateTree = useAppSelector(selectOrderedTemplateTree);

  const selectLayer = (event: MouseEvent<HTMLButtonElement>, id: string) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      dispatch(toggleSelectionId(id));
      return;
    }

    if (selectedIds.includes(id)) {
      dispatch(clearSelection());
      return;
    }

    dispatch(replaceSelection([id]));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      dispatch(clearSelection());
    }
  };

  return (
    <aside
      className="layers-panel"
      aria-label="Layers panel"
      onKeyDown={handleKeyDown}
    >
      <div className="panel-heading">
        <span>Layers</span>
        <small>Canonical tree</small>
      </div>

      <div className="layer-list" role="list" aria-label="Template elements">
        {templateTree.map(({ element, depth }) => {
          const isSelected = selectedIds.includes(element.id);

          return (
            <button
              key={element.id}
              type="button"
              className="layer-row"
              data-depth={depth}
              data-selected={isSelected}
              aria-pressed={isSelected}
              aria-label={`${element.name}, ${element.id}`}
              onClick={(event) => selectLayer(event, element.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  dispatch(replaceSelection([element.id]));
                }
              }}
            >
              <span className="layer-label">{element.name}</span>
              <code>{element.id}</code>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
