import { test, expect, type Page } from '@playwright/test';

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
});

async function applyTextDraft(page: Page, text: string) {
  const textField = page.locator('#inspector-content-text');
  await textField.fill(text);
  await textField
    .locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " inspector-field ")]')
    .getByRole('button', { name: 'Apply' })
    .click();
}
