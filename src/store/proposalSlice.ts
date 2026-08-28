import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { resetEditor } from "../commands/commitActions";
import type { ProposalBatch, ProposalStatus } from "../ai/types";

export interface ProposalState {
  activeBatchId: string | null;
  batches: Record<string, ProposalBatch>;
}

const initialState: ProposalState = {
  activeBatchId: null,
  batches: {},
};

const proposalSlice = createSlice({
  name: "proposal",
  initialState,
  reducers: {
    storeProposalBatch(state, action: PayloadAction<ProposalBatch>) {
      state.batches[action.payload.id] = action.payload;
      state.activeBatchId = action.payload.id;
    },
    setActiveBatch(state, action: PayloadAction<string>) {
      if (state.batches[action.payload]) {
        state.activeBatchId = action.payload;
      }
    },
    clearActiveBatch(state) {
      state.activeBatchId = null;
    },
    markProposalItemStatus(
      state,
      action: PayloadAction<{
        batchId: string;
        itemId: string;
        status: ProposalStatus;
        error?: string;
      }>,
    ) {
      const item = state.batches[action.payload.batchId]?.items.find(
        (proposalItem) => proposalItem.id === action.payload.itemId,
      );

      if (!item) {
        return;
      }

      item.status = action.payload.status;
      item.error = action.payload.error;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetEditor, (state) => {
      state.activeBatchId = null;
      state.batches = {};
    });
  },
});

export const {
  clearActiveBatch,
  markProposalItemStatus,
  setActiveBatch,
  storeProposalBatch,
} = proposalSlice.actions;

export default proposalSlice.reducer;
