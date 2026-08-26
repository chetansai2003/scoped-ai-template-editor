import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type Viewport = "desktop" | "tablet" | "mobile";
export type EditScope = "all" | Viewport;
export type EditorPanel = "design" | "ai" | "code" | "history";

export interface EditorUIState {
  selectedIds: string[];
  activeViewport: Viewport;
  editScope: EditScope;
  activePanel: EditorPanel;
}

const initialState: EditorUIState = {
  selectedIds: [],
  activeViewport: "desktop",
  editScope: "all",
  activePanel: "design",
};

const editorUISlice = createSlice({
  name: "editorUI",
  initialState,
  reducers: {
    setActiveViewport(state, action: PayloadAction<Viewport>) {
      state.activeViewport = action.payload;
    },
    setEditScope(state, action: PayloadAction<EditScope>) {
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
});

export const {
  clearSelection,
  replaceSelection,
  setActivePanel,
  setActiveViewport,
  setEditScope,
  toggleSelectionId,
} = editorUISlice.actions;

export default editorUISlice.reducer;
