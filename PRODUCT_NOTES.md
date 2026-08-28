# Product Notes

## Implemented

- Primary user: a reviewer or builder evaluating a scoped AI template editor.
- Durable state: a JSON-serializable canonical template document in Redux.
- Rendering: one Northstar Studio template tree drives canvas and layers.
- Responsive behavior: desktop, tablet, and mobile use base values plus viewport overrides.
- Safe edits: manual, code, accepted AI, and restore operations pass through the command executor.
- History: committed changes create per-element, per-viewport entries; restore creates a new command.
- Code editing: one selected element, one focused scope, explicit Apply, local drafts, no full-template editing.
- AI proposals: deterministic local scenarios produce reviewable proposal batches; generation never mutates template/history.
- Persistence: committed template/history state saves to localStorage; reset requires confirmation and clears persisted state.

## Supported AI Instructions

- `Make this text more concise`
- `Make the selected element dark blue`
- `Make this card wider and move it first`
- `Stack selected items vertically`
- `Make the selected cards compact`
- `Add a payment system`

## Important Boundaries

- AI is deterministic local logic, not a real LLM.
- Proposal acceptance revalidates selection authority and revision tokens.
- Structural AI proposals use typed `StructureOperation` objects, never raw `children` or `parentId` paths.
- Inspector and CodeMirror drafts are local until Apply.
- Pointer movement during resize/position is local until pointer release.
- Invalid JSON, invalid commands, stale proposals, corrupted persistence, and failed restores leave canonical state intact.

## Current Cuts

- No backend, authentication, real AI API, payment integration, or deployment automation.
- No arbitrary HTML/JSX editing.
- No full-template JSON editor.
- No multi-user collaboration or remote storage.
- The Vite chunk-size warning is treated as informational; no reviewer-visible performance issue was identified during Step 7 checks.
