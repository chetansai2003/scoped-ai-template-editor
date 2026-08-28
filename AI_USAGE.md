# AI Usage

## Tool Used

OpenAI Codex.

## Task

Step 7 submission readiness for the Scoped AI Template Editor, followed by a manual-editing usability fix: live-preview Design controls, reliable canvas drag/resize behavior, and global Undo through the validated command pipeline.

## Prompt Summary

The user requested Step 7 only: documentation, deployment readiness, reviewer demo, QA evidence, complete verification, accessibility/responsive/persistence review, Vercel instructions if needed, repository hygiene, and no new features except small fixes that unblock existing reviewer journeys. The user clarified that failing tests must not be weakened or deleted just to pass, and that the Vite chunk-size warning is not a release blocker by itself.

## Commands Codex Ran

- `Get-Content -Path AGENTS.md`
- `git status --short`
- `rg --files -g '!node_modules' -g '!dist' -g '!coverage' -g '!playwright-report' -g '!test-results'`
- `Get-Content` on package/docs/source/test files relevant to Step 7
- `npm run typecheck`
- `npm run lint`
- `npm run test:run`
- `npx playwright install chromium`
- `npx playwright test`
- `npm run build`
- `git diff --check`
- `git log --oneline -n 10`
- `rg` scans for likely secrets, debug statements, and unfinished TODO/FIXME markers

## Verification Results

- Typecheck passed.
- Lint passed after removing explicit `any` usage and ignoring generated Playwright output folders.
- Vitest passed: 90 tests after the manual-editing usability fixes.
- Playwright passed: 3 Chromium tests after installing the local Playwright Chromium browser.
- Production build passed. Vite reported a chunk-size warning, treated as non-blocking because no reviewer-visible performance issue was found in the tested flows.

## Review Process

Failures were inspected before changes were made. Stale tests were updated only when the implemented behavior was intentional and documented, such as inspector drafts requiring explicit Apply. The persistence E2E setup was fixed because it cleared localStorage on reload and invalidated the journey it was trying to prove.

## Current Uncertainty

Manual checklist items in `docs/QA_CHECKLIST.md` remain reviewer-facing prompts unless they are marked as automated evidence. No deployment URL or external production verification is claimed.
