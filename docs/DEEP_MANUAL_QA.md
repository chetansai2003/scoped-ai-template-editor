# Deep Manual QA: Design, AI, Code, Drag, Undo

Date: 2026-08-30  
Method: Browser-style manual QA using Playwright against local Vite dev server at `http://localhost:5173/`.

This document records observed behavior after the design-control, drag/undo, selector-stability, hidden-element recovery, and CodeMirror UX fixes. The pass focused on representative element types and repeated key controls 2-3 times where user-facing editing reliability mattered most.

## Summary

| Area | Result | Notes |
| --- | --- | --- |
| Design: text fields | Pass | Color, font size, radius, X/Y offset, and text alignment worked after repeated edits. |
| Design: button fields | Pass | Background, text color, width, height, and padding worked after repeated edits. |
| Design: nav fields | Pass | Background, text color, font size, and padding worked. Move/drag is visibly explained as unavailable for fixed nav. |
| Design: card fields | Pass | Background, border color, radius, shadow, width, height, and gap worked after repeated edits. |
| Design: section fields | Pass | Columns, gap, padding, and max width worked. |
| Design: visibility | Pass | Hidden element disappeared from canvas, stayed recoverable from Layers/Inspector, and returned after rechecking Visible. |
| Drag | Pass | Dragging right/down moved the card in the expected direction from the dedicated move handle. |
| Undo | Pass | Undo after drag restored the original position and removed the previously missing offset fields. |
| AI proposal | Pass | Supported dark-blue proposal generated and applied on Accept. Unsupported payment request stayed non-mutating. |
| Code editor | Pass | Selected-element style JSON color edit applied correctly through CodeMirror. |
| Console issues | Pass | No browser console errors or warnings were observed in the deep pass. |

## Detailed Results

### Design: Text Element

Element: `hero-heading`

Actions:

- Changed text color to `#ff0000`, then `#008000`.
- Changed font size to `42`, then `36`.
- Changed border radius to `18`.
- Changed X offset to `24`.
- Changed Y offset to `12`.
- Changed text alignment to `center`.

Observed:

- Final computed color: `rgb(0, 128, 0)`.
- Final computed font size: `36px`.
- Final computed border radius: `18px`.
- Offset transform: `matrix(1, 0, 0, 1, 24, 12)`.
- Final text alignment: `center`.

### Design: Button Element

Element: `hero-primary-cta`

Actions:

- Changed background to `#000000`, then `#7c3aed`.
- Changed text color to `#ffffff`.
- Changed width to `260`, then `300`.
- Changed height to `58`.
- Changed padding to `12 22`.

Observed:

- Final background: `rgb(124, 58, 237)`.
- Final color: `rgb(255, 255, 255)`.
- Final width: `300px`.
- Final height: `58px`.
- Final padding: `12px 22px`.

### Design: Nav Element

Element: `top-nav`

Actions:

- Changed background to `#223344`.
- Changed text color to `#ffeeaa`.
- Changed font size to `22`.
- Changed padding to `24 48`.
- Checked move/drag availability.

Observed:

- Final background: `rgb(34, 51, 68)`.
- Brand text color: `rgb(255, 238, 170)`.
- Final font size: `22px`.
- Final padding: `24px 48px`.
- Move button count: `0`.
- Visible explanation: fixed template elements cannot be moved or dragged, but available design fields can still be edited.

### Design: Card Element

Element: `hero-visual-card`

Actions:

- Changed background to `#facc15`, then back to `#17202a`.
- Changed border color to `#ff0000`.
- Changed border radius to `30`.
- Changed shadow to `0 10px 20px rgba(0, 0, 0, 0.25)`.
- Changed width to `420`.
- Changed height to `320`.
- Changed gap to `28`.

Observed:

- Final background: `rgb(23, 32, 42)`.
- Final border color: `rgb(255, 0, 0)`.
- Final radius: `30px`.
- Final shadow: `rgba(0, 0, 0, 0.25) 0px 10px 20px 0px`.
- Final width: `420px`.
- Final height: `320px`.
- Final gap: `28px`.

### Design: Section Element

Element: `stats-section`

Actions:

- Changed columns to `2`.
- Changed gap to `30`.
- Changed padding to `44 40`.
- Changed max width to `980`.

Observed:

- Grid columns changed to two columns.
- Final gap: `30px`.
- Final padding: `44px 40px`.
- Final max width: `980px`.

### Design: Visibility

Element: `hero-secondary-cta`

Actions:

- Unchecked Visible and applied.
- Reselected the hidden element from Layers.
- Checked Visible and applied.

Observed:

- Hidden canvas count: `0`.
- Shown canvas count after restore: `1`.
- The hidden element remains selectable from Layers and the inspector keeps the Visible checkbox available.

### Drag And Undo

Element: `hero-visual-card`

Actions:

- Dragged via the dedicated `Move hero-visual-card` handle from `(900, 350)` to `(960, 400)`.
- Clicked Undo.

Observed:

- Drag delta: `x: 60`, `y: 50`.
- Undo delta relative to original position: `x: 0`, `y: 0`.
- Inline offset variables after Undo returned to `initial`, confirming the missing `offsetX/offsetY` fields were removed rather than stored as `null`.

### AI Edit

Element: `hero-heading`

Actions:

- Typed `Make the selected element dark blue`.
- Generated proposal.
- Accepted proposal.

Observed:

- Proposal changed `style.color` from `#152028` to `#0f2a44`.
- After Accept, computed color became `rgb(15, 42, 68)`.
- Proposal status changed to accepted.

Unsupported request:

- Typed `Add a payment system`.
- Generated proposal.

Observed:

- Message: `Payment systems require backend and integration work outside Step 5.`
- No proposal items were generated.
- Heading text stayed unchanged.

### Code Editor

Element: `hero-heading`

Actions:

- Opened Code tab.
- Selected `style` scope.
- Replaced the draft with:

```json
{
  "style": {
    "color": "#008000"
  }
}
```

- Clicked Apply Changes.

Observed:

- Computed text color became `rgb(0, 128, 0)`.
- No alert appeared.
- The CodeMirror surface has a stable accessible editor label for tests and review.
- CodeMirror's internal accessibility announcement text did not become draft JSON or block the edit.

## Fixed Findings

| ID | Previous Severity | Area | Fix Evidence | Regression Test |
| --- | --- | --- | --- | --- |
| DMQA-001 | P1 | Undo / Drag | Undo after dragging restores the original visual position and deletes originally missing offset fields. | Added unit coverage for offset undo deletion and deep manual drag/undo pass. |
| DMQA-002 | P2 | Design / Visibility | Hidden elements remain selected/reselectable from Layers and can be shown again from the inspector. | Added component coverage and deep manual hide/show pass. |
| DMQA-003 | P2 | Design / Text Alignment | Text alignment remains visible and applies only to the selected text element after repeated edits. | Added component coverage and deep manual repeated text pass. |
| DMQA-004 | P2/P3 | State Selectors | Undo selector is memoized and no React Redux unstable selector warning appeared in the deep pass. | Added selector stability unit coverage. |
| DMQA-005 | P3 | Code Editor UX | CodeMirror has a stable accessible editor label and style JSON replacement applies without entering invalid draft content. | Added component coverage and deep manual CodeMirror pass. |

## Remaining Notes

- The deep pass covers representative elements: text, button, nav, card, section, visibility, drag/undo, AI, and code editing. It is not exhaustive over every possible element and field combination.
- Fixed nav elements intentionally do not show move/drag controls. The inspector explains this instead of exposing controls that cannot work.
- Unsupported AI instructions, including payment integration requests, intentionally produce safe feedback and no proposal items.
