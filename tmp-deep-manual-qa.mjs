import { chromium } from "@playwright/test";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1680, height: 1050 } });
const consoleIssues = [];
const results = [];

page.on("console", (message) => {
  if (message.type() === "error" || message.type() === "warning") {
    const text = message.text();
    if (!text.includes("Download the React DevTools")) {
      consoleIssues.push(`${message.type()}: ${text.slice(0, 220)}`);
    }
  }
});
page.on("pageerror", (error) => {
  consoleIssues.push(`pageerror: ${error.message}`);
});

async function record(area, scenario, run) {
  try {
    const detail = await run();
    results.push({ area, scenario, status: "pass", detail });
  } catch (error) {
    results.push({
      area,
      scenario,
      status: "fail",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function fresh() {
  await page.goto("http://localhost:5174/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

async function selectLayer(name) {
  await page.locator(".layer-row", { hasText: name }).first().click();
}

async function applyField(label, value) {
  const field = page.getByLabel(label, { exact: true });
  await field.fill(String(value));
  await page
    .locator(".inspector-field", { has: field })
    .getByRole("button", { name: "Apply" })
    .click();
}

async function applySelect(label, value) {
  const field = page.getByLabel(label, { exact: true });
  await field.selectOption(value);
  await page
    .locator(".inspector-field", { has: field })
    .getByRole("button", { name: "Apply" })
    .click();
}

async function css(elementId, property) {
  return page
    .locator(`[data-element-id="${elementId}"]`)
    .evaluate((element, cssProperty) => getComputedStyle(element).getPropertyValue(cssProperty), property);
}

async function inlineVar(elementId, property) {
  return page
    .locator(`[data-element-id="${elementId}"]`)
    .evaluate((element, cssProperty) => element.style.getPropertyValue(cssProperty), property);
}

await record("Design", "text element repeated color/font/radius/alignment/offset edits", async () => {
  await fresh();
  await selectLayer("Hero Heading");
  await applyField("Text color hex value", "#ff0000");
  await applyField("Text color hex value", "#008000");
  await applyField("Font size", "42");
  await applyField("Font size", "36");
  await applyField("Border radius", "18");
  await applyField("X offset", "24");
  await applyField("Y offset", "12");
  await applySelect("Text alignment", "center");
  return {
    color: await css("hero-heading", "color"),
    fontSize: await css("hero-heading", "font-size"),
    radius: await css("hero-heading", "border-radius"),
    transform: await css("hero-heading", "transform"),
    textAlign: await css("hero-heading", "text-align"),
  };
});

await record("Design", "button element repeated background/color/width/height/padding edits", async () => {
  await fresh();
  await selectLayer("Hero Primary CTA");
  await applyField("Background hex value", "#000000");
  await applyField("Background hex value", "#7c3aed");
  await applyField("Text color hex value", "#ffffff");
  await applyField("Width", "260");
  await applyField("Width", "300");
  await applyField("Height", "58");
  await applyField("Padding", "12 22");
  return {
    background: await css("hero-primary-cta", "background-color"),
    color: await css("hero-primary-cta", "color"),
    width: await css("hero-primary-cta", "width"),
    height: await css("hero-primary-cta", "height"),
    padding: await css("hero-primary-cta", "padding"),
  };
});

await record("Design", "nav element color/background/font/padding works and move controls explained", async () => {
  await fresh();
  await selectLayer("Top Nav");
  await applyField("Background hex value", "#223344");
  await applyField("Text color hex value", "#ffeeaa");
  await applyField("Font size", "22");
  await applyField("Padding", "24 48");
  return {
    background: await css("top-nav", "background-color"),
    brandColor: await page
      .locator('[data-element-id="top-nav"] strong')
      .evaluate((element) => getComputedStyle(element).color),
    fontSize: await css("top-nav", "font-size"),
    padding: await css("top-nav", "padding"),
    moveExplanation: await page.getByRole("status").first().textContent(),
    hasMoveButton: await page.getByRole("button", { name: "Move top-nav" }).count(),
  };
});

await record("Design", "card repeated background/border/radius/shadow/size/gap edits", async () => {
  await fresh();
  await selectLayer("Hero Visual Card");
  await applyField("Background hex value", "#facc15");
  await applyField("Background hex value", "#17202a");
  await applyField("Border color hex value", "#ff0000");
  await applyField("Border radius", "30");
  await applyField("Shadow", "0 10px 20px rgba(0, 0, 0, 0.25)");
  await applyField("Width", "420");
  await applyField("Height", "320");
  await applyField("Gap", "28");
  return {
    background: await css("hero-visual-card", "background-color"),
    borderColor: await css("hero-visual-card", "border-color"),
    radius: await css("hero-visual-card", "border-radius"),
    shadow: await css("hero-visual-card", "box-shadow"),
    width: await css("hero-visual-card", "width"),
    height: await css("hero-visual-card", "height"),
    gap: await css("hero-visual-card", "gap"),
  };
});

await record("Design", "section/container columns/gap/padding/max width edits", async () => {
  await fresh();
  await selectLayer("Stats");
  await applyField("Columns", "2");
  await applyField("Gap", "30");
  await applyField("Padding", "44 40");
  await applyField("Max width", "980");
  return {
    columns: await css("stats-section", "grid-template-columns"),
    gap: await css("stats-section", "gap"),
    padding: await css("stats-section", "padding"),
    maxWidth: await css("stats-section", "max-width"),
  };
});

await record("Design", "visibility can hide and show an element", async () => {
  await fresh();
  await selectLayer("Hero Secondary CTA");
  await page.getByLabel("Visible", { exact: true }).uncheck();
  await page
    .locator(".inspector-field", { has: page.getByLabel("Visible", { exact: true }) })
    .getByRole("button", { name: "Apply" })
    .click();
  const hiddenCount = await page.locator('[data-element-id="hero-secondary-cta"]').count();
  await selectLayer("Hero Secondary CTA");
  await page.getByLabel("Visible", { exact: true }).check();
  await page
    .locator(".inspector-field", { has: page.getByLabel("Visible", { exact: true }) })
    .getByRole("button", { name: "Apply" })
    .click();
  const shownCount = await page.locator('[data-element-id="hero-secondary-cta"]').count();
  return { hiddenCount, shownCount };
});

await record("Drag", "card drag right/down then undo restores original position", async () => {
  await fresh();
  await selectLayer("Hero Visual Card");
  const before = await page.locator('[data-element-id="hero-visual-card"]').boundingBox();
  await page.getByRole("button", { name: "Move hero-visual-card" }).dispatchEvent("pointerdown", {
    clientX: 900,
    clientY: 350,
    pointerId: 1,
    button: 0,
  });
  await page.getByLabel("Selection overlay").dispatchEvent("pointermove", {
    clientX: 960,
    clientY: 400,
    pointerId: 1,
    button: 0,
  });
  await page.getByLabel("Selection overlay").dispatchEvent("pointerup", {
    clientX: 960,
    clientY: 400,
    pointerId: 1,
    button: 0,
  });
  const after = await page.locator('[data-element-id="hero-visual-card"]').boundingBox();
  await page.getByRole("button", { name: "Undo" }).click();
  const undone = await page.locator('[data-element-id="hero-visual-card"]').boundingBox();
  return {
    dragDelta:
      before && after
        ? { x: Math.round(after.x - before.x), y: Math.round(after.y - before.y) }
        : null,
    undoDelta:
      before && undone
        ? { x: Math.round(undone.x - before.x), y: Math.round(undone.y - before.y) }
        : null,
    offsetAfterUndo: {
      x: await inlineVar("hero-visual-card", "--element-offset-x"),
      y: await inlineVar("hero-visual-card", "--element-offset-y"),
    },
  };
});

await record("AI", "supported dark blue proposal applies through accept", async () => {
  await fresh();
  await selectLayer("Hero Heading");
  await page.getByRole("tab", { name: "AI Edit" }).click();
  await page.getByLabel("Instruction").fill("Make the selected element dark blue");
  await page.getByRole("button", { name: "Generate Proposal" }).click();
  const beforeAccept = await page.getByLabel("Generated proposals").textContent();
  await page.getByRole("button", { name: "Accept proposal" }).click();
  return {
    beforeAccept,
    afterColor: await css("hero-heading", "color"),
    status: await page.getByLabel("Generated proposals").textContent(),
  };
});

await record("AI", "unsupported payment request stays non-mutating", async () => {
  await fresh();
  await selectLayer("Hero Heading");
  await page.getByRole("tab", { name: "AI Edit" }).click();
  await page.getByLabel("Instruction").fill("Add a payment system");
  await page.getByRole("button", { name: "Generate Proposal" }).click();
  return {
    message: await page.getByRole("status").last().textContent(),
    proposals: await page.getByLabel("Generated proposals").textContent(),
    heading: await page.locator('[data-element-id="hero-heading"]').textContent(),
  };
});

await record("Code", "selected style JSON color edit via CodeMirror", async () => {
  await fresh();
  await selectLayer("Hero Heading");
  await page.getByRole("tab", { name: "Code" }).click();
  await page.getByLabel("Code scope").selectOption("style");
  const editor = page.locator(".cm-content");
  await editor.click();
  await editor.press("Control+A");
  await editor.press("Backspace");
  await page.keyboard.insertText('{\n  "style": {\n    "color": "#008000"\n  }\n}');
  await page.getByRole("button", { name: "Apply Changes" }).click();
  return {
    statusCount: await page.getByRole("status").count(),
    alert: await page.getByRole("alert").count()
      ? await page.getByRole("alert").first().textContent()
      : null,
    color: await css("hero-heading", "color"),
    panel: (await page.getByRole("tabpanel").textContent()).slice(0, 240),
  };
});

await browser.close();
console.log(JSON.stringify({ results, consoleIssues }, null, 2));
