# AGENTS.md

## Repository Structure

- `src/app`: Redux store and typed React Redux hooks.
- `src/store`: Step 1 Redux slices and selectors.
- `src/editor`: used Step 1 editor shell components, styles, and tests.
- `src/template`: Step 2 canonical template types, starter data, responsive resolver, and template selectors.
- `src/renderer`: Step 2 recursive template renderer components and styles.
- `src/commands`: Step 3 command schemas, validation, executor, structure validator, and restore helper.
- `src/history`: Step 3 scoped history selectors.
- Future AI, persistence, and larger history UI folders should be added only when those steps are implemented.
- Do not create empty placeholder files for future features.

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run test:run
npm run build
```

## TypeScript And React Conventions

- Keep TypeScript strict mode enabled.
- Avoid `any`, `@ts-ignore`, fake implementations, dead code, and disabled lint rules.
- Keep Redux logic outside presentation components.
- Use semantic React components and accessible HTML.
- Keep template state JSON-serializable.
- Committed template mutations must pass through the Step 3 command executor and validated commit action.

## Architecture Rules

1. The durable source of truth will be a typed, JSON-serializable template model.
2. React DOM elements will only render the model; the DOM must never become the source of truth.
3. Selection will use stable element IDs.
4. Canvas editing, code editing, accepted AI changes, and restoration will eventually share one command and validation pipeline.
5. Desktop, tablet, and mobile values will use shared base values plus explicit viewport overrides.
6. AI output will be a proposal and must never apply automatically.
7. History and recovery will operate per element and per viewport scope.
8. Invalid or stale data must never mutate canonical state.
9. TypeScript strict mode must remain enabled.
10. Avoid `any`, `@ts-ignore`, fake implementations, dead code, and disabled lint rules.

## Accessibility Expectations

- Use semantic `header`, `nav`, `main`, `aside`, buttons, labels, tabs, and form controls.
- Provide visible focus states.
- Do not rely on color alone for selection.
- Disabled controls must have visible explanatory text when their purpose matters.

## Scope Rules

- No backend.
- No real AI API.
- No localStorage persistence in Step 3.
- No inspector editing controls, inline canvas editing, drag/drop, CodeMirror behavior, AI proposal generation, or proposal acceptance in Step 3.
- Preserve the canonical template model as the source of truth for the renderer and layers.
- Preserve the command executor as the only committed-edit boundary.
- Inspect existing files before modifying them.
- Preserve user files, including the architecture PDF.

## Definition Of Done

- The app runs.
- Redux has the four Step 1 slices.
- Viewport, scope, selection, and active panel work.
- The editor shell is responsive and professional.
- The renderer and layers read from canonical template state.
- Valid template changes use the command executor, revision tokens, atomic commits, and scoped history.
- Documentation is accurate and does not claim unfinished features work.
- Relevant checks pass before declaring completion.
