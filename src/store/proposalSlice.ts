import { createSlice } from "@reduxjs/toolkit";

export interface ProposalFoundationState {
  activeBatchId: string | null;
  batches: Record<string, unknown>;
}

const initialState: ProposalFoundationState = {
  activeBatchId: null,
  batches: {},
};

const proposalSlice = createSlice({
  name: "proposal",
  initialState,
  reducers: {},
});

export default proposalSlice.reducer;
