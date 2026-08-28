import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import { createAppStore } from "../app/store";
import { selectTotalCommittedHistoryEntries } from "../history/historySelectors";
import { EditorShell } from "./EditorShell";

function renderEditor() {
  const store = createAppStore();

  return {
    store,
    ...render(
    <Provider store={store}>
      <EditorShell />
    </Provider>,
    ),
  };
}

describe("EditorShell", () => {
  it("renders the editor shell regions", () => {
    renderEditor();

    expect(screen.getByRole("banner", { name: "Editor toolbar" })).toHaveTextContent(
      "Northstar Studio",
    );
    expect(screen.getByLabelText("Layers panel")).toBeInTheDocument();
    expect(screen.getByRole("main", { name: "Website canvas" })).toBeInTheDocument();
    expect(screen.getByLabelText("Right panel")).toBeInTheDocument();
    expect(screen.getByLabelText("AI proposal drawer")).toBeInTheDocument();
  });

  it("uses desktop as the default viewport", () => {
    renderEditor();

    expect(screen.getByRole("button", { name: "Desktop" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("1440 px")).toBeInTheDocument();
    expect(
      screen.getByLabelText("desktop preview").querySelector(".canvas-device"),
    ).toHaveAttribute("data-intrinsic-width", "1440");
  });

  it("updates the canvas label when the viewport changes", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole("button", { name: "Tablet" }));

    expect(screen.getByRole("button", { name: "Tablet" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("768 px")).toBeInTheDocument();
    expect(
      screen.getByLabelText("tablet preview").querySelector(".canvas-device"),
    ).toHaveAttribute("data-intrinsic-width", "768");
  });

  it("updates the canvas label when the mobile viewport is selected", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole("button", { name: "Mobile" }));

    expect(screen.getByText("375 px")).toBeInTheDocument();
    expect(
      screen.getByLabelText("mobile preview").querySelector(".canvas-device"),
    ).toHaveAttribute("data-intrinsic-width", "375");
  });

  it("updates the canvas label when the edit scope changes", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.selectOptions(screen.getByLabelText(/scope/i), "mobile");

    expect(screen.getByText("mobile only")).toBeInTheDocument();
  });

  it("renders real Northstar Studio content from canonical state", () => {
    renderEditor();

    expect(
      screen.getByRole("heading", {
        name: "Premium websites for teams moving faster than their roadmap.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Positioning sprint")).toBeInTheDocument();
    expect(screen.getByText("Start the sprint")).toBeInTheDocument();
    expect(
      screen.queryByText("Template rendering will be implemented in Step 2"),
    ).not.toBeInTheDocument();
  });

  it("uses canonical IDs from the template model in the layer panel", () => {
    renderEditor();

    expect(
      screen.getByRole("button", { name: "Hero Heading, hero-heading" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Feature Strategy, feature-strategy" }),
    ).toBeInTheDocument();
  });

  it("selects a canonical stable ID when a layer is clicked", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(
      screen.getByRole("button", { name: "Hero Heading, hero-heading" }),
    );

    const summary = screen.getByText("Selected stable IDs").parentElement;
    expect(summary).not.toBeNull();
    expect(within(summary as HTMLElement).getByText("hero-heading")).toBeInTheDocument();
  });

  it("supports modifier-click multi-selection", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(
      screen.getByRole("button", { name: "Hero Heading, hero-heading" }),
    );
    await user.keyboard("{Control>}");
    await user.click(
      screen.getByRole("button", { name: "Hero Primary CTA, hero-primary-cta" }),
    );
    await user.keyboard("{/Control}");

    const summary = screen.getByText("Selected stable IDs").parentElement;
    expect(summary).not.toBeNull();
    expect(within(summary as HTMLElement).getByText("hero-heading")).toBeInTheDocument();
    expect(
      within(summary as HTMLElement).getByText("hero-primary-cta"),
    ).toBeInTheDocument();
  });

  it("highlights the selected element in the renderer", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(
      screen.getByRole("button", { name: "Hero Heading, hero-heading" }),
    );

    expect(document.querySelector('[data-element-id="hero-heading"]')).toHaveAttribute(
      "data-selected",
      "true",
    );
  });

  it("clears selection with Escape from the layer panel", async () => {
    const user = userEvent.setup();
    renderEditor();

    const layer = screen.getByRole("button", {
      name: "Hero Heading, hero-heading",
    });
    await user.click(layer);
    expect(layer).toHaveAttribute("aria-pressed", "true");

    await user.keyboard("{Escape}");

    expect(screen.getByText("No selection")).toBeInTheDocument();
  });

  it("switches right-panel tabs", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole("tab", { name: "History" }));

    expect(screen.getByRole("tabpanel")).toHaveTextContent(
      "Select an element to view its history.",
    );
  });

  it("shows code editing empty and multi-selection states", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole("tab", { name: "Code" }));

    expect(screen.getByRole("tabpanel")).toHaveTextContent(
      "Select one element to edit its focused JSON.",
    );

    await user.click(
      screen.getByRole("button", { name: "Hero Heading, hero-heading" }),
    );
    await user.keyboard("{Control>}");
    await user.click(
      screen.getByRole("button", { name: "Hero Body, hero-body" }),
    );
    await user.keyboard("{/Control}");

    expect(screen.getByRole("tabpanel")).toHaveTextContent(
      "Code editing supports one selected element at a time.",
    );
  });

  it("shows selected-element CodeMirror editing controls", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(
      screen.getByRole("button", { name: "Hero Heading, hero-heading" }),
    );
    await user.click(screen.getByRole("tab", { name: "Code" }));

    expect(screen.getByRole("tabpanel")).toHaveTextContent("Editing Hero Heading");
    expect(screen.getByLabelText("Code scope")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply Changes" })).toBeInTheDocument();
    expect(document.querySelector(".cm-editor")).toBeInTheDocument();
  });

  it("presents deterministic AI generation without auto-applying", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole("tab", { name: "AI Edit" }));

    expect(screen.getByRole("tabpanel")).toHaveTextContent(
      "Deterministic local scenarios",
    );
    expect(screen.getByRole("button", { name: "Generate Proposal" })).toBeDisabled();
  });

  it("keeps the proposal drawer non-mutating and Step 5 scoped", () => {
    renderEditor();

    expect(screen.getByLabelText("AI proposal drawer")).toHaveTextContent(
      "AI proposals will appear here in Step 5",
    );
    expect(screen.getByLabelText("AI proposal drawer")).toHaveTextContent(
      "never modify the template before acceptance",
    );
  });

  it("selects the exact canvas element without selecting its parent", async () => {
    const user = userEvent.setup();
    renderEditor();

    const heading = document.querySelector('[data-element-id="hero-heading"]');

    expect(heading).toBeInstanceOf(HTMLElement);

    await user.click(heading as HTMLElement);

    const summary = screen.getByText("Selected stable IDs").parentElement;
    expect(summary).not.toBeNull();
    expect(within(summary as HTMLElement).getByText("hero-heading")).toBeInTheDocument();
    expect(
      within(summary as HTMLElement).queryByText("hero-copy-stack"),
    ).not.toBeInTheDocument();
  });

  it("selects a focused canvas element with Enter", async () => {
    const user = userEvent.setup();
    renderEditor();

    const heading = screen.getByRole("heading", {
      name: "Premium websites for teams moving faster than their roadmap.",
    });

    heading.focus();
    await user.keyboard("{Enter}");

    expect(document.querySelector('[data-element-id="hero-heading"]')).toHaveAttribute(
      "data-selected",
      "true",
    );
  });

  it("commits inline text edits through history and cancels with Escape", () => {
    const { store } = renderEditor();

    fireEvent.click(
      screen.getByRole("button", { name: "Hero Heading, hero-heading" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit text inline" }));

    const draft = screen.getByLabelText("Inline text draft");
    fireEvent.change(draft, {
      target: { value: "A manually edited launch headline." },
    });
    fireEvent.keyDown(draft, { key: "Enter" });

    expect(store.getState().template.elements["hero-heading"].content.text).toBe(
      "A manually edited launch headline.",
    );
    expect(selectTotalCommittedHistoryEntries(store.getState())).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: "Edit text inline" }));
    fireEvent.change(screen.getByLabelText("Inline text draft"), {
      target: { value: "Canceled text" },
    });
    fireEvent.keyDown(screen.getByLabelText("Inline text draft"), { key: "Escape" });

    expect(store.getState().template.elements["hero-heading"].content.text).toBe(
      "A manually edited launch headline.",
    );
    expect(selectTotalCommittedHistoryEntries(store.getState())).toBe(1);
  });

  it("applies inspector style edits through the command executor", async () => {
    const user = userEvent.setup();
    const { store } = renderEditor();

    await user.click(
      screen.getByRole("button", { name: "Hero Heading, hero-heading" }),
    );

    const colorInput = screen.getByLabelText("Text color");
    fireEvent.change(colorInput, { target: { value: "#111111" } });
    const field = colorInput.closest(".inspector-field");

    expect(field).not.toBeNull();

    await user.click(within(field as HTMLElement).getByRole("button", { name: "Apply" }));

    expect(store.getState().template.elements["hero-heading"].style.color).toBe(
      "#111111",
    );
    expect(selectTotalCommittedHistoryEntries(store.getState())).toBe(1);
  });

  it("previews inspector edits before committing on blur", () => {
    const { store } = renderEditor();

    fireEvent.click(
      screen.getByRole("button", { name: "Hero Heading, hero-heading" }),
    );

    const colorInput = screen.getByLabelText("Text color hex value");
    fireEvent.change(colorInput, { target: { value: "#224466" } });

    const renderedHeading = document.querySelector<HTMLElement>(
      '[data-element-id="hero-heading"]',
    );

    expect(renderedHeading?.style.getPropertyValue("--element-color")).toBe(
      "#224466",
    );
    expect(store.getState().template.elements["hero-heading"].style.color).toBe(
      "#152028",
    );
    expect(selectTotalCommittedHistoryEntries(store.getState())).toBe(0);

    fireEvent.blur(colorInput);

    expect(store.getState().template.elements["hero-heading"].style.color).toBe(
      "#224466",
    );
    expect(selectTotalCommittedHistoryEntries(store.getState())).toBe(1);
  });

  it("shows field errors for invalid inspector values without committing", () => {
    const { store } = renderEditor();

    fireEvent.click(
      screen.getByRole("button", { name: "Hero Heading, hero-heading" }),
    );

    const radiusInput = screen.getByLabelText("Border radius");
    fireEvent.change(radiusInput, { target: { value: "not-a-radius" } });
    fireEvent.blur(radiusInput);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Radius must be a safe CSS dimension.",
    );
    expect(store.getState().template.elements["hero-heading"].style.radius).toBeUndefined();
    expect(selectTotalCommittedHistoryEntries(store.getState())).toBe(0);
  });

  it("applies inspector radius, padding, and alignment only to the selected element", async () => {
    const user = userEvent.setup();
    const { store } = renderEditor();

    await user.click(
      screen.getByRole("button", { name: "Hero Heading, hero-heading" }),
    );

    const radiusInput = screen.getByLabelText("Border radius");
    fireEvent.change(radiusInput, { target: { value: "18px" } });
    const radiusField = radiusInput.closest(".inspector-field");
    expect(radiusField).not.toBeNull();
    await user.click(
      within(radiusField as HTMLElement).getByRole("button", { name: "Apply" }),
    );

    const paddingInput = screen.getByLabelText("Padding");
    fireEvent.change(paddingInput, { target: { value: "8px 12px" } });
    const paddingField = paddingInput.closest(".inspector-field");
    expect(paddingField).not.toBeNull();
    await user.click(
      within(paddingField as HTMLElement).getByRole("button", { name: "Apply" }),
    );

    await user.selectOptions(screen.getByLabelText("Text alignment"), "center");
    const alignmentField = screen.getByLabelText("Text alignment").closest(".inspector-field");
    expect(alignmentField).not.toBeNull();
    await user.click(
      within(alignmentField as HTMLElement).getByRole("button", { name: "Apply" }),
    );

    const heading = store.getState().template.elements["hero-heading"];
    const body = store.getState().template.elements["hero-body"];
    const renderedHeading = document.querySelector<HTMLElement>(
      '[data-element-id="hero-heading"]',
    );

    expect(heading.style.radius).toBe("18px");
    expect(heading.layout.padding).toBe("8px 12px");
    expect(heading.style.textAlign).toBe("center");
    expect(body.style.textAlign).toBeUndefined();
    expect(renderedHeading?.style.getPropertyValue("--element-radius")).toBe("18px");
    expect(renderedHeading?.style.getPropertyValue("--element-padding")).toBe(
      "8px 12px",
    );
  });

  it("does not show inherited text alignment controls for section selections", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole("button", { name: "Hero, hero-section" }));

    expect(screen.queryByLabelText("Text alignment")).not.toBeInTheDocument();
  });

  it("applies nav colors through the inspector", async () => {
    const user = userEvent.setup();
    const { store } = renderEditor();

    await user.click(screen.getByRole("button", { name: "Top Nav, top-nav" }));

    const backgroundHex = screen.getByLabelText("Background hex value");
    fireEvent.change(backgroundHex, { target: { value: "#223344" } });
    const backgroundField = backgroundHex.closest(".inspector-field");
    expect(backgroundField).not.toBeNull();
    await user.click(
      within(backgroundField as HTMLElement).getByRole("button", { name: "Apply" }),
    );

    const colorHex = screen.getByLabelText("Text color hex value");
    fireEvent.change(colorHex, { target: { value: "#ffeeaa" } });
    const colorField = colorHex.closest(".inspector-field");
    expect(colorField).not.toBeNull();
    await user.click(
      within(colorField as HTMLElement).getByRole("button", { name: "Apply" }),
    );

    const nav = document.querySelector<HTMLElement>('[data-element-id="top-nav"]');

    expect(store.getState().template.elements["top-nav"].style.background).toBe(
      "#223344",
    );
    expect(store.getState().template.elements["top-nav"].style.color).toBe("#ffeeaa");
    expect(nav?.style.getPropertyValue("--element-background")).toBe("#223344");
    expect(nav?.style.getPropertyValue("--element-color")).toBe("#ffeeaa");
  });

  it("shows viewport impact and commits mobile-only visibility as an override", async () => {
    const user = userEvent.setup();
    const { store } = renderEditor();

    await user.click(
      screen.getByRole("button", { name: "Feature Strategy, feature-strategy" }),
    );
    await user.selectOptions(screen.getByLabelText(/scope/i), "mobile");

    expect(screen.getByLabelText("Viewport impact")).toHaveTextContent("Affected");
    expect(screen.getAllByText("Protected")).toHaveLength(2);

    const visibleInput = screen.getByLabelText("Visible");
    await user.click(visibleInput);
    const field = visibleInput.closest(".inspector-field");

    expect(field).not.toBeNull();

    await user.click(within(field as HTMLElement).getByRole("button", { name: "Apply" }));

    expect(
      store.getState().template.elements["feature-strategy"].overrides.mobile?.layout
        ?.visible,
    ).toBe(false);
    expect(store.getState().template.elements["feature-strategy"].layout.visible).toBeUndefined();
  });

  it("keeps resize movement local until pointer release creates one history entry", () => {
    const { store } = renderEditor();

    fireEvent.click(
      screen.getByRole("button", { name: "Hero Visual Card, hero-visual-card" }),
    );

    const handle = screen.getByRole("button", {
      name: "Resize hero-visual-card",
    });
    fireEvent.pointerDown(handle, { clientX: 0, clientY: 0 });
    fireEvent.pointerMove(screen.getByLabelText("Selection overlay"), {
      clientX: 60,
      clientY: 30,
    });

    expect(selectTotalCommittedHistoryEntries(store.getState())).toBe(0);

    fireEvent.pointerUp(screen.getByLabelText("Selection overlay"), {
      clientX: 60,
      clientY: 30,
    });

    expect(selectTotalCommittedHistoryEntries(store.getState())).toBe(1);
    expect(store.getState().template.elements["hero-visual-card"].layout.width).toBeGreaterThan(160);
    expect(
      store.getState().template.elements["hero-visual-card"].layout.offsetX,
    ).toBeUndefined();
  });

  it("keeps canvas movement local until pointer release creates one offset history entry", () => {
    const { store } = renderEditor();

    fireEvent.click(
      screen.getByRole("button", { name: "Hero Visual Card, hero-visual-card" }),
    );

    const moveHandle = screen.getByRole("button", {
      name: "Move hero-visual-card",
    });
    fireEvent.pointerDown(moveHandle, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(screen.getByLabelText("Selection overlay"), {
      clientX: 70,
      clientY: 40,
    });

    expect(selectTotalCommittedHistoryEntries(store.getState())).toBe(0);

    fireEvent.pointerUp(screen.getByLabelText("Selection overlay"), {
      clientX: 70,
      clientY: 40,
    });

    const movedLayout = store.getState().template.elements["hero-visual-card"].layout;

    expect(selectTotalCommittedHistoryEntries(store.getState())).toBe(1);
    expect(movedLayout.offsetX).toBeGreaterThan(0);
    expect(movedLayout.offsetY).toBeGreaterThan(0);
    expect(movedLayout.width).toBeUndefined();
  });

  it("does not start canvas movement from the normal selection outline", () => {
    const { store } = renderEditor();

    fireEvent.click(
      screen.getByRole("button", { name: "Hero Visual Card, hero-visual-card" }),
    );

    const selectionBox = screen.getByRole("group", {
      name: "Move or resize hero-visual-card",
    });
    fireEvent.pointerDown(selectionBox, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(screen.getByLabelText("Selection overlay"), {
      clientX: 70,
      clientY: 40,
    });
    fireEvent.pointerUp(screen.getByLabelText("Selection overlay"), {
      clientX: 70,
      clientY: 40,
    });

    expect(selectTotalCommittedHistoryEntries(store.getState())).toBe(0);
    expect(
      store.getState().template.elements["hero-visual-card"].layout.offsetX,
    ).toBeUndefined();
  });

  it("undoes the latest design edit from the toolbar", async () => {
    const user = userEvent.setup();
    const { store } = renderEditor();

    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();

    await user.click(
      screen.getByRole("button", { name: "Hero Heading, hero-heading" }),
    );

    const colorInput = screen.getByLabelText("Text color hex value");
    fireEvent.change(colorInput, { target: { value: "#224466" } });
    fireEvent.blur(colorInput);

    expect(store.getState().template.elements["hero-heading"].style.color).toBe(
      "#224466",
    );
    expect(screen.getByRole("button", { name: "Undo" })).not.toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Undo" }));

    expect(store.getState().template.elements["hero-heading"].style.color).toBe(
      "#152028",
    );
    expect(store.getState().history.undoneCommandIds).toHaveLength(1);
  });
});
