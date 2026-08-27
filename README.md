# Scoped AI Template Editor

Step 3 foundation for a browser-based website builder. The app renders an original `Northstar Studio` landing page from canonical JSON state and now has a safe command, validation, revision, and history core for future edits.

## Step 3 Status

Implemented through Step 3:

- React, TypeScript, Vite, Redux Toolkit, Zod, Vitest, jsdom, and Testing Library setup.
- Canonical `TemplateDocument` stored in Redux as the durable source of truth.
- Recursive renderer and layers panel powered by the canonical template tree.
- Typed JSON-safe edit commands and strict Zod command schemas.
- Central command executor for all committed template changes.
- Editable-property registry for actual model fields.
- Per-element base, desktop, tablet, and mobile revision counters.
- Stale-command protection for base and viewport-scoped edits.
- Atomic multi-target commits through one Redux action.
- Separate scoped history entries per affected element.
- Restore-as-a-new-command helper.

Not implemented yet:

- Step 4 inspector editing controls, inline canvas editing, resize handles, drag/drop, or reordering UI.
- Step 5 AI proposal generation, CodeMirror behavior, code editing, deterministic AI scenarios, or proposal acceptance UI.
- Step 6 localStorage persistence, reset persistence behavior, or full recovery UI.
- Backend services or real AI API calls.

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

Current Step 3 flow:

```text
External edit intent -> EditCommand -> Zod schema validation
-> command executor validation -> validated commit payload
-> one Redux commit action -> template + history reducers
-> renderer/layers read canonical state
```

Reducers receive already-validated explicit before/after element snapshots and history entries. Reducers do not parse command paths, validate commands, generate IDs, or read the current time.

## Model And Scopes

`EditScope` means the property group being edited:

- `content`
- `style`
- `layout`

`ViewportScope` means the responsive write target:

- `all`
- `desktop`
- `tablet`
- `mobile`

`all` writes to base values. Viewport scopes write only to the matching viewport override. Viewport `oldValue` is compared against the currently resolved value: override when present, otherwise base fallback.

## Revisions

Every template element has:

```ts
{
  base: number;
  desktop: number;
  tablet: number;
  mobile: number;
}
```

Base edits increment only `base`. Desktop, tablet, and mobile edits increment only their matching viewport counter. A viewport revision token includes both the base revision and that viewport revision, so base edits stale older viewport commands while unrelated viewport edits do not.

## Validation Order

Commands are validated in this order:

1. Command schema
2. Duplicate target detection
3. Element existence
4. AI selection authority
5. Editable property boundary
6. Property scope
7. Revision token
8. Old-value consistency
9. New-value safety
10. Resulting template structure

AI commands must target elements present in both the proposal-time `selectedIdsSnapshot` and the current editor selection.

## History And Restore

Successful commands append one history entry per affected element and viewport scope. Failed commands create no history. Restore creates a normal `source: "restore"` command from a history entry, goes through the same executor, and appends new history without deleting newer entries.

## Original Template Source

Template source: Original template created specifically for this assignment. No external template is used.

`Northstar Studio` is a one-page digital studio landing page with Navigation, Hero, Stats, Features, Process, Call to Action, and Footer sections.

## Verification

Run before declaring Step 3 complete:

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```
