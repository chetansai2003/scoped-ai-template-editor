import type { KeyboardEvent, MouseEvent } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  clearSelection,
  replaceSelection,
  toggleSelectionId,
} from "../store/editorUISlice";
import { selectSelectedIds } from "../store/selectors";

interface PlannedLayer {
  id: string;
  label: string;
  depth: number;
}

const plannedLayers: PlannedLayer[] = [
  { id: "page.root", label: "Page", depth: 0 },
  { id: "nav.root", label: "Navigation", depth: 0 },
  { id: "hero.section", label: "Hero", depth: 0 },
  { id: "hero.heading", label: "Hero Heading", depth: 1 },
  { id: "hero.description", label: "Hero Description", depth: 1 },
  { id: "hero.primaryButton", label: "Primary Button", depth: 1 },
  { id: "services.section", label: "Services", depth: 0 },
  { id: "services.card.1", label: "Service Card 1", depth: 1 },
  { id: "services.card.2", label: "Service Card 2", depth: 1 },
  { id: "services.card.3", label: "Service Card 3", depth: 1 },
  { id: "testimonial.section", label: "Testimonial", depth: 0 },
  { id: "cta.section", label: "Call to Action", depth: 0 },
  { id: "footer.root", label: "Footer", depth: 0 },
];

export function LayersPanel() {
  const dispatch = useAppDispatch();
  const selectedIds = useAppSelector(selectSelectedIds);

  const selectLayer = (event: MouseEvent<HTMLButtonElement>, id: string) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      dispatch(toggleSelectionId(id));
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
        <small>Planned structure</small>
      </div>

      <div className="layer-list" role="list" aria-label="Planned elements">
        {plannedLayers.map((layer) => {
          const isSelected = selectedIds.includes(layer.id);

          return (
            <button
              key={layer.id}
              type="button"
              className="layer-row"
              data-depth={layer.depth}
              data-selected={isSelected}
              aria-pressed={isSelected}
              onClick={(event) => selectLayer(event, layer.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  dispatch(replaceSelection([layer.id]));
                }
              }}
            >
              <span className="layer-label">{layer.label}</span>
              <code>{layer.id}</code>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
