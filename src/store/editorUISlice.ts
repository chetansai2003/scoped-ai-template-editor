import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { resetEditor } from "../commands/commitActions";
import type {
  EditScope,
  ElementContent,
  ElementId,
  ElementLayout,
  ElementStyle,
  Viewport,
} from "../template/templateTypes";

export type ViewportScope = "all" | Viewport;
export type EditorPanel = "design" | "ai" | "code" | "history";
export type PreviewPatch = Partial<{
  content: Partial<ElementContent>;
  style: Partial<ElementStyle>;
  layout: Partial<ElementLayout>;
}>;

export interface EditorUIState {
  selectedIds: string[];
  activeViewport: Viewport;
  editScope: ViewportScope;
  activePanel: EditorPanel;
  persistenceNotice: string | null;
  previewElements: Partial<Record<ElementId, PreviewPatch>>;
}

const initialState: EditorUIState = {
  selectedIds: [],
  activeViewport: "desktop",
  editScope: "all",
  activePanel: "design",
  persistenceNotice: null,
  previewElements: {},
};

const editorUISlice = createSlice({
  name: "editorUI",
  initialState,
  reducers: {
    setPersistenceNotice(state, action: PayloadAction<string | null>) {
      state.persistenceNotice = action.payload;
    },
    setPreviewValue(
      state,
      action: PayloadAction<{
        elementIds: ElementId[];
        scope: EditScope;
        fieldName: string;
        value: string | number | boolean | null;
      }>,
    ) {
      action.payload.elementIds.forEach((elementId) => {
        const elementPreview = state.previewElements[elementId] ?? {};
        const scopedPreview = elementPreview[action.payload.scope] ?? {};

        state.previewElements[elementId] = {
          ...elementPreview,
          [action.payload.scope]: {
            ...scopedPreview,
            [action.payload.fieldName]: action.payload.value,
          },
        };
      });
    },
    clearPreviewValue(
      state,
      action: PayloadAction<{
        elementIds: ElementId[];
        scope: EditScope;
        fieldName: string;
      }>,
    ) {
      action.payload.elementIds.forEach((elementId) => {
        const elementPreview = state.previewElements[elementId];
        const scopedPreview = elementPreview?.[action.payload.scope];

        if (!elementPreview || !scopedPreview) {
          return;
        }

        const nextScopedPreview = { ...scopedPreview };
        delete nextScopedPreview[action.payload.fieldName as keyof typeof nextScopedPreview];

        state.previewElements[elementId] = {
          ...elementPreview,
          [action.payload.scope]: nextScopedPreview,
        };

        if (Object.keys(nextScopedPreview).length === 0) {
          delete state.previewElements[elementId]?.[action.payload.scope];
        }

        if (
          Object.values(state.previewElements[elementId] ?? {}).every(
            (values) => !values || Object.keys(values).length === 0,
          )
        ) {
          delete state.previewElements[elementId];
        }
      });
    },
    clearPreviewElements(state) {
      state.previewElements = {};
    },
    setActiveViewport(state, action: PayloadAction<Viewport>) {
      state.activeViewport = action.payload;
      state.previewElements = {};
    },
    setEditScope(state, action: PayloadAction<ViewportScope>) {
      state.editScope = action.payload;
      state.previewElements = {};
    },
    setActivePanel(state, action: PayloadAction<EditorPanel>) {
      state.activePanel = action.payload;
    },
    replaceSelection(state, action: PayloadAction<string[]>) {
      state.selectedIds = action.payload;
      state.previewElements = {};
    },
    toggleSelectionId(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.selectedIds = state.selectedIds.includes(id)
        ? state.selectedIds.filter((selectedId) => selectedId !== id)
        : [...state.selectedIds, id];
      state.previewElements = {};
    },
    clearSelection(state) {
      state.selectedIds = [];
      state.previewElements = {};
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetEditor, (state) => {
      state.selectedIds = [];
      state.activeViewport = "desktop";
      state.editScope = "all";
      state.previewElements = {};
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
  setPreviewValue,
  clearPreviewValue,
  clearPreviewElements,
} = editorUISlice.actions;

export default editorUISlice.reducer;
