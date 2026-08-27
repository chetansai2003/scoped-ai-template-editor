import type { CSSProperties, KeyboardEvent } from "react";
import { useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { executeCommand } from "../commands/commandExecutor";
import { createManualMultiPropertyCommand } from "../commands/manualCommandCreators";
import { TemplateRenderer } from "../renderer/TemplateRenderer";
import {
  clearSelection,
  replaceSelection,
  toggleSelectionId,
} from "../store/editorUISlice";
import {
  selectActiveViewport,
  selectEditScope,
  selectSelectedIds,
} from "../store/selectors";
import {
  selectActiveViewportSettings,
  selectTemplateDocument,
} from "../template/templateSelectors";
import type { ElementId, ElementLayout } from "../template/templateTypes";
import { InlineTextEditor } from "./InlineTextEditor";
import { SelectionOverlay } from "./SelectionOverlay";

const previewWidths = {
  desktop: 860,
  tablet: 540,
  mobile: 320,
};

type CanvasCustomStyle = CSSProperties & Record<"--preview-width", string>;

export function Canvas() {
  const dispatch = useAppDispatch();
  const activeViewport = useAppSelector(selectActiveViewport);
  const editScope = useAppSelector(selectEditScope);
  const selectedIds = useAppSelector(selectSelectedIds);
  const viewportSettings = useAppSelector(selectActiveViewportSettings);
  const template = useAppSelector(selectTemplateDocument);
  const frameRef = useRef<HTMLElement | null>(null);
  const [draftLayouts, setDraftLayouts] = useState<
    Partial<Record<ElementId, Partial<ElementLayout>>>
  >({});
  const [layoutError, setLayoutError] = useState<string | null>(null);
  const previewStyle: CanvasCustomStyle = {
    "--preview-width": `${previewWidths[activeViewport]}px`,
  };
  const canvasScale = previewWidths[activeViewport] / viewportSettings.width;

  const selectElement = (elementId: ElementId, append: boolean) => {
    if (append) {
      dispatch(toggleSelectionId(elementId));
      return;
    }

    dispatch(replaceSelection([elementId]));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      dispatch(clearSelection());
    }
  };

  const commitLayout = (elementId: ElementId, layout: Partial<ElementLayout>) => {
    const command = createManualMultiPropertyCommand({
      template,
      elementId,
      propertyScope: "layout",
      viewportScope: editScope,
      changes: [
        { path: "layout.width", newValue: layout.width ?? null },
        { path: "layout.height", newValue: layout.height ?? null },
        { path: "layout.offsetX", newValue: layout.offsetX ?? 0 },
        { path: "layout.offsetY", newValue: layout.offsetY ?? 0 },
      ],
      description: `Resize and position ${elementId}`,
    });

    if (!command) {
      setLayoutError(null);
      return;
    }

    const result = dispatch(executeCommand(command));

    setLayoutError(result.ok ? null : result.error.message);
  };

  return (
    <section className="canvas-stage" aria-labelledby="canvas-title">
      <div className="canvas-meta">
        <div>
          <h1 id="canvas-title">Website Canvas</h1>
          <p>Rendered from the canonical template document</p>
        </div>
        <dl>
          <div>
            <dt>Viewport</dt>
            <dd>{activeViewport}</dd>
          </div>
          <div>
            <dt>Intrinsic width</dt>
            <dd>{viewportSettings.width} px</dd>
          </div>
          <div>
            <dt>Edit scope</dt>
            <dd>{editScope === "all" ? "all views" : `${editScope} only`}</dd>
          </div>
        </dl>
      </div>

      <div
        className="device-scroll"
        aria-label={`${activeViewport} preview`}
        onKeyDown={handleKeyDown}
      >
        <article
          ref={frameRef}
          className={`canvas-device canvas-device-${activeViewport}`}
          data-intrinsic-width={viewportSettings.width}
          style={previewStyle}
        >
          <TemplateRenderer
            draftLayouts={draftLayouts}
            onElementKeySelect={selectElement}
            onElementSelect={selectElement}
          />
          <SelectionOverlay
            canvasScale={canvasScale}
            frameRef={frameRef}
            onCommitLayout={commitLayout}
            onDraftLayout={(elementId, layout) =>
              setDraftLayouts((current) => {
                if (!layout) {
                  const rest = { ...current };
                  delete rest[elementId];

                  return rest;
                }

                return { ...current, [elementId]: layout };
              })
            }
          />
        </article>
      </div>

      <InlineTextEditor />
      {layoutError ? (
        <p className="field-error" role="alert">
          {layoutError}
        </p>
      ) : null}

      <div className="selection-summary" aria-live="polite">
        <span>Selected stable IDs</span>
        {selectedIds.length > 0 ? (
          <ul>
            {selectedIds.map((id) => (
              <li key={id}>
                <code>{id}</code>
              </li>
            ))}
          </ul>
        ) : (
          <p>No selection</p>
        )}
      </div>
    </section>
  );
}
