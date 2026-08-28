import { useAppSelector } from "../app/hooks";
import {
  selectActiveViewport,
  selectPreviewElements,
  selectSelectedIds,
} from "../store/selectors";
import { selectTemplateDocument } from "../template/templateSelectors";
import { RenderedElement } from "./RenderedElement";
import type { ElementId, ElementLayout } from "../template/templateTypes";

interface TemplateRendererProps {
  draftLayouts?: Partial<Record<ElementId, Partial<ElementLayout>>>;
  onElementKeySelect?: (elementId: ElementId, append: boolean) => void;
  onElementSelect?: (elementId: ElementId, append: boolean) => void;
}

export function TemplateRenderer({
  draftLayouts,
  onElementKeySelect,
  onElementSelect,
}: TemplateRendererProps) {
  const template = useAppSelector(selectTemplateDocument);
  const viewport = useAppSelector(selectActiveViewport);
  const selectedIds = useAppSelector(selectSelectedIds);
  const previewElements = useAppSelector(selectPreviewElements);

  return (
    <div className="template-renderer" data-renderer-viewport={viewport}>
      <RenderedElement
        elementId={template.rootElementId}
        draftLayouts={draftLayouts}
        onElementKeySelect={onElementKeySelect}
        onElementSelect={onElementSelect}
        previewElements={previewElements}
        selectedIds={selectedIds}
        template={template}
        viewport={viewport}
      />
    </div>
  );
}
