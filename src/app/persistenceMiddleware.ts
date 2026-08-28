import type { Middleware } from "@reduxjs/toolkit";
import { commitValidatedTemplateChange, resetEditor } from "../commands/commitActions";
import { setPersistenceNotice } from "../store/editorUISlice";
import { savePersistedState, clearPersistedState } from "../persistence/storage";
import type { RootState } from "./store";
import { PERSISTENCE_SCHEMA_VERSION } from "../persistence/persistedStateSchema";

export const persistenceMiddleware: Middleware<unknown, RootState> = (storeAPI) => (next) => (action) => {
  const result = next(action);

  if (commitValidatedTemplateChange.match(action)) {
    const state = storeAPI.getState();
    const saveResult = savePersistedState({
      schemaVersion: PERSISTENCE_SCHEMA_VERSION,
      template: state.template,
      history: state.history,
    });

    if (saveResult instanceof Error) {
      storeAPI.dispatch(
        setPersistenceNotice("Failed to save changes. Your work may be lost on reload.")
      );
    }
  }

  if (resetEditor.match(action)) {
    clearPersistedState();
    storeAPI.dispatch(setPersistenceNotice("Editor has been reset to defaults."));
  }

  return result;
};
