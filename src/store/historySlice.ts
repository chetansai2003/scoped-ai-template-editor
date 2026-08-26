import { createSlice } from "@reduxjs/toolkit";

export interface HistoryFoundationState {
  byElement: Record<string, unknown>;
}

const initialState: HistoryFoundationState = {
  byElement: {},
};

const historySlice = createSlice({
  name: "history",
  initialState,
  reducers: {},
});

export default historySlice.reducer;
