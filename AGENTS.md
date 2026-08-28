# AGENTS.md

## Repository Structure

- `src/app`: Redux store, typed React Redux hooks, and persistence middleware.
- `src/store`: editor UI, template, proposal, history slices, and selectors.
- `src/template`: canonical template types, starter data, responsive resolver, and template selectors.
- `src/renderer`: recursive template renderer components and styles.
- `src/commands`: command schemas, validation, executor, structure validator, manual command creators, and restore helper.
- `src/editor`: editor shell, panels, inspector, canvas, overlay, inline editor, history UI, reset dialog, and styles.
- `src/code`: selected-element CodeMirror JSON parsing, diffing, and code-edit types.
- `src/ai`: deterministic local proposal engine, proposal schemas, command conversion, and AI panel.
- `src/persistence`: localStorage schema, load/save/clear helpers, and tests.
- `src/history`: scoped history selectors.
- `tests/e2e`: Playwright reviewer-journey tests.
- `docs`: reviewer demo and QA checklist.
- Do not create empty placeholder files for future features.

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run test:run
npx playwright test
npm run build
```

If Playwright browsers are missing, install Chromium with:

```bash
npx playwright install chromium
```

## TypeScript And React Conventions

- Keep TypeScript strict mode enabled.
- Avoid `any`, `@ts-ignore`, fake implementations, dead code, and disabled lint rules.
- Keep Redux logic outside presentation components where practical.
- Use semantic React components and accessible HTML.
- Keep template and persisted state JSON-serializable.
- Committed template mutations must pass through the command executor and validated commit action.

## Architecture Rules

1. The durable source of truth is a typed, JSON-serializable template model.
2. React DOM elements render the model; the DOM must never become durable state.
3. Selection uses stable element IDs.
4. Canvas editing, code editing, accepted AI changes, and restoration share one command and validation pipeline.
5. Desktop, tablet, and mobile values use shared base values plus explicit viewport overrides.
6. AI output is a proposal and must never apply automatically.
7. History and recovery operate per element and per viewport scope.
8. Invalid, stale, or corrupted data must never mutate canonical state.
9. Persistence stores committed template/history state only, not ephemeral selection/drafts/proposals.
10. Do not deploy, push, commit, or change remotes unless explicitly requested.

## Accessibility Expectations

- Use semantic `header`, `nav`, `main`, `aside`, buttons, labels, tabs, dialogs, and form controls.
- Provide visible focus states.
- Do not rely on color alone for selection.
- Disabled or risky controls must have visible explanatory text or confirmation.
- Reset requires a confirm/cancel dialog and supports Escape dismissal.

## Scope Rules

- No backend, auth, real AI API, payment integration, or external service calls.
- No arbitrary HTML/JSX editing.
- No full-template JSON editor.
- No fake screenshots, fake verification results, fake deployment URLs, or fabricated evidence.
- Do not weaken/delete failing tests just to pass; first determine whether a test is stale or a reviewer journey is broken.
- Treat Vite chunk-size output as a warning unless a real reviewer-visible performance problem is found.
- Preserve user files, including `scoped-ai-template-editor-architecture-7-steps.pdf`.

## Definition Of Done

- App builds and runs locally.
- Canonical template state powers renderer and layers.
- Valid edits use command validation, revision tokens, atomic commits, scoped history, and persistence.
- Manual, code, deterministic AI proposal, history restore, reset, and responsive journeys are documented and tested.
- Documentation describes actual behavior only.
- Typecheck, lint, Vitest, Playwright, build, and repo hygiene checks are run before declaring completion.
