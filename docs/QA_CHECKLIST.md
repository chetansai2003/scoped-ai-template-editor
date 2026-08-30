# QA Checklist

## Automated Evidence

- [x] `npm run typecheck` passed.
- [x] `npm run lint` passed.
- [x] `npm run test:run` passed: 106 Vitest tests.
- [x] `npx playwright test --reporter=line` passed: 7 Chromium reviewer-journey tests.
- [x] `npm run build` passed with a non-blocking Vite chunk-size warning.
- [x] Deep browser-style manual QA passed for representative Design, drag/undo, AI, and Code journeys.

## Reviewer Journey Checks

- [x] Valid inspector edit persists across reload.
- [x] Reset dialog cancel preserves edits.
- [x] Confirm Reset removes edits and restored defaults survive reload.
- [x] History panel can restore an older committed state.
- [x] Design panel previews edits live and commits through validation.
- [x] Global Undo reverses the latest committed command through validation.
- [x] Canvas drag/resize preview during pointer movement and commit once on release.
- [ ] At about 1280px width, toolbar, sidebars, canvas, and drawer avoid horizontal overflow.
- [x] Desktop, Tablet, and Mobile preview controls resize the canvas frame cleanly.
- [ ] Canvas selection overlay is visible and not color-only.
- [ ] Keyboard focus is visible on toolbar, layers, tabs, inspector fields, proposal controls, history controls, and reset dialog buttons.
- [ ] Escape clears selection from canvas/layers and closes the Reset dialog.
- [ ] Invalid CodeMirror JSON keeps the draft visible and leaves the canvas unchanged.
- [x] Unsupported typed AI instruction `Add a payment system` shows safe unsupported feedback and creates no mutation.
- [ ] AI Accept/Reject can leave one item accepted, one rejected, and one pending.
- [ ] Manual edit after proposal generation marks only affected proposal items stale.
- [ ] Mobile-only edit affects Mobile while Desktop and Tablet remain protected.
- [ ] Persistence notice uses `aria-live` for reset/recovery messages.

## Repository Hygiene

- [x] `git diff --check` has no whitespace errors beyond line-ending warnings.
- [x] No likely secret values were found in tracked source/config/docs.
- [x] No accidental development-only logging statements remain.
- [x] No fake deployment links, fake screenshots, or fabricated verification claims are documented.
