# QA Checklist for Step 6

## 1. Persistence & Hydration
- [ ] Make a valid edit in the editor, refresh the page, and verify the edit survives.
- [ ] Simulate corrupted state: open DevTools Application tab, edit `scoped-ai-editor:v1` to be `{ invalid }`, refresh the page. Verify it gracefully falls back to the original template without crashing.
- [ ] Verify that selecting elements, switching viewports, or typing an inline draft does *not* write to `localStorage`. Only clicking "Apply" or pressing Enter to commit the text writes to storage.

## 2. Reset Behavior
- [ ] Make a valid edit.
- [ ] Click the "Reset" button in the top right.
- [ ] Cancel the dialog. Verify your edits are still there.
- [ ] Click "Reset" again and confirm. Verify the template returns to the original seed.
- [ ] Check `localStorage` in DevTools to confirm the persistence key is completely removed after reset.

## 3. History & Scoped Restore
- [ ] Make an edit on the desktop viewport (e.g. change text).
- [ ] Make a second edit on the mobile viewport only (e.g. change color).
- [ ] Select the edited element and go to the "History" tab.
- [ ] Switch the history scope to "Mobile". Verify you see the mobile-only color change.
- [ ] Click "Restore" on an older history entry. Verify the canvas updates to the previous state.

## 4. Accessibility
- [ ] Use only the `Tab` key to navigate the editor interface. Verify all buttons, inputs, and tabs have a visible blue focus outline.
- [ ] Open the Reset dialog. Verify `Escape` closes the dialog.
- [ ] Verify the Persistence Notice toast (which appears on errors or reset) is announced to screen readers (`aria-live`).

## 5. Responsive Quality
- [ ] Resize the browser window to ~1280px. Verify the editor toolbars and sidebars do not break or horizontally scroll.
- [ ] Switch the preview mode to Mobile. Verify the canvas frame narrows cleanly and remains centered.
