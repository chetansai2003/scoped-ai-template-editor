import type { RootState } from "../app/store";

export const selectTemplateMetadata = (state: RootState) => state.template.metadata;
export const selectActiveViewport = (state: RootState) =>
  state.editorUI.activeViewport;
export const selectEditScope = (state: RootState) => state.editorUI.editScope;
export const selectSelectedIds = (state: RootState) => state.editorUI.selectedIds;
export const selectActivePanel = (state: RootState) =>
  state.editorUI.activePanel;
export const selectProposalBoundary = (state: RootState) => state.proposal;
export const selectHistoryBoundary = (state: RootState) => state.history;
export const selectPersistenceNotice = (state: RootState) => state.editorUI.persistenceNotice;
