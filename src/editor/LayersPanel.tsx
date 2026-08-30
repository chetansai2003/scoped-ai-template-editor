import type { KeyboardEvent, MouseEvent } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  clearSelection,
  replaceSelection,
  toggleSelectionId,
} from "../store/editorUISlice";
import { selectSelectedIds } from "../store/selectors";
import { selectOrderedTemplateTree } from "../template/templateSelectors";
import { resolveTemplateElement } from "../template/resolveResponsiveValue";

export function LayersPanel() {
  const dispatch = useAppDispatch();
  const selectedIds = useAppSelector(selectSelectedIds);
  const templateTree = useAppSelector(selectOrderedTemplateTree);
  const activeViewport = useAppSelector((state) => state.editorUI.activeViewport);

  const selectLayer = (
    event: MouseEvent<HTMLButtonElement>,
    id: string,
    isHiddenInViewport: boolean,
  ) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      dispatch(toggleSelectionId(id));
      return;
    }

    if (selectedIds.includes(id)) {
      if (isHiddenInViewport) {
        dispatch(replaceSelection([id]));
        return;
      }

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
          const isHiddenInViewport =
            resolveTemplateElement(element, activeViewport).resolvedLayout.visible === false;

          return (
            <button
              key={element.id}
              type="button"
              className="layer-row"
              data-depth={depth}
              data-selected={isSelected}
              data-hidden={isHiddenInViewport}
              aria-pressed={isSelected}
              aria-label={`${element.name}, ${element.id}${isHiddenInViewport ? ", hidden in canvas" : ""}`}
              onClick={(event) => selectLayer(event, element.id, isHiddenInViewport)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  dispatch(replaceSelection([element.id]));
                }
              }}
            >
              <span className="layer-label">{element.name}</span>
              <code>{element.id}</code>
              {isHiddenInViewport ? <small>Hidden</small> : null}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
