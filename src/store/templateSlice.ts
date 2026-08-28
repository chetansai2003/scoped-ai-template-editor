import { createSlice } from "@reduxjs/toolkit";
import { commitValidatedTemplateChange, resetEditor } from "../commands/commitActions";
import { northstarTemplate } from "../template/northstarTemplate";
import type { TemplateDocument } from "../template/templateTypes";

const initialState: TemplateDocument = northstarTemplate;

const templateSlice = createSlice({
  name: "template",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(commitValidatedTemplateChange, (state, action) => {
      action.payload.targets.forEach((target) => {
        state.elements[target.elementId] = target.afterElement;
      });
      action.payload.removedElementIds?.forEach((elementId) => {
        delete state.elements[elementId];
      });
    });
    builder.addCase(resetEditor, () => {
      // Use structuredClone to create a deep copy of the northstar template
      return structuredClone(northstarTemplate);
    });
  },
});

export default templateSlice.reducer;
