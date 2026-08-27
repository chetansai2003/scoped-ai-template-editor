import { configureStore } from "@reduxjs/toolkit";
import editorUIReducer from "../store/editorUISlice";
import historyReducer from "../store/historySlice";
import proposalReducer from "../store/proposalSlice";
import templateReducer from "../store/templateSlice";

export function createAppStore() {
  return configureStore({
    reducer: {
      template: templateReducer,
      editorUI: editorUIReducer,
      proposal: proposalReducer,
      history: historyReducer,
    },
  });
}

export const store = createAppStore();

export type AppStore = ReturnType<typeof createAppStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
