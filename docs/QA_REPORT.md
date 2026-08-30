# QA Report

Date: 2026-08-30

## Scope

QA audit and follow-up bug fix pass for the current Scoped AI Template Editor implementation. This report records automated coverage additions and verification results for the implemented app: manual editing, code editing, deterministic local AI proposals, history/restore/undo, persistence/reset, canonical renderer, and reviewer Playwright journeys.

Product behavior changes were limited to fixing documented QA findings: design-control discoverability, hidden-element recovery, drag Undo, selector stability, and CodeMirror accessibility polish.

## Commands Run

Baseline before QA additions:

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run test:run` | Passed: 98 tests, 7 files |
| `npx playwright test --reporter=line` | Passed: 4 Chromium tests |
| `npm run build` | Passed with non-blocking Vite chunk-size warning |

Post-change verification:

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run test:run` | Passed: 106 tests, 7 files |
| `npx playwright test --reporter=line` | Passed: 7 Chromium tests |
| `npm run build` | Passed with non-blocking Vite chunk-size warning |
| `git diff --check` | Passed with line-ending warnings only |
| `git status --short` | Completed; changed files are bug fixes, tests, QA docs, and QA runner updates |

## Regression Tests Added

- Component: normal layer click replaces the previous selection.
- Component: unsupported typed AI payment request generates no proposal items and mutates no template/history state.
- Component: rejecting an AI proposal updates proposal UI only.
- E2E: each reviewer journey clears localStorage before app load and fails on browser console/page errors.
- E2E: viewport controls update desktop/tablet/mobile preview frame state.
- E2E: unsupported typed AI payment request creates safe feedback and no visible mutation.
- E2E: visual style edit applies through the inspector and global Undo restores the previous value.
- Unit: Undo removes originally missing layout/style fields instead of storing `null`.
- Unit: Viewport-specific Undo removes only the relevant override field.
- Unit: Undo selector returns a stable memoized reference for unchanged state.
- Component: hidden elements remain selected/reselectable and can be shown again from the inspector.
- Component: repeated text edits keep Text alignment visible and scoped to the selected element.
- Component: CodeMirror exposes a stable accessible focused-editor label.

## Deep Manual QA

Additional browser-style manual QA is recorded in `docs/DEEP_MANUAL_QA.md`. That pass repeatedly exercised Design fields across text, button, nav, card, and section elements, plus drag, Undo, AI proposal, unsupported AI request, and selected-element CodeMirror editing.

The follow-up deep pass passed all targeted scenarios. Previously documented findings `DMQA-001` through `DMQA-005` are now marked fixed in the deep QA report.

## Findings

No P0 or P1 findings remain open after this pass.

| ID | Severity | Area | Finding | Evidence / Status |
| --- | --- | --- | --- | --- |
| QA-001 | P3 | Documentation | `docs/QA_CHECKLIST.md` contained stale automated test counts. | Updated to 106 Vitest tests and 7 Playwright tests. |
| QA-002 | P3 | QA workflow | Default Playwright HTML reporter could write routine results into report folders. | Playwright config changed to default `line` reporter with ignored failure artifacts. |
| QA-003 | P3 | E2E setup | An initial post-change E2E run cleared localStorage on every reload, which invalidated the persistence test itself. | Fixed the test setup so each test starts clean while in-test reloads preserve committed state. |
| DMQA-001 | P1 | Undo / Drag | Undo after dragging did not restore original offsets. | Fixed by treating validated `newValue: null` as property deletion and adding regression coverage. |
| DMQA-002 | P2 | Design / Visibility | Hidden elements were hard to recover from the inspector. | Fixed so hidden elements stay selected/reselectable from Layers and the Visible checkbox remains available. |
| DMQA-003 | P2 | Design / Text Alignment | Text alignment was difficult to find after repeated edits. | Fixed with stable control labels and regression coverage for repeated text edits. |
| DMQA-004 | P2/P3 | State Selectors | Undo selector returned unstable references. | Fixed with a memoized selector and regression coverage. |
| DMQA-005 | P3 | Code Editor UX | CodeMirror replacement needed a stable editor target. | Fixed with an accessible editor label while keeping parsing/diffing/validation real. |

## Non-Blocking Notes

- The Vite build emits a chunk-size warning for the bundled app. Per project guidance, this is treated as a warning, not a release blocker, unless a reviewer-visible performance problem is found.
- The app does not provide real AI, backend, payment integration, arbitrary HTML editing, or deployment automation. Those remain outside current scope.

## Remaining Gaps

- Manual keyboard-only review should still be performed before final submission.
- A human visual QA pass is still useful for nested drag/move interactions because automated pointer tests cannot fully judge editing feel.
- Accessibility is covered through roles/labels in automated tests, but no external screen-reader audit has been performed.
