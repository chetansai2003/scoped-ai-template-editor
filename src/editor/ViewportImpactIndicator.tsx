import type { ViewportScope } from "../store/editorUISlice";

const viewports = ["desktop", "tablet", "mobile"] as const;

interface ViewportImpactIndicatorProps {
  viewportScope: ViewportScope;
}

export function ViewportImpactIndicator({
  viewportScope,
}: ViewportImpactIndicatorProps) {
  return (
    <section className="viewport-impact" aria-label="Viewport impact">
      <div className="field-heading">
        <span>Viewport impact</span>
        <small>{viewportScope === "all" ? "Scope: all views" : `Scope: ${viewportScope}`}</small>
      </div>
      <div className="impact-grid">
        {viewports.map((viewport) => {
          const affected = viewportScope === "all" || viewportScope === viewport;

          return (
            <div
              key={viewport}
              className="impact-cell"
              data-affected={affected}
            >
              <strong>{viewport}</strong>
              <span>{affected ? "Affected" : "Protected"}</span>
            </div>
          );
        })}
      </div>
      <p>
        Property edits use the selected scope. Tree structure actions are all
        views only.
      </p>
    </section>
  );
}
