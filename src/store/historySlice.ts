import { createSlice } from "@reduxjs/toolkit";
import { commitValidatedTemplateChange, resetEditor } from "../commands/commitActions";
import type { HistoryEntry, HistoryState } from "../commands/commandTypes";
import type { ElementId } from "../template/templateTypes";
import type { ViewportScope } from "./editorUISlice";

const initialState: HistoryState = {
  byElement: {},
  undoneCommandIds: [],
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
      if (
        action.payload.undoOfCommandId &&
        !state.undoneCommandIds.includes(action.payload.undoOfCommandId)
      ) {
        state.undoneCommandIds.push(action.payload.undoOfCommandId);
      }
    });
    builder.addCase(resetEditor, (state) => {
      state.byElement = {};
      state.undoneCommandIds = [];
    });
  },
});

export default historySlice.reducer;

export type { ElementId, HistoryEntry, HistoryState, ViewportScope };
