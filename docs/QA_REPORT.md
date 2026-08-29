# QA Report

Date: 2026-08-29

## Scope

QA-only audit for the current Scoped AI Template Editor implementation. This report records automated coverage additions and verification results for the implemented app: manual editing, code editing, deterministic local AI proposals, history/restore/undo, persistence/reset, canonical renderer, and reviewer Playwright journeys.

No product behavior changes were made for this QA pass.

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
| `npm run test:run` | Passed: 101 tests, 7 files |
| `npx playwright test --reporter=line` | Passed: 7 Chromium tests |
| `npm run build` | Passed with non-blocking Vite chunk-size warning |
| `git diff --check` | Passed with line-ending warnings only |
| `git status --short` | Completed; changed files are QA docs, test config, and tests |

## Regression Tests Added

- Component: normal layer click replaces the previous selection.
- Component: unsupported typed AI payment request generates no proposal items and mutates no template/history state.
- Component: rejecting an AI proposal updates proposal UI only.
- E2E: each reviewer journey clears localStorage before app load and fails on browser console/page errors.
- E2E: viewport controls update desktop/tablet/mobile preview frame state.
- E2E: unsupported typed AI payment request creates safe feedback and no visible mutation.
- E2E: visual style edit applies through the inspector and global Undo restores the previous value.

## Findings

No P0 or P1 findings were confirmed during the baseline run.

| ID | Severity | Area | Finding | Evidence / Status |
| --- | --- | --- | --- | --- |
| QA-001 | P3 | Documentation | `docs/QA_CHECKLIST.md` contained stale automated test counts. | Updated to 101 Vitest tests and 7 Playwright tests. |
| QA-002 | P3 | QA workflow | Default Playwright HTML reporter could write routine results into report folders. | Playwright config changed to default `line` reporter with ignored failure artifacts. |
| QA-003 | P3 | E2E setup | An initial post-change E2E run cleared localStorage on every reload, which invalidated the persistence test itself. | Fixed the test setup so each test starts clean while in-test reloads preserve committed state. |

## Non-Blocking Notes

- The Vite build emits a chunk-size warning for the bundled app. Per project guidance, this is treated as a warning, not a release blocker, unless a reviewer-visible performance problem is found.
- The app does not provide real AI, backend, payment integration, arbitrary HTML editing, or deployment automation. Those remain outside current scope.

## Remaining Gaps

- Manual keyboard-only review should still be performed before final submission.
- A human visual QA pass is still useful for nested drag/move interactions because automated pointer tests cannot fully judge editing feel.
- Accessibility is covered through roles/labels in automated tests, but no external screen-reader audit has been performed.
