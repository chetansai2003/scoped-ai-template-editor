import { describe, expect, it } from "vitest";
import { createAppStore } from "../app/store";
import { executeCommand } from "../commands/commandExecutor";
import { createManualPropertyCommand } from "../commands/manualCommandCreators";
import { selectTotalCommittedHistoryEntries } from "../history/historySelectors";
import { replaceSelection } from "../store/editorUISlice";
import {
  markProposalItemStatus,
  storeProposalBatch,
} from "../store/proposalSlice";
import { buildProposalAcceptanceCommand } from "./proposalCommands";
import { generateProposals } from "./scenarioEngine";

describe("deterministic AI proposals", () => {
  it("returns identical batches for identical input and does not mutate state", () => {
    const store = createAppStore();
    const input = {
      instruction: "Make this text more concise",
      selectedIds: ["hero-body"],
      viewportScope: "all" as const,
      template: store.getState().template,
    };
    const beforeTemplate = JSON.stringify(store.getState().template);
    const first = generateProposals(input);
    const second = generateProposals(input);

    expect(second).toEqual(first);
    expect(JSON.stringify(store.getState().template)).toBe(beforeTemplate);
    expect(selectTotalCommittedHistoryEntries(store.getState())).toBe(0);
  });

  it("returns safe unsupported feedback for payment instructions", () => {
    const store = createAppStore();
    const batch = generateProposals({
      instruction: "Add a payment system",
      selectedIds: ["hero-heading"],
      viewportScope: "all",
      template: store.getState().template,
    });

    expect(batch.items).toHaveLength(0);
    expect(batch.message).toContain("outside Step 5");
    expect(selectTotalCommittedHistoryEntries(store.getState())).toBe(0);
  });

  it("never targets unselected elements", () => {
    const store = createAppStore();
    const batch = generateProposals({
      instruction: "Make the selected element dark blue",
      selectedIds: ["hero-heading"],
      viewportScope: "all",
      template: store.getState().template,
    });

    expect(batch.items.every((item) => item.elementId === "hero-heading")).toBe(true);
  });

  it("rejects vertical stack proposals for all-views scope", () => {
    const store = createAppStore();
    const batch = generateProposals({
      instruction: "Stack selected items vertically",
      selectedIds: ["features-section"],
      viewportScope: "all",
      template: store.getState().template,
    });

    expect(batch.items).toHaveLength(0);
    expect(batch.message).toContain("requires a desktop, tablet, or mobile-only scope");
  });

  it("uses typed StructureOperation for card wider and move-first proposals", () => {
    const store = createAppStore();
    const batch = generateProposals({
      instruction: "Make this card wider and move it first",
      selectedIds: ["feature-strategy"],
      viewportScope: "all",
      template: store.getState().template,
    });

    const structureItem = batch.items.find((item) => item.kind === "structure");

    expect(structureItem?.structureOperation).toMatchObject({
      type: "reorder",
      parentId: "features-section",
      elementId: "feature-strategy",
      toIndex: 0,
    });
    expect(structureItem?.changes).toEqual([]);
  });

  it("rejects structural card proposals outside all-views scope", () => {
    const store = createAppStore();
    const batch = generateProposals({
      instruction: "Make this card wider and move it first",
      selectedIds: ["feature-strategy"],
      viewportScope: "mobile",
      template: store.getState().template,
    });

    expect(batch.items).toHaveLength(0);
    expect(batch.message).toContain("All views scope");
  });

  it("rejecting a proposal item changes only proposal state", () => {
    const store = createAppStore();
    const batch = generateProposals({
      instruction: "Make this text more concise",
      selectedIds: ["hero-body"],
      viewportScope: "all",
      template: store.getState().template,
    });
    const beforeTemplate = JSON.stringify(store.getState().template);

    store.dispatch(storeProposalBatch(batch));
    store.dispatch(
      markProposalItemStatus({
        batchId: batch.id,
        itemId: batch.items[0].id,
        status: "rejected",
      }),
    );

    expect(JSON.stringify(store.getState().template)).toBe(beforeTemplate);
    expect(store.getState().proposal.batches[batch.id].items[0].status).toBe(
      "rejected",
    );
  });

  it("accepting one proposal item uses the executor and source ai history", () => {
    const store = createAppStore();
    store.dispatch(replaceSelection(["hero-body"]));
    const batch = generateProposals({
      instruction: "Make this text more concise",
      selectedIds: ["hero-body"],
      viewportScope: "all",
      template: store.getState().template,
    });
    const commandResult = buildProposalAcceptanceCommand(
      batch,
      batch.items[0],
      store.getState().template,
      store.getState().editorUI.selectedIds,
    );

    expect(commandResult.ok).toBe(true);

    if (!commandResult.ok) {
      throw new Error("Expected AI command");
    }

    const result = store.dispatch(executeCommand(commandResult.command));

    expect(result.ok).toBe(true);
    expect(store.getState().template.elements["hero-body"].content.text).not.toContain(
      "responsive components",
    );
    expect(selectTotalCommittedHistoryEntries(store.getState())).toBe(1);
  });

  it("marks only the affected item stale after a manual edit changes its revision", () => {
    const store = createAppStore();
    store.dispatch(replaceSelection(["hero-body", "cta-body"]));
    const batch = generateProposals({
      instruction: "Make this text more concise",
      selectedIds: ["hero-body", "cta-body"],
      viewportScope: "all",
      template: store.getState().template,
    });
    const manualCommand = createManualPropertyCommand({
      template: store.getState().template,
      elementIds: ["hero-body"],
      propertyScope: "content",
      viewportScope: "all",
      path: "content.text",
      newValue: "Manual edit before accepting.",
      description: "Manual stale trigger",
    });

    if (manualCommand) {
      store.dispatch(executeCommand(manualCommand));
    }

    const staleResult = buildProposalAcceptanceCommand(
      batch,
      batch.items.find((item) => item.elementId === "hero-body") ?? batch.items[0],
      store.getState().template,
      store.getState().editorUI.selectedIds,
    );
    const freshResult = buildProposalAcceptanceCommand(
      batch,
      batch.items.find((item) => item.elementId === "cta-body") ?? batch.items[0],
      store.getState().template,
      store.getState().editorUI.selectedIds,
    );

    expect(staleResult).toMatchObject({ ok: false, status: "stale" });
    expect(freshResult.ok).toBe(true);
  });

  it("changed selection authority invalidates only the affected AI item", () => {
    const store = createAppStore();
    store.dispatch(replaceSelection(["hero-body", "cta-body"]));
    const batch = generateProposals({
      instruction: "Make this text more concise",
      selectedIds: ["hero-body", "cta-body"],
      viewportScope: "all",
      template: store.getState().template,
    });

    store.dispatch(replaceSelection(["cta-body"]));

    const invalidResult = buildProposalAcceptanceCommand(
      batch,
      batch.items.find((item) => item.elementId === "hero-body") ?? batch.items[0],
      store.getState().template,
      store.getState().editorUI.selectedIds,
    );
    const validResult = buildProposalAcceptanceCommand(
      batch,
      batch.items.find((item) => item.elementId === "cta-body") ?? batch.items[0],
      store.getState().template,
      store.getState().editorUI.selectedIds,
    );

    expect(invalidResult).toMatchObject({ ok: false, status: "invalid" });
    expect(validResult.ok).toBe(true);
  });
});
