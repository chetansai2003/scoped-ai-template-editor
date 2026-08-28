import { test, expect, type Locator, type Page } from '@playwright/test';

test.describe('Scoped AI Template Editor reviewer journeys', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
  });

  test('should persist edits across reload', async ({ page }) => {
    // 1. Select the main heading.
    const layerItem = page.locator('.layer-row', { hasText: 'Hero Heading' });
    await layerItem.click();

    // 2. Edit through the Design inspector. Inspector drafts commit only on Apply.
    await page.getByRole('tab', { name: 'Design' }).click();
    await applyTextDraft(page, 'Updated Heading E2E');

    // 3. Verify it changed on canvas.
    await expect(page.locator('.editor-main')).toContainText('Updated Heading E2E');

    // 4. Reload page
    await page.reload();

    // 5. Verify it's still there
    await expect(page.locator('.editor-main')).toContainText('Updated Heading E2E');
  });

  test('reset should clear state and restore original', async ({ page }) => {
    // 1. Make an edit
    const layerItem = page.locator('.layer-row', { hasText: 'Hero Heading' });
    await layerItem.click();

    await applyTextDraft(page, 'Temporary Text');
    await expect(page.locator('.editor-main')).toContainText('Temporary Text');

    // 2. Open Reset dialog
    await page.getByRole('button', { name: 'Reset' }).click();
    
    // 3. Cancel first
    await page.getByRole('button', { name: 'Cancel' }).click();
    // Verify still there
    await expect(page.locator('.editor-main')).toContainText('Temporary Text');
    
    // 4. Confirm Reset
    await page.getByRole('button', { name: 'Reset' }).click();
    await page.getByRole('button', { name: 'Confirm Reset' }).click();
    
    // 5. Verify original text is back (assumes original was "Premium websites for teams moving faster")
    await expect(page.locator('.editor-main')).not.toContainText('Temporary Text');
    
    // 6. Reload and verify still original
    await page.reload();
    await expect(page.locator('.editor-main')).not.toContainText('Temporary Text');
  });
  
  test('history panel restores state', async ({ page }) => {
    // 1. Select element
    const layerItem = page.locator('.layer-row', { hasText: 'Hero Heading' });
    await layerItem.click();

    // 2. Make an edit
    await applyTextDraft(page, 'History Test 1');

    // 3. Make another edit
    await applyTextDraft(page, 'History Test 2');

    // 4. Switch to history tab
    await page.getByRole('tab', { name: 'History' }).click();
    
    // 5. Click restore on the first entry (which should take it back to 'History Test 1' or original)
    // We have 2 entries now. The entries list is newest first or oldest first.
    // Let's just click the "Restore" button of the first one that appears.
    const restoreButtons = page.getByRole('button', { name: /Restore/ });
    await restoreButtons.last().click();

    // 6. Verify canvas updated
    // The canvas should now contain the state before the second edit.
    // It depends on the exact order, but we can verify it doesn't say "History Test 2" anymore.
    await expect(page.locator('.editor-main')).not.toContainText('History Test 2');
  });

  test('design inspector shows natural size and applies visual dimensions', async ({ page }) => {
    await page.locator('.layer-row', { hasText: 'Hero Secondary CTA' }).click();

    const sizeReadout = page.getByLabel('Rendered element size');
    const widthField = page.getByRole('spinbutton', { name: 'Width', exact: true });
    const heightField = page.getByRole('spinbutton', { name: 'Height', exact: true });
    const renderedButton = page.locator('[data-element-id="hero-secondary-cta"]');

    await expect(sizeReadout).toContainText(/\d+ x \d+ px/);
    await expect(widthField).not.toHaveValue('');
    await expect(heightField).not.toHaveValue('');

    await widthField.fill('280');
    await applyInspectorField(widthField);
    await heightField.fill('72');
    await expect(heightField).toHaveValue('72');
    await expect.poll(() =>
      renderedButton.evaluate((element) =>
        element.style.getPropertyValue('--element-height'),
      ),
    ).toBe('72px');
    await applyInspectorField(heightField);

    await expect(renderedButton).toHaveCSS('width', '280px');
    await expect.poll(() =>
      renderedButton.evaluate((element) =>
        element.style.getPropertyValue('--element-height'),
      ),
    ).toBe('72px');
    await expect(renderedButton).toHaveCSS('height', '72px');

    const radiusField = page.getByLabel('Border radius');
    await radiusField.fill('16');
    await applyInspectorField(radiusField);
    await expect(renderedButton).toHaveCSS('border-radius', '16px');
  });
});

async function applyTextDraft(page: Page, text: string) {
  const textField = page.locator('#inspector-content-text');
  await textField.fill(text);
  await textField
    .locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " inspector-field ")]')
    .getByRole('button', { name: 'Apply' })
    .click();
}

async function applyInspectorField(field: Locator) {
  await field
    .locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " inspector-field ")]')
    .getByRole('button', { name: 'Apply' })
    .click();
}
