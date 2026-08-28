# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: editor.spec.ts >> Scoped AI Template Editor reviewer journeys >> design inspector shows natural size and applies visual dimensions
- Location: tests\e2e\editor.spec.ts:83:3

# Error details

```
Error: expect(locator).toHaveCSS(expected) failed

Locator:  locator('[data-element-id="hero-secondary-cta"]')
Expected: "72px"
Received: "154px"
Timeout:  5000ms

Call log:
  - Expect "toHaveCSS" with timeout 5000ms
  - waiting for locator('[data-element-id="hero-secondary-cta"]')
    13 × locator resolved to <a tabindex="0" data-selected="true" href="#process-section" data-element-id="hero-secondary-cta" data-element-name="Hero Secondary CTA" title="Hero Secondary CTA, hero-secondary-cta" class="rendered-element rendered-button rendered-variant-secondary-button rendered-selected">See process</a>
       - unexpected value "154px"

```

```yaml
- link "See process hero-secondary-cta":
  - /url: "#process-section"
```

# Test source

```ts
  12  |     const layerItem = page.locator('.layer-row', { hasText: 'Hero Heading' });
  13  |     await layerItem.click();
  14  | 
  15  |     // 2. Edit through the Design inspector. Inspector drafts commit only on Apply.
  16  |     await page.getByRole('tab', { name: 'Design' }).click();
  17  |     await applyTextDraft(page, 'Updated Heading E2E');
  18  | 
  19  |     // 3. Verify it changed on canvas.
  20  |     await expect(page.locator('.editor-main')).toContainText('Updated Heading E2E');
  21  | 
  22  |     // 4. Reload page
  23  |     await page.reload();
  24  | 
  25  |     // 5. Verify it's still there
  26  |     await expect(page.locator('.editor-main')).toContainText('Updated Heading E2E');
  27  |   });
  28  | 
  29  |   test('reset should clear state and restore original', async ({ page }) => {
  30  |     // 1. Make an edit
  31  |     const layerItem = page.locator('.layer-row', { hasText: 'Hero Heading' });
  32  |     await layerItem.click();
  33  | 
  34  |     await applyTextDraft(page, 'Temporary Text');
  35  |     await expect(page.locator('.editor-main')).toContainText('Temporary Text');
  36  | 
  37  |     // 2. Open Reset dialog
  38  |     await page.getByRole('button', { name: 'Reset' }).click();
  39  |     
  40  |     // 3. Cancel first
  41  |     await page.getByRole('button', { name: 'Cancel' }).click();
  42  |     // Verify still there
  43  |     await expect(page.locator('.editor-main')).toContainText('Temporary Text');
  44  |     
  45  |     // 4. Confirm Reset
  46  |     await page.getByRole('button', { name: 'Reset' }).click();
  47  |     await page.getByRole('button', { name: 'Confirm Reset' }).click();
  48  |     
  49  |     // 5. Verify original text is back (assumes original was "Premium websites for teams moving faster")
  50  |     await expect(page.locator('.editor-main')).not.toContainText('Temporary Text');
  51  |     
  52  |     // 6. Reload and verify still original
  53  |     await page.reload();
  54  |     await expect(page.locator('.editor-main')).not.toContainText('Temporary Text');
  55  |   });
  56  |   
  57  |   test('history panel restores state', async ({ page }) => {
  58  |     // 1. Select element
  59  |     const layerItem = page.locator('.layer-row', { hasText: 'Hero Heading' });
  60  |     await layerItem.click();
  61  | 
  62  |     // 2. Make an edit
  63  |     await applyTextDraft(page, 'History Test 1');
  64  | 
  65  |     // 3. Make another edit
  66  |     await applyTextDraft(page, 'History Test 2');
  67  | 
  68  |     // 4. Switch to history tab
  69  |     await page.getByRole('tab', { name: 'History' }).click();
  70  |     
  71  |     // 5. Click restore on the first entry (which should take it back to 'History Test 1' or original)
  72  |     // We have 2 entries now. The entries list is newest first or oldest first.
  73  |     // Let's just click the "Restore" button of the first one that appears.
  74  |     const restoreButtons = page.getByRole('button', { name: /Restore/ });
  75  |     await restoreButtons.last().click();
  76  | 
  77  |     // 6. Verify canvas updated
  78  |     // The canvas should now contain the state before the second edit.
  79  |     // It depends on the exact order, but we can verify it doesn't say "History Test 2" anymore.
  80  |     await expect(page.locator('.editor-main')).not.toContainText('History Test 2');
  81  |   });
  82  | 
  83  |   test('design inspector shows natural size and applies visual dimensions', async ({ page }) => {
  84  |     await page.locator('.layer-row', { hasText: 'Hero Secondary CTA' }).click();
  85  | 
  86  |     const sizeReadout = page.getByLabel('Rendered element size');
  87  |     const widthField = page.getByRole('spinbutton', { name: 'Width', exact: true });
  88  |     const heightField = page.getByRole('spinbutton', { name: 'Height', exact: true });
  89  |     const renderedButton = page.locator('[data-element-id="hero-secondary-cta"]');
  90  | 
  91  |     await expect(sizeReadout).toContainText(/\d+ x \d+ px/);
  92  |     await expect(widthField).not.toHaveValue('');
  93  |     await expect(heightField).not.toHaveValue('');
  94  | 
  95  |     await widthField.fill('280');
  96  |     await applyInspectorField(widthField);
  97  |     await heightField.fill('72');
  98  |     await expect(heightField).toHaveValue('72');
  99  |     await expect.poll(() =>
  100 |       renderedButton.evaluate((element) =>
  101 |         element.style.getPropertyValue('--element-height'),
  102 |       ),
  103 |     ).toBe('72px');
  104 |     await applyInspectorField(heightField);
  105 | 
  106 |     await expect(renderedButton).toHaveCSS('width', '280px');
  107 |     await expect.poll(() =>
  108 |       renderedButton.evaluate((element) =>
  109 |         element.style.getPropertyValue('--element-height'),
  110 |       ),
  111 |     ).toBe('72px');
> 112 |     await expect(renderedButton).toHaveCSS('height', '72px');
      |                                  ^ Error: expect(locator).toHaveCSS(expected) failed
  113 | 
  114 |     const radiusField = page.getByLabel('Border radius');
  115 |     await radiusField.fill('16');
  116 |     await applyInspectorField(radiusField);
  117 |     await expect(renderedButton).toHaveCSS('border-radius', '16px');
  118 |   });
  119 | });
  120 | 
  121 | async function applyTextDraft(page: Page, text: string) {
  122 |   const textField = page.locator('#inspector-content-text');
  123 |   await textField.fill(text);
  124 |   await textField
  125 |     .locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " inspector-field ")]')
  126 |     .getByRole('button', { name: 'Apply' })
  127 |     .click();
  128 | }
  129 | 
  130 | async function applyInspectorField(field: Locator) {
  131 |   await field
  132 |     .locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " inspector-field ")]')
  133 |     .getByRole('button', { name: 'Apply' })
  134 |     .click();
  135 | }
  136 | 
```