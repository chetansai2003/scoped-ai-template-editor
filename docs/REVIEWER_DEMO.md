# Reviewer Demo

Use this script to review the completed local app.

1. Run `npm install` if dependencies are missing.
2. Run `npm run dev` and open the local Vite URL.
3. Confirm the canvas renders the Northstar Studio landing page, not a placeholder.
4. Switch Desktop, Tablet, and Mobile preview modes and confirm the frame width changes.
5. Select `Hero Heading` in Layers and confirm the canvas element is highlighted.
6. In Design, edit the Text field and click Apply. Confirm the canvas updates.
7. Refresh the page and confirm the committed edit persists.
8. Switch Scope to Mobile only, make a visible style/layout edit, and confirm the viewport impact indicator marks only Mobile affected.
9. Select one element, open Code, edit valid focused JSON, click Apply Changes, and confirm the same canvas state updates.
10. Enter invalid JSON in Code and confirm the draft remains visible while the canvas keeps the last valid state.
11. Open AI Edit, choose a supported instruction such as `Make the selected element dark blue`, generate a proposal, then review before/after in the proposal drawer.
12. Accept one proposal item and reject another where available. Confirm accepted items update through the normal command/history path and rejected items do not mutate the template.
13. Try `Add a payment system` and confirm it returns unsupported feedback without changing the template.
14. Generate a proposal, manually edit the same element, then attempt to accept the old proposal. Confirm stale/invalid handling prevents unsafe mutation.
15. Open History for an edited selected element, filter by scope, and restore an older entry. Confirm restore creates a new committed change.
16. Click Reset, cancel once, then open Reset again and confirm. Confirm the template returns to defaults and the reset survives reload.

No real AI API, backend, authentication, payment integration, or deployment is required for this demo.
