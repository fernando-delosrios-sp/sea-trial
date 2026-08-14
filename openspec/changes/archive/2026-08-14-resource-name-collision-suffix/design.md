## Context

Sea Trial provisions Slack canvases, lists, and bookmarks during channel seeding and creates delivery canvases when deliverables are accepted. Display names are workspace-scoped; duplicates cause API failures today. Brainstorming agreed on retry-on-error suffix allocation (`base`, `base-1`, `base-2`, …) without changing channel slug reuse or manifest step IDs.

## Goals / Non-Goals

**Goals:**
- Provisioning succeeds when a requested display name is already taken
- Consistent suffix format and retry cap across canvas, list, and delivery canvas creates
- Clear failure when suffix cap is exhausted

**Non-Goals:**
- Changing `#proj-{slug}-tes` channel slug collision handling
- Auto-deleting or reusing pre-existing Slack objects
- New manifest fields for authors
- Deploy-mate scaffold integration (may follow later)

## Decisions

### D1: Suffix format
- **Choice**: Append `-N` where N starts at 1 on first collision; base name unchanged on first attempt
- **Reason**: Matches user request; predictable ordering
- **Considered alternatives**: Random suffix (hard to debug); UUID suffix (poor UX in Slack UI)

### D2: Collision detection
- **Choice**: Retry loop around create calls; treat known Slack collision errors as retryable
- **Reason**: No reliable list-by-name API for all object types; minimal new API surface
- **Considered alternatives**: Pre-flight workspace search (incomplete APIs)

### D3: Module placement
- **Choice**: `lib/unique-resource-name.ts` with:
  - `formatSuffixedName(baseName, attemptIndex)` → `base` or `base-1` …
  - `isNameCollisionError(error: string | undefined): boolean`
  - `allocateUniqueName(baseName, tryCreate)` async generic helper
- **Reason**: Single policy; easy to unit test without Slack client mocks in every caller
- **Considered alternatives**: Inline retry in each file (duplication)

### D4: Retry cap
- **Choice**: Maximum 100 attempts (base + `-1` … `-99`); throw descriptive error
- **Reason**: Prevents infinite loops; 99 is sufficient for practical collisions
- **Considered alternatives**: Unlimited retry (unsafe)

### D5: Bookmark and list name alignment
- **Choice**: List create and subsequent bookmark attach use the **same** allocated name returned from list create
- **Reason**: Bookmark title should match list display name in Slack
- **Considered alternatives**: Suffix bookmark only (confusing mismatch)

### D6: Pinned index display
- **Choice**: No manifest change; pinned index uses provisioned object IDs and step `title` from manifest (not suffixed runtime title)
- **Reason**: Step `title` is navigation label; suffixed Slack object title is cosmetic in object chrome
- **Considered alternatives**: Persist allocated title in context (YAGNI for MVP)

**Note:** If product later requires pinned index to show suffixed Slack titles, extend `TesEventContext` — not in this change.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Unknown Slack error codes | Centralize collision codes; extend via tests when discovered |
| Extra API calls on collision | Acceptable — collisions are exceptional |
| Orphan objects accumulate | Document ops cleanup; suffix creates new objects intentionally |

## Migration Plan

1. Add helper + unit tests (no behavior change until wired)
2. Wire `createCanvas`, list create, delivery canvas create
3. Integration tests with mocked collision responses
4. No data migration — forward-only behavior on new provisions

## Open Questions

_(none — brainstorm decisions sufficient for implementation)_
