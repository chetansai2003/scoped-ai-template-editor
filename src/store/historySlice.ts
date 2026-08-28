import { createSlice } from "@reduxjs/toolkit";
import { commitValidatedTemplateChange, resetEditor } from "../commands/commitActions";
import type { HistoryEntry, HistoryState } from "../commands/commandTypes";
import type { ElementId } from "../template/templateTypes";
import type { ViewportScope } from "./editorUISlice";

const initialState: HistoryState = {
  byElement: {},
};

const historySlice = createSlice({
  name: "history",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(commitValidatedTemplateChange, (state, action) => {
      action.payload.targets.forEach((target) => {
        const elementHistory = state.byElement[target.elementId] ?? {};
        const scopedHistory = elementHistory[action.payload.viewportScope] ?? [];

        state.byElement[target.elementId] = {
          ...elementHistory,
          [action.payload.viewportScope]: [
            ...scopedHistory,
            target.historyEntry,
          ],
        };
      });
    });
    builder.addCase(resetEditor, (state) => {
      state.byElement = {};
    });
  },
});

export default historySlice.reducer;

export type { ElementId, HistoryEntry, HistoryState, ViewportScope };
