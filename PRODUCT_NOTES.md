# Product Notes

## Implemented In Step 1

- Primary user: a reviewer or builder validating the foundation for a scoped AI template editor.
- Group selection: normal layer click replaces selection; Ctrl, Cmd, or Shift click toggles a stable ID in the selected set.
- Viewport scope control: users can choose all views, desktop only, tablet only, or mobile only as UI state.
- Canvas/code shared-state policy: documented only. The Step 1 canvas reads Redux UI state; no code editor behavior exists.
- AI selection/scope policy: documented only. AI does not generate or apply changes in Step 1.

## Planned Definitions For Later Steps

- Safe completed edit: a command that validates against schema, scope, and revision checks before mutating canonical state.
- Element: a typed unit in the future JSON template model with a stable ID and viewport-aware properties.
- Committed step: a validated mutation recorded for review, history, and recovery.
- Editable property boundary: the set of properties a user or AI proposal may change for a selected element.
- Partial acceptance policy: users should be able to accept a safe subset of a proposal when later proposal batches are implemented.
- Per-element/per-viewport recovery policy: recovery should restore only the intended element and viewport scope.
- Planned Viewport Impact Indicator: a future UI signal showing which viewports a pending edit would affect.

## Current Cuts And Assumptions

- Step 1 uses temporary planned layer data, not the canonical future template model.
- Reset is disabled until localStorage persistence exists in Step 6.
- CodeMirror, dnd-kit, and Zod are installed for future steps but do not provide Step 1 behavior.
- No backend, real AI API, command executor, persistence, or renderer exists yet.

## Next Three Prioritized Improvements

1. Define the canonical template model and render `Northstar Studio` from JSON.
2. Add validated command creation and execution for scoped edits.
3. Add design inspector controls that create commands instead of mutating UI state directly.
