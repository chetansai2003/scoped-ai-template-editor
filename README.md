# Scoped AI Template Editor

Browser-based React/TypeScript editor for the Scoped AI Template Editor assignment. The app renders the `Northstar Studio` landing page from a canonical JSON template model and routes manual edits, selected-element code edits, accepted deterministic AI proposals, and history restores through one validated command pipeline.

## Current Status

Implemented through Step 6, with Step 7 submission readiness in place:

- Professional editor shell with toolbar, layers, canvas, right panel, proposal drawer, persistence notice, and reset dialog.
- Canonical `TemplateDocument` in Redux as the durable source of truth.
- Recursive responsive renderer powered by stable element IDs and desktop/tablet/mobile overrides.
- Zod-validated command executor with editable-property boundaries, revision tokens, stale protection, atomic commits, scoped history, and restore-as-new-command.
- Manual canvas selection, inline text editing, live-preview design inspector edits, drag/resize commits, visibility edits, typed structural operations, and global Undo.
- Selected-element CodeMirror JSON editing for one focused `content`, `style`, or `layout` scope.
- Deterministic local AI proposal scenarios with before/after review, independent Accept/Reject, stale/invalid handling, and no auto-apply.
- localStorage persistence for committed template/history state, corrupted-state recovery fallback, scoped history UI, and confirmed reset behavior.

Not implemented: real LLM/API calls, backend/auth, full-template JSON editing, arbitrary HTML/JSX editing, deployment automation, or collaboration/multi-user workflows.

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

## Architecture

```text
Canvas / Inspector / Code / Accepted AI / Restore
-> typed command
-> Zod schema + editable boundary + scope + revision + oldValue validation
-> one validated Redux commit
-> canonical template + scoped history
-> renderer, layers, code panel, proposal drawer, history UI, and persistence
```

The DOM renders the model only. It is never the durable source of truth. Design previews, CodeMirror drafts, inline text drafts, pointer-move geometry, and AI proposal batches are temporary UI state until a validated command succeeds.

## Template Model

The canonical model lives in `src/template` and stores metadata, root element ID, viewport settings, and an element dictionary. Each element has a stable ID, type, name, parent, ordered children, content, style, layout, overrides, and revision counters.

Responsive values use base values plus explicit viewport overrides:

```text
resolved value = overrides[activeViewport]?.scope[field] ?? base scope[field]
```

Every element has `children: []`, including leaves, so renderer and layers traverse one deterministic tree.

## Editing Behavior

- Normal selection replaces the current selection; Ctrl/Cmd/Shift toggles multi-selection.
- Inspector edits preview live and commit on blur, Enter, or the field's Apply button.
- Inline text drafts commit on Enter or blur, cancel on Escape, and do not create history if unchanged.
- Drag/resize pointer movement is local preview state; pointer release creates one layout command.
- Global Undo restores the latest command group's original before values through the validated command pipeline.
- Structural operations are typed commands and all-viewports only.
- Soft hide/show is `layout.visible` and can be viewport-specific.
- Reset requires confirmation and clears persisted template/history state.

## Code Editing

The Code tab supports exactly one selected element and one scope at a time:

```json
{
  "style": {
    "color": "#172033"
  }
}
```

Apply parses JSON, validates the focused scope, diffs editable fields, and dispatches normal `source: "code"` commands. Invalid JSON or protected fields leave the last valid template untouched.

## Deterministic AI Scenarios

Supported local instructions:

- `Make this text more concise`
- `Make the selected element dark blue`
- `Make this card wider and move it first`
- `Stack selected items vertically`
- `Make the selected cards compact`
- `Add a payment system`

The engine is deterministic and local. It does not call an API, generate random IDs, mutate state during generation, or auto-apply proposals. Payment requests return unsupported feedback because they require backend/integration work.

## Requirement Evidence

| Requirement | Evidence |
| --- | --- |
| Canonical model powers canvas/layers | `src/template`, `src/renderer`, `src/editor/LayersPanel.tsx` |
| Stable editable IDs | Northstar template IDs and `data-element-id` renderer attributes |
| Responsive base plus overrides | `resolveResponsiveValue` tests and viewport switching UI |
| One safe edit pipeline | `src/commands/commandExecutor.ts` and command tests |
| Invalid/stale data never mutates state | command, code, AI, and persistence tests |
| Manual visual editing | canvas, inline editor, design inspector, structure controls, global Undo |
| Code edits update same state/canvas | CodePanel and code diff tests |
| AI proposals reviewed before apply | AI scenario/proposal tests and drawer UI |
| Persistence/reset/recovery | persistence unit tests and Playwright reviewer journeys |
| Reviewer readiness | `docs/REVIEWER_DEMO.md`, `docs/QA_CHECKLIST.md`, automated checks |

## Vercel Readiness

No environment variables are required. Use:

- Framework preset: Vite
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`

No deployment has been performed from this repository by Codex.

## Verification Results

Latest Step 7 verification:

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:run` passed: 90 Vitest tests.
- `npx playwright test` passed: 3 Chromium tests after installing Playwright Chromium locally.
- `npm run build` passed with a non-blocking Vite chunk-size warning.
