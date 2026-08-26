# Scoped AI Template Editor

Step 1 foundation for a browser-based website builder that will eventually edit a typed, JSON-serializable template model through scoped commands and AI proposals.

## Primary User

The primary user is a frontend evaluator or product-minded builder reviewing whether the editor foundation can grow into a scoped AI template editor without confusing demo behavior for real editing features.

## Step 1 Status

Implemented in Step 1:

- Vite, React, TypeScript, Redux Toolkit, React Redux, Vitest, jsdom, Testing Library, and Playwright package setup.
- Redux boundaries for template metadata, editor UI, AI proposal state, and history state.
- A professional editor shell with toolbar, layers panel, canvas placeholder, right panel, and AI proposal drawer.
- Working viewport switching, edit-scope switching, selection, multi-selection, Escape clearing, and right-panel tab switching.
- Documentation for architecture, product notes, AI usage, and future agent work.

Not implemented in Step 1:

- Canonical element model, viewport resolver, command executor, Zod command validation, template renderer, CodeMirror editing behavior, DnD behavior, AI engine, history restore, or localStorage persistence.

## Technology Choices

- React + TypeScript + Vite for the frontend foundation.
- Redux Toolkit + React Redux for state ownership boundaries.
- Vitest + jsdom + Testing Library for behavior-focused tests.
- CodeMirror, dnd-kit, and Zod are installed for later planned steps but are not wired into Step 1 features.

## Installation And Commands

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run test:run
npm run build
```

## High-Level Architecture

Future flow:

```text
Editor UI -> Command creators -> Central command executor
-> Zod + scope + revision validation -> Canonical template state
-> Viewport resolver -> React template renderer
```

Step 1 creates only the shell and state boundaries needed for that architecture.

## Redux State Ownership

- `template`: template metadata only for `Northstar Studio`.
- `editorUI`: selected IDs, active preview viewport, edit scope, and active right panel.
- `proposal`: empty AI proposal boundary for Step 5.
- `history`: empty per-element history boundary for later recovery work.

## Editor Component Architecture

```text
EditorShell
TopToolbar
LayersPanel
Canvas
RightPanel
ProposalDrawer
```

Future folder architecture will add command, model, validation, renderer, AI, persistence, and history modules only when those steps are implemented. Empty placeholder files for future features should not be created.

## Original Template Source

Template source: Original template created specifically for this assignment. No external template is used.

Planned one-page template: `Northstar Studio`, a digital studio website with Navigation, Hero, Services with three cards, Testimonial, Call to Action, and Footer.

## Planned Stable IDs

- `page.root`
- `nav.root`
- `hero.section`
- `hero.heading`
- `hero.description`
- `hero.primaryButton`
- `services.section`
- `services.card.1`
- `services.card.2`
- `services.card.3`
- `testimonial.section`
- `cta.section`
- `footer.root`

These IDs are temporary layer-panel data in Step 1 and are not yet the canonical template model.

## Seven-Step Roadmap

1. Project foundation and editor shell.
2. Canonical template model and renderer.
3. Command pipeline and validation.
4. Design inspector and editable property boundaries.
5. AI proposal generation, before/after review, and acceptance.
6. Persistence, reset, and recovery.
7. Polish, accessibility, and production hardening.

## Current Limitations

- The canvas is a placeholder and does not render JSON template data.
- The AI, code, and history panels are intentionally non-functional.
- Reset is disabled because persistence is planned for Step 6.
- Installed future-step libraries are not used for product behavior yet.

## Verification Commands

Run before declaring Step 1 complete:

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```
