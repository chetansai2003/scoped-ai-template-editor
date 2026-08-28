# Product Notes

## Implemented Through Step 5

- Primary user: a reviewer or builder validating a scoped AI template editor.
- Element: a stable JSON model node with content, style, layout, viewport overrides, children, and revisions.
- Command boundary: canvas, inspector, code, accepted AI, and restore edits use the central executor.
- Code editing: one selected element, one focused scope, explicit Apply, local drafts, and no full-template edits.
- AI proposals: deterministic local scenarios create typed proposal batches for review only.
- Proposal acceptance: each pending item is accepted or rejected independently.
- Stale protection: changed revision tokens mark only affected proposal items stale.
- Authority protection: accepted AI items must still be selected and must be in the proposal-time selection snapshot.

## Supported AI Instructions

- `Make this text more concise`
- `Make the selected element dark blue`
- `Make this card wider and move it first`
- `Stack selected items vertically`
- `Make the selected cards compact`
- `Add a payment system`

## Current Cuts And Assumptions

- AI is deterministic local logic, not a real LLM.
- CodeMirror edits only exposed editable `content`, `style`, and `layout` fields for one selected element.
- Structural AI proposals use typed `StructureOperation` objects; raw `children` and `parentId` property paths remain blocked.
- Proposal batches are temporary UI state and are not persisted yet.
- Persistence, reset behavior, and a full history recovery UI remain Step 6 work.
- There is no backend, authentication, payment integration, or external API call.

## Next Three Prioritized Improvements

1. Add Step 6 localStorage persistence and reset/recovery behavior.
2. Expand history UI for browsing and restoring scoped entries.
3. Add richer deterministic scenarios or replace them later with a real proposal service behind the same command boundary.
