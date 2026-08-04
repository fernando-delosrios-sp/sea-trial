# Retrospective: fix-out-of-scope-canvas-replace

## What went well

- Bug was localized to one branch in `buildUpdatedCanvas`; fix matched existing section-update pattern with minimal diff.
- TDD regression tests cover both delta spec scenarios (first run append, subsequent run replace).

## Misses / follow-ups

- Header-only replace leaves stale bullets under replaced sections — pre-existing pattern across all canvas sections; not addressed in this change.
- No dedicated test for empty `outOfScope` on subsequent run (consistent with other sections — no update when empty).

## Process notes

- Small bugfix still benefited from opsx traceability; verify artifact confirmed scenario coverage before archive.
