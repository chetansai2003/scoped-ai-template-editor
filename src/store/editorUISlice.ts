import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { resetEditor } from "../commands/commitActions";
import type { Viewport } from "../template/templateTypes";

export type ViewportScope = "all" | Viewport;
export type EditorPanel = "design" | "ai" | "code" | "history";

export interface EditorUIState {
  selectedIds: string[];
  activeViewport: Viewport;
  editScope: ViewportScope;
  activePanel: EditorPanel;
  persistenceNotice: string | null;
}

const initialState: EditorUIState = {
  selectedIds: [],
  activeViewport: "desktop",
  editScope: "all",
  activePanel: "design",
  persistenceNotice: null,
};

const editorUISlice = createSlice({
  name: "editorUI",
  initialState,
  reducers: {
    setPersistenceNotice(state, action: PayloadAction<string | null>) {
      state.persistenceNotice = action.payload;
    },
    setActiveViewport(state, action: PayloadAction<Viewport>) {
      state.activeViewport = action.payload;
    },
    setEditScope(state, action: PayloadAction<ViewportScope>) {
      state.editScope = action.payload;
    },
    setActivePanel(state, action: PayloadAction<EditorPanel>) {
      state.activePanel = action.payload;
    },
    replaceSelection(state, action: PayloadAction<string[]>) {
      state.selectedIds = action.payload;
    },
    toggleSelectionId(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.selectedIds = state.selectedIds.includes(id)
        ? state.selectedIds.filter((selectedId) => selectedId !== id)
        : [...state.selectedIds, id];
    },
    clearSelection(state) {
      state.selectedIds = [];
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetEditor, (state) => {
      state.selectedIds = [];
      state.activeViewport = "desktop";
      state.editScope = "all";
    });
  },
});

export const {
  clearSelection,
  replaceSelection,
  setActivePanel,
  setActiveViewport,
  setEditScope,
  toggleSelectionId,
  setPersistenceNotice,
} = editorUISlice.actions;

export default editorUISlice.reducer;
