import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./app/store";
import { EditorShell } from "./editor/EditorShell";
import "./editor/editor.css";
import "./renderer/renderer.css";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <Provider store={store}>
      <EditorShell />
    </Provider>
  </StrictMode>,
);
