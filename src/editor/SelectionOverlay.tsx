import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
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

type DragMode = "move" | "resize";

interface OverlayDrag {
  mode: DragMode;
  elementId: ElementId;
  startX: number;
  startY: number;
  startLayout: Partial<ElementLayout>;
  startRect: OverlayRect;
  startScale: number;
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
  const [drag, setDrag] = useState<OverlayDrag | null>(null);

  useEffect(() => {
    const frame = frameRef.current;

    if (!frame) {
      setRects([]);
      return;
    }

    const measureRects = () => {
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
    };

    measureRects();
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            if (!drag) {
              measureRects();
            }
          })
        : null;

    selectedIds.forEach((id) => {
      const node = frame.querySelector<HTMLElement>(`[data-element-id="${id}"]`);

      if (node) {
        resizeObserver?.observe(node);
      }
    });
    window.addEventListener("resize", measureRects);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", measureRects);
    };
  }, [activeViewport, drag, frameRef, selectedIds, template]);

  const selectedElements = useMemo(
    () => selectedIds.map((id) => template.elements[id]).filter(Boolean),
    [selectedIds, template],
  );

  if (selectedIds.length === 0) {
    return null;
  }

  const getCurrentScale = () => {
    const renderer = frameRef.current?.querySelector<HTMLElement>(".template-renderer");
    const renderedWidth = renderer?.getBoundingClientRect().width ?? 0;
    const layoutWidth = renderer?.offsetWidth ?? 0;

    return renderedWidth > 0 && layoutWidth > 0
      ? renderedWidth / layoutWidth
      : canvasScale;
  };

  const buildDraftLayout = (
    currentDrag: OverlayDrag,
    clientX: number,
    clientY: number,
  ): Partial<ElementLayout> => {
    const scale = currentDrag.startScale;
    const deltaX = (clientX - currentDrag.startX) / scale;
    const deltaY = (clientY - currentDrag.startY) / scale;

    if (currentDrag.mode === "move") {
      return {
        offsetX: Math.round((currentDrag.startLayout.offsetX ?? 0) + deltaX),
        offsetY: Math.round((currentDrag.startLayout.offsetY ?? 0) + deltaY),
      };
    }

    return {
      height: Math.max(24, Math.round(currentDrag.startHeight + deltaY)),
      width: Math.max(40, Math.round(currentDrag.startWidth + deltaX)),
    };
  };

  const updatePreviewRect = (
    currentDrag: OverlayDrag,
    clientX: number,
    clientY: number,
  ) => {
    const deltaX = clientX - currentDrag.startX;
    const deltaY = clientY - currentDrag.startY;

    setRects((currentRects) =>
      currentRects.map((rect) => {
        if (rect.id !== currentDrag.elementId) {
          return rect;
        }

        if (currentDrag.mode === "move") {
          return {
            ...rect,
            left: currentDrag.startRect.left + deltaX,
            top: currentDrag.startRect.top + deltaY,
          };
        }

        return {
          ...rect,
          height: Math.max(24, currentDrag.startRect.height + deltaY),
          width: Math.max(40, currentDrag.startRect.width + deltaX),
        };
      }),
    );
  };

  const updateDrag = (clientX: number, clientY: number) => {
    if (!drag) {
      return;
    }

    const nextLayout = buildDraftLayout(drag, clientX, clientY);

    updatePreviewRect(drag, clientX, clientY);
    onDraftLayout(drag.elementId, nextLayout);
  };

  const endDrag = (clientX: number, clientY: number) => {
    if (!drag) {
      return;
    }

    const nextLayout = buildDraftLayout(drag, clientX, clientY);

    onDraftLayout(drag.elementId, null);
    onCommitLayout(drag.elementId, nextLayout);
    setDrag(null);
  };

  const startDrag = (
    event: ReactPointerEvent<HTMLElement>,
    rect: OverlayRect,
    mode: DragMode,
    layout: Partial<ElementLayout>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const scale = getCurrentScale();
    setDrag({
      elementId: rect.id,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startLayout: layout,
      startRect: rect,
      startScale: scale,
      startWidth: layout.width ?? Math.round(rect.width / scale),
      startHeight: layout.height ?? Math.round(rect.height / scale),
    });
  };

  const nudgeSelectedElement = (
    event: KeyboardEvent<HTMLElement>,
    rect: OverlayRect,
    layout: Partial<ElementLayout>,
  ) => {
    const deltas: Partial<Record<string, [number, number]>> = {
      ArrowDown: [0, 8],
      ArrowLeft: [-8, 0],
      ArrowRight: [8, 0],
      ArrowUp: [0, -8],
    };
    const delta = deltas[event.key];

    if (!delta) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    onCommitLayout(rect.id, {
      offsetX: Math.round((layout.offsetX ?? 0) + delta[0]),
      offsetY: Math.round((layout.offsetY ?? 0) + delta[1]),
    });
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
        const canMove = canResize;

        return (
          <div
            key={rect.id}
            className={`selection-box ${drag?.elementId === rect.id ? "selection-box-dragging" : ""}`}
            data-selection-id={rect.id}
            role="group"
            tabIndex={0}
            aria-label={`Move or resize ${rect.id}`}
            onKeyDown={(event) => nudgeSelectedElement(event, rect, resolvedLayout)}
            style={{
              height: rect.height,
              left: rect.left,
              top: rect.top,
              width: rect.width,
            }}
          >
            <span className="selection-label">
              {rect.name} - {rect.id}
            </span>
            {canMove ? (
              <button
                type="button"
                className="move-handle"
                aria-label={`Move ${rect.id}`}
                onPointerDown={(event) => startDrag(event, rect, "move", resolvedLayout)}
              >
                drag to move
              </button>
            ) : null}
            {canResize ? (
              <button
                type="button"
                className="resize-handle"
                aria-label={`Resize ${rect.id}`}
                onPointerDown={(event) =>
                  startDrag(event, rect, "resize", resolvedLayout)
                }
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
