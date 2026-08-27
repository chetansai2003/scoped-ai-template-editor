import { describe, expect, it } from "vitest";
import { createAppStore } from "../app/store";
import { selectHistoryForElementScope, selectTotalCommittedHistoryEntries } from "../history/historySelectors";
import { replaceSelection } from "../store/editorUISlice";
import { executeCommand, createRevisionToken } from "./commandExecutor";
import type { EditCommand, JsonValue } from "./commandTypes";
import {
  createAddElementCommand,
  createDuplicateCommand,
  createReorderCommand,
} from "./manualCommandCreators";
import { createRestoreCommand } from "./restoreCommand";

const timestamp = "2026-08-27T09:30:00.000Z";

function commandFromStore(
  store: ReturnType<typeof createAppStore>,
  id: string,
  elementId: string,
  propertyScope: EditCommand["propertyScope"],
  viewportScope: EditCommand["viewportScope"],
  path: string,
  oldValue: JsonValue,
  newValue: JsonValue,
): EditCommand {
  const element = store.getState().template.elements[elementId];

  return {
    id,
    source: "canvas",
    propertyScope,
    viewportScope,
    targets: [
      {
        elementId,
        revisionToken: createRevisionToken(element, viewportScope),
        changes: [{ path, oldValue, newValue }],
      },
    ],
    description: `Edit ${path}`,
    timestamp,
  };
}

