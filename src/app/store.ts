import { configureStore } from "@reduxjs/toolkit";
import editorUIReducer from "../store/editorUISlice";
import historyReducer from "../store/historySlice";
import proposalReducer from "../store/proposalSlice";
import templateReducer from "../store/templateSlice";

export const store = configureStore({
  reducer: {
    template: templateReducer,
    editorUI: editorUIReducer,
    proposal: proposalReducer,
    history: historyReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
