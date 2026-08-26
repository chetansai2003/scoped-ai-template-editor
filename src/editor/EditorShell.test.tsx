import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import { store } from "../app/store";
import { EditorShell } from "./EditorShell";

function renderEditor() {
  return render(
    <Provider store={store}>
      <EditorShell />
    </Provider>,
  );
}

describe("EditorShell", () => {
  it("renders the Step 1 shell regions", () => {
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
  });

  it("updates the canvas label when the edit scope changes", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.selectOptions(screen.getByLabelText(/scope/i), "mobile");

    expect(screen.getByText("mobile only")).toBeInTheDocument();
  });

  it("selects a stable ID when a layer is clicked", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole("button", { name: /Hero Heading/ }));

    const summary = screen.getByText("Selected stable IDs").parentElement;
    expect(summary).not.toBeNull();
    expect(within(summary as HTMLElement).getByText("hero.heading")).toBeInTheDocument();
  });

  it("supports modifier-click multi-selection", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole("button", { name: /Hero Heading/ }));
    await user.keyboard("{Control>}");
    await user.click(screen.getByRole("button", { name: /Primary Button/ }));
    await user.keyboard("{/Control}");

    const summary = screen.getByText("Selected stable IDs").parentElement;
    expect(summary).not.toBeNull();
    expect(within(summary as HTMLElement).getByText("hero.heading")).toBeInTheDocument();
    expect(
      within(summary as HTMLElement).getByText("hero.primaryButton"),
    ).toBeInTheDocument();
  });

  it("clears selection with Escape from the layer panel", async () => {
    const user = userEvent.setup();
    renderEditor();

    const layer = screen.getByRole("button", { name: /Hero Heading/ });
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
      "Per-element and per-viewport recovery will be implemented",
    );
  });

  it("does not present placeholder AI behavior as functional", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole("tab", { name: "AI Edit" }));

    expect(screen.getByRole("tabpanel")).toHaveTextContent(
      "intentionally non-functional in Step 1",
    );
    expect(screen.queryByRole("button", { name: /generate/i })).not.toBeInTheDocument();
  });
});
