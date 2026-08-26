import { createSlice } from "@reduxjs/toolkit";

export interface TemplateFoundationState {
  schemaVersion: number;
  templateId: string;
  templateName: string;
  source: "original";
  status: "planned";
}

const initialState: TemplateFoundationState = {
  schemaVersion: 1,
  templateId: "northstar-studio-v1",
  templateName: "Northstar Studio",
  source: "original",
  status: "planned",
};

const templateSlice = createSlice({
  name: "template",
  initialState,
  reducers: {},
});

export default templateSlice.reducer;
