import { useEffect, useMemo, useState, type RefObject } from "react";
import { useAppSelector } from "../app/hooks";
import { selectSelectedIds } from "../store/selectors";
import { resolveTemplateElement } from "../template/resolveResponsiveValue";
import { selectTemplateDocument } from "../template/templateSelectors";
import type { ElementId, ElementLayout } from "../template/templateTypes";

interface SelectionOverlayProps {
  canvasScale: number;
  frameRef: RefObject<HTMLElement | null>;
  onDraftLayout: (elementId: ElementId, layout: Partial<ElementLayout> | null) => void;
  onCommitLayout: (elementId: ElementId, layout: Partial<ElementLayout>) => void;
}

interface OverlayRect {
  id: ElementId;
  name: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

interface ResizeDrag {
  elementId: ElementId;
  startX: number;
  startY: number;
  startLayout: Partial<ElementLayout>;
  startWidth: number;
  startHeight: number;
}

export function SelectionOverlay({
  canvasScale,
  frameRef,
  onDraftLayout,
  onCommitLayout,
}: SelectionOverlayProps) {
  const selectedIds = useAppSelector(selectSelectedIds);
  const template = useAppSelector(selectTemplateDocument);
  const activeViewport = useAppSelector((state) => state.editorUI.activeViewport);
  const [rects, setRects] = useState<OverlayRect[]>([]);
  const [drag, setDrag] = useState<ResizeDrag | null>(null);

  useEffect(() => {
    const frame = frameRef.current;

    if (!frame) {
      setRects([]);
      return;
    }

    const frameRect = frame.getBoundingClientRect();
    const measuredRects = selectedIds
      .map((id) => {
        const node = frame.querySelector<HTMLElement>(`[data-element-id="${id}"]`);
        const element = template.elements[id];

        if (!node || !element) {
          return null;
        }

        const rect = node.getBoundingClientRect();

        return {
          id,
          name: element.name,
          left: rect.left - frameRect.left,
          top: rect.top - frameRect.top,
          width: rect.width || 160,
          height: rect.height || 80,
        };
      })
      .filter((rect): rect is OverlayRect => Boolean(rect));

    setRects(measuredRects);
  }, [activeViewport, frameRef, selectedIds, template]);

  const selectedElements = useMemo(
    () => selectedIds.map((id) => template.elements[id]).filter(Boolean),
    [selectedIds, template],
  );

  if (selectedIds.length === 0) {
    return null;
  }

  const updateDrag = (clientX: number, clientY: number) => {
    if (!drag) {
      return;
    }

    const deltaX = (clientX - drag.startX) / canvasScale;
    const deltaY = (clientY - drag.startY) / canvasScale;
    const nextLayout = {
      ...drag.startLayout,
      height: Math.max(24, Math.round(drag.startHeight + deltaY)),
      offsetX: Math.round((drag.startLayout.offsetX ?? 0) + deltaX),
      offsetY: Math.round((drag.startLayout.offsetY ?? 0) + deltaY),
      width: Math.max(40, Math.round(drag.startWidth + deltaX)),
    };

    onDraftLayout(drag.elementId, nextLayout);
  };

  const endDrag = (clientX: number, clientY: number) => {
    if (!drag) {
      return;
    }

    const deltaX = (clientX - drag.startX) / canvasScale;
    const deltaY = (clientY - drag.startY) / canvasScale;
    const nextLayout = {
      ...drag.startLayout,
      height: Math.max(24, Math.round(drag.startHeight + deltaY)),
      offsetX: Math.round((drag.startLayout.offsetX ?? 0) + deltaX),
      offsetY: Math.round((drag.startLayout.offsetY ?? 0) + deltaY),
      width: Math.max(40, Math.round(drag.startWidth + deltaX)),
    };

    onDraftLayout(drag.elementId, null);
    onCommitLayout(drag.elementId, nextLayout);
    setDrag(null);
  };

  return (
    <div
      className="selection-overlay"
      aria-label="Selection overlay"
      onPointerMove={(event) => updateDrag(event.clientX, event.clientY)}
      onPointerUp={(event) => endDrag(event.clientX, event.clientY)}
    >
      {rects.map((rect) => {
        const element = template.elements[rect.id];
        const resolvedLayout = element
          ? resolveTemplateElement(element, activeViewport).resolvedLayout
          : {};
        const canResize = Boolean(element && element.type !== "page" && element.type !== "nav");

        return (
          <div
            key={rect.id}
            className="selection-box"
            data-selection-id={rect.id}
            style={{
              height: rect.height,
              left: rect.left,
              top: rect.top,
              width: rect.width,
            }}
          >
            <span className="selection-label">
              {rect.name} · {rect.id}
            </span>
            {canResize ? (
              <button
                type="button"
                className="resize-handle"
                aria-label={`Resize ${rect.id}`}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setDrag({
                    elementId: rect.id,
                    startX: event.clientX,
                    startY: event.clientY,
                    startLayout: resolvedLayout,
                    startWidth: resolvedLayout.width ?? Math.round(rect.width / canvasScale),
                    startHeight:
                      resolvedLayout.height ?? Math.round(rect.height / canvasScale),
                  });
                }}
              />
            ) : null}
          </div>
        );
      })}
      <span className="sr-only">
        {selectedElements.length} selected elements have visible outlines.
      </span>
    </div>
  );
}
