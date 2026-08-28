import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { loadPersistedState, savePersistedState } from "./storage";
import { PERSISTENCE_KEY, PERSISTENCE_SCHEMA_VERSION, type PersistedEditorState } from "./persistedStateSchema";
import { northstarTemplate } from "../template/northstarTemplate";
import { createAppStore } from "../app/store";
import { setEditScope, setActiveViewport, toggleSelectionId } from "../store/editorUISlice";
import { commitValidatedTemplateChange, resetEditor } from "../commands/commitActions";
import { storeProposalBatch, markProposalItemStatus } from "../store/proposalSlice";
import type { ValidatedCommitPayload } from "../commands/commandTypes";
import type { RevisionToken } from "../template/templateTypes";

describe("Persistence Storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const validState: PersistedEditorState = {
    schemaVersion: PERSISTENCE_SCHEMA_VERSION,
    template: structuredClone(northstarTemplate),
    history: { byElement: {} },
  };

  describe("loadPersistedState", () => {
    it("returns needsRecovery=false when no state exists", () => {
      const result = loadPersistedState();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.needsRecovery).toBe(false);
      }
    });

    it("returns valid state when parsing succeeds", () => {
      localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(validState));
      const result = loadPersistedState();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.state.schemaVersion).toBe(PERSISTENCE_SCHEMA_VERSION);
        expect(result.state.template.rootElementId).toBe(northstarTemplate.rootElementId);
      }
    });

    it("returns needsRecovery=true when JSON is malformed", () => {
      localStorage.setItem(PERSISTENCE_KEY, "{ invalid json");
      const result = loadPersistedState();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.needsRecovery).toBe(true);
      }
    });

    it("returns needsRecovery=true when schema is invalid (e.g. wrong version)", () => {
      const invalidState = { ...validState, schemaVersion: 999 };
      localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(invalidState));
      const result = loadPersistedState();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.needsRecovery).toBe(true);
      }
    });

    it("returns needsRecovery=true when template tree is invalid (dangling child)", () => {
      const invalidTree = structuredClone(validState);
      const root = invalidTree.template.elements[invalidTree.template.rootElementId];
      if (root) {
        root.children.push("does-not-exist");
      }
      
      localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(invalidTree));
      const result = loadPersistedState();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.needsRecovery).toBe(true);
      }
    });
  });

  describe("savePersistedState", () => {
    it("saves state to localStorage", () => {
      const err = savePersistedState(validState);
      expect(err).toBeNull();
      const raw = localStorage.getItem(PERSISTENCE_KEY);
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed.schemaVersion).toBe(PERSISTENCE_SCHEMA_VERSION);
    });
  });
});

describe("Persistence Middleware and Reset Behavior", () => {
  let store: ReturnType<typeof createAppStore>;

  beforeEach(() => {
    localStorage.clear();
    // Spy on setItem to track exactly when writes happen
    vi.spyOn(Storage.prototype, 'setItem');
    store = createAppStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not persist on ephemeral UI changes (viewport, scope, selection)", () => {
    store.dispatch(setActiveViewport("mobile"));
    store.dispatch(setEditScope("mobile"));
    store.dispatch(toggleSelectionId("page-root"));
    
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(localStorage.getItem(PERSISTENCE_KEY)).toBeNull();
  });

  it("does not persist on proposal generation or status changes", () => {
    store.dispatch(storeProposalBatch({
      id: "batch-1",
      instruction: "test",
      normalizedInstruction: "test",
      selectedIdsSnapshot: ["page-root"],
      viewportScope: "all",
      items: [
        {
          id: "item-1",
          elementId: "page-root",
          kind: "property",
          propertyScope: "style",
          viewportScope: "all",
          changes: [],
          revisionToken: { base: 0 } satisfies RevisionToken,
          status: "pending",
          before: { style: {} },
          after: { style: { background: "#000" } }
        }
      ]
    }));
    
    store.dispatch(markProposalItemStatus({
      batchId: "batch-1",
      itemId: "item-1",
      status: "rejected"
    }));

    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it("persists ONLY on successful durable commits", () => {
    const root = northstarTemplate.elements[northstarTemplate.rootElementId]!;
    const dummyCommit: ValidatedCommitPayload = {
      commandId: "cmd-1",
      source: "canvas",
      propertyScope: "style",
      viewportScope: "all",
      description: "Test commit",
      timestamp: new Date().toISOString(),
      targets: [
        {
          elementId: root.id,
          beforeElement: root,
          afterElement: { ...root, style: { ...root.style, background: "#f00" } },
          before: { style: { background: root.style.background } },
          after: { style: { background: "#f00" } },
          previousRevision: 0,
          resultingRevision: 1,
          historyEntry: {
            id: "hist-1",
            commandId: "cmd-1",
            elementId: root.id,
            operationType: "property",
            propertyScope: "style",
            viewportScope: "all",
            source: "canvas",
            description: "Test",
            before: { style: { background: root.style.background } },
            after: { style: { background: "#f00" } },
            previousRevision: 0,
            resultingRevision: 1,
            timestamp: new Date().toISOString(),
          }
        }
      ]
    };

    store.dispatch(commitValidatedTemplateChange(dummyCommit));
    
    expect(localStorage.setItem).toHaveBeenCalledTimes(1);
    const raw = localStorage.getItem(PERSISTENCE_KEY);
    expect(raw).toBeTruthy();
    
    const parsed = JSON.parse(raw!);
    expect(parsed.template.elements[root.id].style.background).toBe("#f00");
  });

  it("reset clears storage key and clears the editor slices but does not write immediately", () => {
    // Write something first
    localStorage.setItem(PERSISTENCE_KEY, "fake-data");
    vi.mocked(localStorage.setItem).mockClear();
    
    // Modify store to make sure it gets reset
    store.dispatch(setActiveViewport("mobile"));
    
    // Perform reset
    store.dispatch(resetEditor());
    
    // It should have removed the key
    expect(localStorage.getItem(PERSISTENCE_KEY)).toBeNull();
    // It should not have called setItem during reset.
    expect(localStorage.setItem).not.toHaveBeenCalled();
    
    // Verify store state is reset
    const state = store.getState();
    expect(state.editorUI.activeViewport).toBe("desktop");
  });
});
