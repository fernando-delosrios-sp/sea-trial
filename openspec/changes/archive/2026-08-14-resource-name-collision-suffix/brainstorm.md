# Brainstorm: resource-name-collision-suffix

## Context

Sea Trial provisions Slack canvases, lists, and bookmarks during TES Event Channel seeding (`channel-provisioner.ts`, `canvas.ts`, `lists.ts`) and creates delivery canvases on accept (`delivery-canvas-orchestrator.ts`). Display names are derived from manifest `title`/`ref`, scoped list names (`formatScopedListName`), or delivery task IDs.

Today, creation uses the requested name once. If Slack rejects a duplicate name (e.g. a prior channel seed left a workspace-scoped list or canvas title), provisioning fails with an opaque API error. Channel **slug** creation is separate: `provision_channel` reuses an existing `#proj-*-tes` channel on `name_taken` rather than suffixing — that behavior is unchanged here.

Actors: TES (provisions channels), AE/SE (use seeded objects; may re-provision after partial failures or duplicate account names).

## Decision chain

**Q1: Which resources need suffix disambiguation?**
→ All slack-app **create** paths that set a human-readable name/title at provisioning time:
- Canvas titles (seed canvases + delivery canvases)
- Slack List names (Deliverables / Incidents)
- Bookmark titles when attaching lists (same resolved display name as the list)

Out of scope: channel slug reuse, trigger titles (already disambiguated by channel id in CI), manifest step `id` values (must remain stable for context mapping).

**Q2: Suffix format?**
→ Append `-1`, `-2`, … to the **base name** (user request). First attempt uses the base name unchanged; first collision uses `-1`, then `-2`, etc. No leading space or parenthetical variants.

**Q3: How to detect a collision?**
→ **Retry-on-create-error** in a shared helper. Attempt create with candidate name; if Slack returns a name-collision error (`name_taken`, `already_exists`, or documented list/canvas equivalents), increment suffix and retry. Avoid proactive workspace-wide list APIs (limited / inconsistent across object types).

**Q4: Where does logic live?**
→ New small module (e.g. `lib/unique-resource-name.ts`) with `allocateUniqueName(baseName, tryCreate)` used by `createCanvas`, `createListInChannel`, and delivery canvas orchestrator. Keeps collision policy in one place.

**Q5: Should pinned index / bookmarks use the suffixed name?**
→ Yes. Whatever name successfully creates the object is the display name surfaced in bookmarks and (where applicable) canvas title. Manifest `title` remains the authoring label; runtime may differ when suffixed.

**Q6: Upper bound on retries?**
→ Cap at 99 suffix attempts (`-1` … `-99`); then fail with a clear error naming the base and last attempted suffix.

## Approaches considered

| Approach | Pros | Cons |
|---|---|---|
| **A. Retry-on-error (chosen)** | Works without list APIs; minimal API surface | Extra create attempts on collision |
| B. Pre-flight list/search | Fewer failed creates | No reliable canvas/list list-by-name today |
| C. Fail fast + user message | Simple | Blocks provisioning; poor UX for repeat account names |

## Trade-offs

- **[Trade-off]** Suffixed display names may differ from manifest `title` → pinned index links show actual Slack title. **Accepted** — provisioning success beats strict title match.
- **[Trade-off]** Orphaned prior objects from failed runs remain in workspace → suffix creates fresh objects. **Accepted** — matches user intent to create, not reuse ambiguous duplicates.
- **[Risk]** Slack error strings differ by API → centralize known collision error codes in one helper. **Mitigation:** unit tests with mocked errors per resource type.

## Out of scope

- Changing `#proj-{slug}-tes` channel slug collision behavior (reuse existing channel)
- Renaming or deleting pre-existing workspace objects automatically
- Manifest authoring changes (no new `title_suffix` field)
- Deploy-mate scaffold naming (separate tooling; may adopt same helper later)