describe("command executor", () => {
  it("updates base values, preserves viewport overrides, and writes history", () => {
    const store = createAppStore();
    const beforeOverride = JSON.stringify(
      store.getState().template.elements["hero-heading"].overrides,
    );
    const command = commandFromStore(
      store,
      "cmd-base-heading",
      "hero-heading",
      "content",
      "all",
      "content.text",
      "Premium websites for teams moving faster than their roadmap.",
      "Premium launch pages with a dependable source of truth.",
    );

    const result = store.dispatch(executeCommand(command));
    const updated = store.getState().template.elements["hero-heading"];

    expect(result).toEqual({
      ok: true,
      commandId: "cmd-base-heading",
      affectedElementIds: ["hero-heading"],
    });
    expect(updated.content.text).toBe(
      "Premium launch pages with a dependable source of truth.",
    );
    expect(JSON.stringify(updated.overrides)).toBe(beforeOverride);
    expect(updated.revisions.base).toBe(1);
    expect(updated.revisions.mobile).toBe(0);
    expect(selectTotalCommittedHistoryEntries(store.getState())).toBe(1);
    expect(
      selectHistoryForElementScope(store.getState(), "hero-heading", "all"),
    ).toHaveLength(1);
  });

  it("writes mobile edits only to mobile overrides", () => {
    const store = createAppStore();
    const command = commandFromStore(
      store,
      "cmd-mobile-heading",
      "hero-heading",
      "content",
      "mobile",
      "content.text",
      "Premium websites for fast-moving teams.",
      "Mobile-first launch pages.",
    );

    const result = store.dispatch(executeCommand(command));
    const updated = store.getState().template.elements["hero-heading"];

    expect(result.ok).toBe(true);
    expect(updated.content.text).toBe(
      "Premium websites for teams moving faster than their roadmap.",
    );
    expect(updated.overrides.mobile?.content?.text).toBe(
      "Mobile-first launch pages.",
    );
    expect(updated.overrides.desktop).toBeUndefined();
    expect(updated.overrides.tablet).toBeUndefined();
    expect(updated.revisions).toEqual({
      base: 0,
      desktop: 0,
      tablet: 0,
      mobile: 1,
    });
  });

  it("increments desktop and tablet revision counters independently", () => {
    const store = createAppStore();

    store.dispatch(
      executeCommand(
        commandFromStore(
          store,
          "cmd-desktop-color",
          "hero-heading",
          "style",
          "desktop",
          "style.color",
          "#152028",
          "#111111",
        ),
      ),
    );
    store.dispatch(
      executeCommand(
        commandFromStore(
          store,
          "cmd-tablet-color",
          "hero-heading",
          "style",
          "tablet",
          "style.color",
          "#152028",
          "#222222",
        ),
      ),
    );

    expect(store.getState().template.elements["hero-heading"].revisions).toEqual({
      base: 0,
      desktop: 1,
      tablet: 1,
      mobile: 0,
    });
  });

  it("allows a mobile token after an unrelated desktop edit", () => {
    const store = createAppStore();
    const mobileToken = createRevisionToken(
      store.getState().template.elements["hero-heading"],
      "mobile",
    );

    store.dispatch(
      executeCommand(
        commandFromStore(
          store,
          "cmd-desktop-safe",
          "hero-heading",
          "style",
          "desktop",
          "style.color",
          "#152028",
          "#111111",
        ),
      ),
    );

    const result = store.dispatch(
      executeCommand({
        id: "cmd-mobile-after-desktop",
        source: "canvas",
        propertyScope: "style",
        viewportScope: "mobile",
        targets: [
          {
            elementId: "hero-heading",
            revisionToken: mobileToken,
            changes: [
              {
                path: "style.color",
                oldValue: "#152028",
                newValue: "#123456",
              },
            ],
          },
        ],
        description: "Mobile color after desktop color",
        timestamp,
      }),
    );

    expect(result.ok).toBe(true);
    expect(
      store.getState().template.elements["hero-heading"].overrides.mobile?.style
        ?.color,
    ).toBe("#123456");
  });

  it("rejects an older mobile token after a base change", () => {
    const store = createAppStore();
    const mobileToken = createRevisionToken(
      store.getState().template.elements["hero-heading"],
      "mobile",
    );

    store.dispatch(
      executeCommand(
        commandFromStore(
          store,
          "cmd-base-stales-mobile",
          "hero-heading",
          "content",
          "all",
          "content.text",
          "Premium websites for teams moving faster than their roadmap.",
          "Base revision changed.",
        ),
      ),
    );

    const result = store.dispatch(
      executeCommand({
        id: "cmd-stale-mobile",
        source: "canvas",
        propertyScope: "content",
        viewportScope: "mobile",
        targets: [
          {
            elementId: "hero-heading",
            revisionToken: mobileToken,
            changes: [
              {
                path: "content.text",
                oldValue: "Premium websites for fast-moving teams.",
                newValue: "This should fail.",
              },
            ],
          },
        ],
        description: "Stale mobile edit",
        timestamp,
      }),
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: "STALE_REVISION" },
    });
    expect(store.getState().template.elements["hero-heading"].revisions.mobile).toBe(0);
    expect(selectTotalCommittedHistoryEntries(store.getState())).toBe(1);
  });

  it("compares viewport oldValue with resolved fallback and then writes an override", () => {
    const store = createAppStore();
    const command = commandFromStore(
      store,
      "cmd-mobile-fallback",
      "hero-body",
      "content",
      "mobile",
      "content.text",
      "Northstar Studio designs launch-ready web systems with sharp positioning, responsive components, and calm operational handoff.",
      "A compact mobile explanation.",
    );

    const result = store.dispatch(executeCommand(command));
    const updated = store.getState().template.elements["hero-body"];

    expect(result.ok).toBe(true);
    expect(updated.content.text).toContain("launch-ready web systems");
    expect(updated.overrides.mobile?.content?.text).toBe(
      "A compact mobile explanation.",
    );
  });

  it("rejects stale commands without template or history mutation", () => {
    const store = createAppStore();
    const command = commandFromStore(
      store,
      "cmd-stale-base",
      "hero-heading",
      "content",
      "all",
      "content.text",
      "Premium websites for teams moving faster than their roadmap.",
      "This should not apply.",
    );
    command.targets[0].revisionToken.base = 99;

    const result = store.dispatch(executeCommand(command));

    expect(result).toMatchObject({
      ok: false,
      error: { code: "STALE_REVISION" },
    });
    expect(store.getState().template.elements["hero-heading"].content.text).toBe(
      "Premium websites for teams moving faster than their roadmap.",
    );
    expect(selectTotalCommittedHistoryEntries(store.getState())).toBe(0);
  });

  it("rejects invalid command shapes and unsafe targets", () => {
    const store = createAppStore();

    expect(store.dispatch(executeCommand({ id: "bad", extra: true }))).toMatchObject({
      ok: false,
      error: { code: "INVALID_COMMAND_SCHEMA" },
    });
    expect(
      store.dispatch(
        executeCommand({
          id: "cmd-unknown",
          source: "canvas",
          propertyScope: "content",
          viewportScope: "all",
          targets: [
            {
              elementId: "missing-element",
              revisionToken: { base: 0 },
              changes: [{ path: "content.text", oldValue: "x", newValue: "y" }],
            },
          ],
          description: "Unknown element",
          timestamp,
        }),
      ),
    ).toMatchObject({ ok: false, error: { code: "UNKNOWN_ELEMENT" } });
    expect(selectTotalCommittedHistoryEntries(store.getState())).toBe(0);
  });

  it("rejects forbidden paths, scope mismatches, bad old values, and unsafe values", () => {
    const store = createAppStore();

    expect(
      store.dispatch(
        executeCommand(
          commandFromStore(
            store,
            "cmd-forbidden",
            "hero-heading",
            "content",
            "all",
            "id",
            "hero-heading",
            "new-id",
          ),
        ),
      ),
    ).toMatchObject({ ok: false, error: { code: "FORBIDDEN_PROPERTY_PATH" } });
    expect(
      store.dispatch(
        executeCommand(
          commandFromStore(
            store,
            "cmd-scope",
            "hero-heading",
            "style",
            "all",
            "content.text",
            "Premium websites for teams moving faster than their roadmap.",
            "Wrong scope.",
          ),
        ),
      ),
    ).toMatchObject({ ok: false, error: { code: "PROPERTY_SCOPE_MISMATCH" } });
    expect(
      store.dispatch(
        executeCommand(
          commandFromStore(
            store,
            "cmd-old",
            "hero-heading",
            "content",
            "all",
            "content.text",
            "Wrong old value",
            "New value.",
          ),
        ),
      ),
    ).toMatchObject({ ok: false, error: { code: "OLD_VALUE_MISMATCH" } });
    expect(
      store.dispatch(
        executeCommand(
          commandFromStore(
            store,
            "cmd-unsafe",
            "hero-primary-cta",
            "content",
            "all",
            "content.href",
            "#cta-section",
            "javascript:alert(1)",
          ),
        ),
      ),
    ).toMatchObject({ ok: false, error: { code: "INVALID_VALUE" } });
    expect(selectTotalCommittedHistoryEntries(store.getState())).toBe(0);
  });

  it("rejects duplicate targets atomically", () => {
    const store = createAppStore();
    const element = store.getState().template.elements["hero-heading"];
    const command: EditCommand = {
      id: "cmd-duplicate",
      source: "canvas",
      propertyScope: "content",
      viewportScope: "all",
      targets: [
        {
          elementId: "hero-heading",
          revisionToken: createRevisionToken(element, "all"),
          changes: [
            {
              path: "content.text",
              oldValue: "Premium websites for teams moving faster than their roadmap.",
              newValue: "First.",
            },
          ],
        },
        {
          elementId: "hero-heading",
          revisionToken: createRevisionToken(element, "all"),
          changes: [
            {
              path: "content.text",
              oldValue: "Premium websites for teams moving faster than their roadmap.",
              newValue: "Second.",
            },
          ],
        },
      ],
      description: "Duplicate target",
      timestamp,
    };

    expect(store.dispatch(executeCommand(command))).toMatchObject({
      ok: false,
      error: { code: "DUPLICATE_TARGET" },
    });
    expect(selectTotalCommittedHistoryEntries(store.getState())).toBe(0);
  });

  it("enforces AI proposal-time and current-selection authority", () => {
    const store = createAppStore();
    const aiCommand = commandFromStore(
      store,
      "cmd-ai",
      "hero-heading",
      "content",
      "all",
      "content.text",
      "Premium websites for teams moving faster than their roadmap.",
      "AI authorized edit.",
    );
    aiCommand.source = "ai";
    aiCommand.selectedIdsSnapshot = ["hero-heading"];

    expect(store.dispatch(executeCommand(aiCommand))).toMatchObject({
      ok: false,
      error: { code: "AI_TARGET_UNAUTHORIZED" },
    });

    store.dispatch(replaceSelection(["hero-heading"]));
    expect(store.dispatch(executeCommand(aiCommand))).toMatchObject({
      ok: true,
      commandId: "cmd-ai",
    });

    const missingSnapshot = commandFromStore(
      createAppStore(),
      "cmd-ai-missing-snapshot",
      "hero-heading",
      "content",
      "all",
      "content.text",
      "Premium websites for teams moving faster than their roadmap.",
      "Missing snapshot.",
    );
    missingSnapshot.source = "ai";

    expect(createAppStore().dispatch(executeCommand(missingSnapshot))).toMatchObject({
      ok: false,
      error: { code: "AI_SELECTION_REQUIRED" },
    });
  });

  it("commits valid multi-target commands atomically with separate history entries", () => {
    const store = createAppStore();
    const heading = store.getState().template.elements["hero-heading"];
    const body = store.getState().template.elements["hero-body"];
    const command: EditCommand = {
      id: "cmd-multi",
      source: "canvas",
      propertyScope: "content",
      viewportScope: "all",
      targets: [
        {
          elementId: "hero-heading",
          revisionToken: createRevisionToken(heading, "all"),
          changes: [
            {
              path: "content.text",
              oldValue: "Premium websites for teams moving faster than their roadmap.",
              newValue: "Multi heading.",
            },
          ],
        },
        {
          elementId: "hero-body",
          revisionToken: createRevisionToken(body, "all"),
          changes: [
            {
              path: "content.text",
              oldValue: "Northstar Studio designs launch-ready web systems with sharp positioning, responsive components, and calm operational handoff.",
              newValue: "Multi body.",
            },
          ],
        },
      ],
      description: "Multi edit",
      timestamp,
    };

    expect(store.dispatch(executeCommand(command))).toMatchObject({
      ok: true,
      affectedElementIds: ["hero-heading", "hero-body"],
    });
    expect(selectTotalCommittedHistoryEntries(store.getState())).toBe(2);
    expect(
      selectHistoryForElementScope(store.getState(), "hero-heading", "all"),
    ).toHaveLength(1);
    expect(selectHistoryForElementScope(store.getState(), "hero-body", "all")).toHaveLength(1);
  });

  it("rejects a multi-target command completely when one target is invalid", () => {
    const store = createAppStore();
    const heading = store.getState().template.elements["hero-heading"];
    const body = store.getState().template.elements["hero-body"];
    const command: EditCommand = {
      id: "cmd-multi-invalid",
      source: "canvas",
      propertyScope: "content",
      viewportScope: "all",
      targets: [
        {
          elementId: "hero-heading",
          revisionToken: createRevisionToken(heading, "all"),
          changes: [
            {
              path: "content.text",
              oldValue: "Premium websites for teams moving faster than their roadmap.",
              newValue: "Should not apply.",
            },
          ],
        },
        {
          elementId: "hero-body",
          revisionToken: createRevisionToken(body, "all"),
          changes: [
            {
              path: "content.text",
              oldValue: "Wrong body old value",
              newValue: "Should not apply.",
            },
          ],
        },
      ],
      description: "Invalid multi edit",
      timestamp,
    };

    expect(store.dispatch(executeCommand(command))).toMatchObject({
      ok: false,
      error: { code: "OLD_VALUE_MISMATCH" },
    });
    expect(store.getState().template.elements["hero-heading"].content.text).toBe(
      "Premium websites for teams moving faster than their roadmap.",
    );
    expect(selectTotalCommittedHistoryEntries(store.getState())).toBe(0);
  });

  it("restores through the normal executor and appends history without deleting newer entries", () => {
    const store = createAppStore();

    store.dispatch(
      executeCommand(
        commandFromStore(
          store,
          "cmd-before-restore",
          "hero-heading",
          "content",
          "all",
          "content.text",
          "Premium websites for teams moving faster than their roadmap.",
          "First changed heading.",
        ),
      ),
    );
    const historyEntry = selectHistoryForElementScope(
      store.getState(),
      "hero-heading",
      "all",
    )[0];

    store.dispatch(
      executeCommand(
        commandFromStore(
          store,
          "cmd-newer",
          "hero-heading",
          "content",
          "all",
          "content.text",
          "First changed heading.",
          "Second changed heading.",
        ),
      ),
    );

    const restore = createRestoreCommand(historyEntry, store.getState().template, {
      id: "cmd-restore",
      timestamp: "2026-08-27T09:31:00.000Z",
    });

    expect(restore.ok).toBe(true);

    if (restore.ok) {
      expect(store.dispatch(executeCommand(restore.command))).toMatchObject({
        ok: true,
        commandId: "cmd-restore",
      });
    }

    expect(store.getState().template.elements["hero-heading"].content.text).toBe(
      "Premium websites for teams moving faster than their roadmap.",
    );
    expect(selectHistoryForElementScope(store.getState(), "hero-heading", "all")).toHaveLength(3);
    expect(selectTotalCommittedHistoryEntries(store.getState())).toBe(3);
  });

  it("reorders canonical children through a structural command", () => {
    const store = createAppStore();
    const command = createReorderCommand(
      store.getState().template,
      "features-section",
      "feature-design",
      1,
      "all",
    );

    const result = store.dispatch(executeCommand(command));

    expect(result).toMatchObject({
      ok: true,
      affectedElementIds: ["features-section"],
    });
    expect(store.getState().template.elements["features-section"].children).toEqual([
      "features-heading",
      "feature-design",
      "feature-strategy",
      "feature-automation",
    ]);
    expect(selectTotalCommittedHistoryEntries(store.getState())).toBe(1);
  });

  it("rejects structural commands outside all-viewports scope", () => {
    const store = createAppStore();
    const command = createReorderCommand(
      store.getState().template,
      "features-section",
      "feature-design",
      1,
      "mobile",
    );

    expect(store.dispatch(executeCommand(command))).toMatchObject({
      ok: false,
      error: { code: "STRUCTURE_SCOPE_MISMATCH" },
    });
    expect(store.getState().template.elements["features-section"].children[1]).toBe(
      "feature-strategy",
    );
    expect(selectTotalCommittedHistoryEntries(store.getState())).toBe(0);
  });

  it("adds stable elements through typed structure commands", () => {
    const store = createAppStore();
    const command = createAddElementCommand(
      store.getState().template,
      "feature-strategy",
      "text",
      2,
      "all",
    );

    const result = store.dispatch(executeCommand(command));
    const addedElementId =
      command.operation.type === "add" ? command.operation.element.id : "";

    expect(result.ok).toBe(true);
    expect(addedElementId).toMatch(/^new-text/);
    expect(store.getState().template.elements[addedElementId].parentId).toBe(
      "feature-strategy",
    );
    expect(store.getState().template.elements["feature-strategy"].children).toContain(
      addedElementId,
    );
  });

  it("deep-clones duplicate subtrees with fresh IDs", () => {
    const store = createAppStore();
    const command = createDuplicateCommand(
      store.getState().template,
      "feature-strategy",
      "all",
    );

    expect(command).not.toBeNull();

    if (!command || command.operation.type !== "duplicate") {
      throw new Error("Expected duplicate command");
    }

    const clonedIds = Object.keys(command.operation.clonedElements);
    const result = store.dispatch(executeCommand(command));

    expect(result.ok).toBe(true);
    expect(command.operation.clonedRootId).toMatch(/^feature-strategy-copy/);
    expect(clonedIds).toHaveLength(3);
    clonedIds.forEach((elementId) => {
      expect(store.getState().template.elements[elementId]).toBeDefined();
      expect(elementId).not.toBe("feature-strategy");
      expect(elementId).not.toBe("feature-strategy-title");
      expect(elementId).not.toBe("feature-strategy-body");
    });
    expect(store.getState().template.elements["features-section"].children).toContain(
      command.operation.clonedRootId,
    );
  });

  it("restores structural history through the command executor", () => {
    const store = createAppStore();
    const originalChildren = [
      ...store.getState().template.elements["features-section"].children,
    ];

    store.dispatch(
      executeCommand(
        createReorderCommand(
          store.getState().template,
          "features-section",
          "feature-design",
          1,
          "all",
        ),
      ),
    );

    const historyEntry = selectHistoryForElementScope(
      store.getState(),
      "features-section",
      "all",
    )[0];
    const restore = createRestoreCommand(historyEntry, store.getState().template, {
      id: "cmd-restore-structure",
      timestamp: "2026-08-27T09:32:00.000Z",
    });

    expect(restore.ok).toBe(true);

    if (restore.ok) {
      expect(store.dispatch(executeCommand(restore.command))).toMatchObject({
        ok: true,
        commandId: "cmd-restore-structure",
      });
    }

    expect(store.getState().template.elements["features-section"].children).toEqual(
      originalChildren,
    );
    expect(selectHistoryForElementScope(store.getState(), "features-section", "all")).toHaveLength(2);
  });
});
