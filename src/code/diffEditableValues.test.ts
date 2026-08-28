import { describe, expect, it } from "vitest";
import { createAppStore } from "../app/store";
import { executeCommand } from "../commands/commandExecutor";
import { selectHistoryForElementScope, selectTotalCommittedHistoryEntries } from "../history/historySelectors";
import { parseCodeDraft } from "./parseCodeDraft";
import {
  createCodeEditCommand,
  getCodeEditableValues,
} from "./diffEditableValues";

describe("validated code editing", () => {
  it("parses only the focused top-level scope", () => {
    expect(parseCodeDraft('{"style":{"color":"#111111"}}', "style")).toMatchObject({
      ok: true,
    });
    expect(
      parseCodeDraft('{"style":{"color":"#111111"},"content":{}}', "style"),
    ).toMatchObject({
      ok: false,
    });
  });

  it("creates source code history for valid JSON changes", () => {
    const store = createAppStore();
    const template = store.getState().template;
    const commandResult = createCodeEditCommand({
      template,
      elementId: "hero-heading",
      propertyScope: "style",
      viewportScope: "all",
      values: { color: "#111111" },
    });

    expect(commandResult.ok).toBe(true);

    if (!commandResult.ok || !commandResult.command) {
      throw new Error("Expected code command");
    }

    const result = store.dispatch(executeCommand(commandResult.command));

    expect(result.ok).toBe(true);
    expect(store.getState().template.elements["hero-heading"].style.color).toBe(
      "#111111",
    );
    expect(
      selectHistoryForElementScope(store.getState(), "hero-heading", "all")[0].source,
    ).toBe("code");
  });

  it("rejects protected, unknown, and invalid code fields before dispatch", () => {
    const store = createAppStore();
    const template = store.getState().template;

    expect(
      createCodeEditCommand({
        template,
        elementId: "hero-heading",
        propertyScope: "style",
        viewportScope: "all",
        values: { id: "new-id" },
      }),
    ).toMatchObject({ ok: false });
    expect(
      createCodeEditCommand({
        template,
        elementId: "hero-heading",
        propertyScope: "style",
        viewportScope: "all",
        values: { madeUp: "nope" },
      }),
    ).toMatchObject({ ok: false });
    expect(
      createCodeEditCommand({
        template,
        elementId: "hero-heading",
        propertyScope: "style",
        viewportScope: "all",
        values: { color: "url(javascript:bad)" },
      }),
    ).toMatchObject({ ok: false });
    expect(selectTotalCommittedHistoryEntries(store.getState())).toBe(0);
  });

  it("does not create a command for unchanged valid JSON", () => {
    const store = createAppStore();
    const element = store.getState().template.elements["hero-heading"];
    const values = getCodeEditableValues(element, "style", "all");

    expect(
      createCodeEditCommand({
        template: store.getState().template,
        elementId: "hero-heading",
        propertyScope: "style",
        viewportScope: "all",
        values,
      }),
    ).toEqual({ ok: true, command: null });
  });

  it("mobile code edits compare against resolved fallback and write only mobile overrides", () => {
    const store = createAppStore();
    const commandResult = createCodeEditCommand({
      template: store.getState().template,
      elementId: "hero-body",
      propertyScope: "content",
      viewportScope: "mobile",
      values: { text: "Compact mobile body." },
    });

    expect(commandResult.ok).toBe(true);

    if (!commandResult.ok || !commandResult.command) {
      throw new Error("Expected mobile code command");
    }

    expect(commandResult.command.targets[0].changes[0].oldValue).toBe(
      "Northstar Studio designs launch-ready web systems with sharp positioning, responsive components, and calm operational handoff.",
    );

    store.dispatch(executeCommand(commandResult.command));

    expect(store.getState().template.elements["hero-body"].content.text).toContain(
      "launch-ready web systems",
    );
    expect(
      store.getState().template.elements["hero-body"].overrides.mobile?.content?.text,
    ).toBe("Compact mobile body.");
  });
});
