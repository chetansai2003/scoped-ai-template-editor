import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { createAppStore } from "./app/store";
import { EditorShell } from "./editor/EditorShell";
import { loadPersistedState } from "./persistence/storage";
import "./editor/editor.css";
import "./renderer/renderer.css";

const result = loadPersistedState();
const preloadedState = result.ok
  ? { template: result.state.template, history: result.state.history }
  : undefined;

const store = createAppStore(preloadedState);

if (!result.ok && result.needsRecovery) {
  // If we needed to recover from corrupted state, schedule a notice
  setTimeout(() => {
    store.dispatch({
      type: "editorUI/setPersistenceNotice",
      payload: "Invalid persisted state found. Loaded default template.",
    });
  }, 100);
}

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <Provider store={store}>
      <EditorShell />
    </Provider>
  </StrictMode>,
);
