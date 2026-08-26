import { useAppSelector } from "../app/hooks";
import {
  selectActiveViewport,
  selectEditScope,
  selectSelectedIds,
} from "../store/selectors";
import type { Viewport } from "../store/editorUISlice";

const viewportWidths: Record<Viewport, number> = {
  desktop: 1440,
  tablet: 768,
  mobile: 375,
};

const viewportClassNames: Record<Viewport, string> = {
  desktop: "canvas-device canvas-device-desktop",
  tablet: "canvas-device canvas-device-tablet",
  mobile: "canvas-device canvas-device-mobile",
};

export function Canvas() {
  const activeViewport = useAppSelector(selectActiveViewport);
  const editScope = useAppSelector(selectEditScope);
  const selectedIds = useAppSelector(selectSelectedIds);
  const intrinsicWidth = viewportWidths[activeViewport];

  return (
    <section className="canvas-stage" aria-labelledby="canvas-title">
      <div className="canvas-meta">
        <div>
          <h1 id="canvas-title">Website Canvas</h1>
          <p>Template rendering will be implemented in Step 2</p>
        </div>
        <dl>
          <div>
            <dt>Viewport</dt>
            <dd>{activeViewport}</dd>
          </div>
          <div>
            <dt>Intrinsic width</dt>
            <dd>{intrinsicWidth} px</dd>
          </div>
          <div>
            <dt>Edit scope</dt>
            <dd>{editScope === "all" ? "all views" : `${editScope} only`}</dd>
          </div>
        </dl>
      </div>

      <div className="device-scroll" aria-label={`${activeViewport} preview`}>
        <article className={viewportClassNames[activeViewport]}>
          <header className="preview-nav">
            <strong>Northstar Studio</strong>
            <span>Strategy</span>
            <span>Systems</span>
            <span>Launch</span>
          </header>
          <section className="preview-hero">
            <p>Digital studio</p>
            <h2>Calm websites for ambitious service teams.</h2>
            <span>Book a discovery call</span>
          </section>
          <section className="preview-services" aria-label="Services preview">
            <div>Brand systems</div>
            <div>Conversion pages</div>
            <div>Launch support</div>
          </section>
        </article>
      </div>

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
