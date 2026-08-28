# Scoped AI Template Editor

Browser-based template editor for the Scoped AI Template Editor assignment. The app renders the original `Northstar Studio` landing page from canonical JSON state and now supports validated manual edits, selected-element code edits, and deterministic local AI proposals through one command executor.

## Step 5 Status

Implemented through Step 5:

- Canonical `TemplateDocument` in Redux as the durable source of truth.
- Responsive renderer and layers panel powered by stable element IDs.
- Typed command executor with Zod validation, revision tokens, stale protection, atomic commits, and scoped history.
- Manual Step 4 canvas/inspector edits that use the same executor.
- Selected-element CodeMirror JSON editing for focused `content`, `style`, or `layout` values.
- Code drafts remain local; invalid JSON never mutates Redux.
- Deterministic local AI scenario engine with typed proposal batches and proposal items.
- Proposal drawer with before/after review, independent Accept/Reject, stale handling, and invalid-item handling.

Not implemented yet:

- Real LLM/API calls, backend services, authentication, or arbitrary generated code.
- Full-template JSON editing.
- localStorage persistence, reset persistence behavior, and full recovery UI.

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run test:run
npm run build
```

## Architecture

Current Step 5 flow:

```text
Canvas / Inspector / Code / Accepted AI
-> typed command
-> Zod + scope + revision + old-value validation
-> one validated Redux commit
-> canonical template + scoped history
-> renderer, layers, code panel, and proposal UI read updated state
```

CodeMirror text and AI proposals are temporary UI state. They do not become durable template state unless an accepted command passes the existing executor.

## Code Editing

The Code tab supports exactly one selected element. It shows one focused JSON object at a time:

```json
{
  "style": {
    "color": "#172033"
  }
}
```

Use **Apply Changes** to commit. For viewport-specific edits, the draft displays resolved values, compares `oldValue` against the resolved value, and writes only changed override fields.

## Deterministic AI Scenarios

Supported local instructions:

- `Make this text more concise`
- `Make the selected element dark blue`
- `Make this card wider and move it first`
- `Stack selected items vertically`
- `Make the selected cards compact`
- `Add a payment system`

The AI engine is deterministic and local. It does not call an API, dispatch Redux actions, use randomness, or auto-apply changes. `Add a payment system` returns unsupported feedback because payments require backend/integration work outside Step 5.

## Proposal Rules

Generated proposal items store revision tokens and the proposal-time selected IDs. Accepting an item rechecks revisions and current selection authority. Stale or invalid items never mutate the template. Rejecting an item changes proposal UI state only.

## Verification

Run before declaring Step 5 complete:

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```
