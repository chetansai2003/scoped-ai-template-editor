import { Canvas } from "./Canvas";
import { LayersPanel } from "./LayersPanel";
import { ProposalDrawer } from "./ProposalDrawer";
import { RightPanel } from "./RightPanel";
import { TopToolbar } from "./TopToolbar";

export function EditorShell() {
  return (
    <div className="editor-shell">
      <TopToolbar />
      <div className="editor-workspace">
        <LayersPanel />
        <main className="editor-main" aria-label="Website canvas">
          <Canvas />
        </main>
        <RightPanel />
      </div>
      <ProposalDrawer />
    </div>
  );
}
