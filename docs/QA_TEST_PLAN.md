# QA Test Plan

This plan maps the current Scoped AI Template Editor behavior to automated and manual QA evidence. It describes the implemented app only; it does not claim backend, real AI, payment, deployment, or arbitrary HTML editing support.

## Coverage Map

| Area | Current Behavior | Unit / Logic Coverage | Component Coverage | Playwright Coverage |
| --- | --- | --- | --- | --- |
| Toolbar | Switch desktop/tablet/mobile, choose edit scope, global Undo, Reset dialog | Undo command grouping in command tests | Viewport/scope/undo/reset UI coverage in `EditorShell.test.tsx` | Preview frame resize, undo, reset cancel/confirm |
| Layers | Canonical tree, normal click replaces selection, modifier multi-select, keyboard selection | Template tree selectors and structure validation | Layer rendering, selection, multi-select, Escape, replacement click | Layer selection in reviewer journeys |
| Canvas / Renderer | Canonical template render, exact element selection, selected styling, responsive overrides | Responsive resolver and structure validator tests | Canvas selection, overlay, hidden elements, responsive state | Desktop/tablet/mobile preview smoke |
| Design Inspector | Visible fields preview immediately, commit through executor, invalid values are rejected | Value validation and command executor tests | Content/style/layout edits, group behavior, unsupported controls hidden or explained | Visual dimension/color edit and persistence journeys |
| Drag / Resize | Dedicated handle only, local preview during movement, one commit on release | Command/history validation for layout commits | Drag direction, resize, scale math, no history until pointer release | Covered through visual dimension edit smoke; deeper drag tests are component-level |
| Code Panel | One selected element, focused JSON scope, invalid JSON safe, valid diffs through executor | JSON parse/diff/protected-field tests | Empty/multi/single states and command path coverage | Manual code journey listed in reviewer checklist |
| AI Proposals | Deterministic local scenarios, unsupported typed payment request, accept/reject without auto-apply | Scenario engine, proposal command, stale/authority tests | Generate, unsupported typed request, accept, reject | Unsupported typed payment request |
| History / Restore | Selected element history, scope filter, restore as new command | Restore command and history selector tests | History tab and restore behavior | History restore reviewer journey |
| Persistence / Reset | Committed template/history saved to localStorage; reset clears persisted state | Storage schema/malformed/storage-error tests | Persistence notice and reset UI coverage | Reload persistence and reset confirm/cancel |
| Accessibility | Semantic regions, tabs, labels, dialogs, focusable controls, live messages | Not applicable | Role/label assertions across shell/panels/dialogs | Keyboard path remains a manual checklist item |

## Playwright Hygiene

Routine runs should use:

```bash
npx playwright test --reporter=line
```

The default Playwright config now uses the line reporter. Failure artifacts are written to ignored `.playwright-artifacts/`. HTML reports are opt-in with `PLAYWRIGHT_HTML_REPORT=1` and are written to ignored `.playwright-report/`.

Every E2E test clears `localStorage` before the app loads and again after navigation, then reloads to reset app state. The suite records browser console errors and page errors as test failures for reviewer journeys.

## Test Data Boundaries

- Tests use the canonical `Northstar Studio` starter template.
- CodeMirror tests may mock only the external editor wrapper if needed; parsing, diffing, command creation, and validation logic must remain real.
- Normal layer-click tests assert the documented selection-replacement behavior. The suite does not treat selected-row deselect as a required reviewer behavior.
- Unsupported AI payment requests are tested as manually typed instructions because the quick-prompt button is intentionally not present.

## Remaining Manual QA

- Full keyboard-only walkthrough through Design, Code, AI proposal review, History restore, and Reset cancel.
- Visual scan at narrow desktop widths for overlapping browser chrome and editor panels.
- Manual drag feel across nested groups, especially when selecting large parent containers.
- Screen-reader pass for proposal status changes and reset confirmation wording.
