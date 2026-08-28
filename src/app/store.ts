import { configureStore, combineReducers } from "@reduxjs/toolkit";
import editorUIReducer from "../store/editorUISlice";
import historyReducer from "../store/historySlice";
import proposalReducer from "../store/proposalSlice";
import templateReducer from "../store/templateSlice";
import { persistenceMiddleware } from "./persistenceMiddleware";

const rootReducer = combineReducers({
  template: templateReducer,
  editorUI: editorUIReducer,
  proposal: proposalReducer,
  history: historyReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export type AppPreloadedState = Partial<RootState>;

export function createAppStore(preloadedState?: AppPreloadedState) {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(persistenceMiddleware),
    preloadedState,
  });
}

export const store = createAppStore();

export type AppStore = ReturnType<typeof createAppStore>;
export type AppDispatch = AppStore["dispatch"];
