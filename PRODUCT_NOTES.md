# Product Notes

## Implemented Through Step 3

- Primary user: a reviewer or builder validating the foundation for a scoped AI template editor.
- Element: a stable JSON model node with content, style, layout, viewport overrides, children, and per-scope revisions.
- Safe completed edit: a strictly validated command that produces one reducer-safe commit payload before any mutation.
- Command boundary: all committed template changes must pass through the central executor.
- Group selection: normal layer click replaces selection; Ctrl, Cmd, or Shift click toggles a stable ID.
- Responsive policy: `all` writes base values; viewport scopes write only matching overrides.
- Stale protection: viewport tokens include base plus viewport revision; base edits stale old viewport tokens.
- History policy: successful commands append independent history entries per element and viewport scope.
- Restore policy: restoration creates a new `source: "restore"` command and never rewinds Redux or deletes newer history.

## Planned For Later Steps

- Step 4: inspector controls, editable property UI, and user-facing command creators.
- Step 5: AI proposal generation, code editing, CodeMirror behavior, deterministic AI scenarios, and proposal acceptance.
- Step 6: localStorage persistence, reset behavior, and full recovery UI.

## Current Cuts And Assumptions

- No editing UI exists yet; tests construct commands directly.
- No structure editing commands exist; parent/child fields are protected.
- The existing canonical tree and every prospective tree after a command are validated.
- AI authority is enforced for direct AI commands, but no AI proposal engine exists.
- No backend, real AI API, persistence, drag/drop, resize handles, or CodeMirror behavior exists.

## Next Three Prioritized Improvements

1. Add Step 4 design inspector controls that create commands.
2. Add Step 5 AI/code proposal flows that use the same executor.
3. Add Step 6 persistence and reset/recovery behavior.
