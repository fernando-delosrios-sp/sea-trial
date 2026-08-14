# Brainstorm: simplify-channel-composition

## Context

The TES Event channel blueprint lives in `slack-app/content/channels/tes-event.json` with multiple planes (`resources`, `chrome`, `gates`, `modals`, `navigation`, `runtime.context_slot_map`, `automation`, `dynamic_resources`, `organization`). Exploration showed most planes are unused or duplicate the same objects. Authors need a manifest that answers: **what Slack objects exist in the channel, how they are created or linked, and how they surface (tabs vs bookmarks).**

Actors: TES (provisions channel), AE/SE (use canvases, lists, onboarding workflow).

## Decision chain

**Q1: What does the manifest need to express?**
→ Two concerns only: (1) create/link resources — canvas, list, workflow; (2) define channel surfacing — tabs and bookmarks. Gates, modals, navigation, folders are out of scope for the manifest (behavior stays in code; modals stay in `content/modals/`; pinned index derived or post-step).

**Q2: Single array or multiple planes?**
→ One ordered `steps[]` array. Array order is provisioning order. Optional future `after` for non-local dependencies.

**Q3: How to model create vs link?**
→ `kind: canvas|list` with `ref` (content template) = create. `kind: workflow` with `link` (app workflow callback_id) = register channel-scoped trigger pointing at deploy-time workflow. Modal is not a channel object — opened by workflow.

**Q4: How to model tabs?**
→ Opt-in only: `"tab": true` attaches as channel tab (canvas via `canvases.create` + `channel_id`). Absent field = no tab. Reject or ignore explicit `tab: false`.

**Q5: How to model bookmarks for lists?**
→ Opt-in only: `"bookmark": true` calls `bookmarks.add` with list deep link after create. Lists cannot use native list tabs today (Slack API unavailable). Bookmark is explicit in code today, not a side effect of `slackLists.create`. No separate folder API — Slack Bookmarks bar receives flat link bookmarks; no programmatic bookmark folder creation documented.

**Q6: Schema enforcement for tab/bookmark?**
→ JSON Schema uses conditional branches per `kind`: canvas allows optional `tab` (const true); list allows optional `bookmark` (const true); workflow requires `link`, forbids tab/bookmark.

**Q7: What happens to context_slot_map and navigation?**
→ Keep slot→`TesEventContext` bridging via convention (`id` → `{id}CanvasId` / list naming) or minimal internal map in provisioner — not in manifest. Pinned index links derived from steps with `title` + tab/bookmark presence (replaces `navigation.entries`).

**Q8: What stays outside the manifest?**
→ Pinned index post-step, dashboard re-render with onboarding link, delivery canvas on `accept_proposals`, gates in TypeScript.

## Agreed manifest shape (tes-event)

```json
{
  "version": "1.0.0",
  "steps": [
    { "id": "dashboard",        "kind": "canvas", "ref": "dashboard",        "title": "Dashboard",        "tab": true },
    { "id": "situation_report", "kind": "canvas", "ref": "situation-report", "title": "Situation Report", "tab": true },
    { "id": "infrastructure",   "kind": "canvas", "ref": "infrastructure",   "title": "Infrastructure",   "tab": true },
    { "id": "requirements",     "kind": "canvas", "ref": "requirements",     "title": "Requirements" },
    { "id": "deliverables",     "kind": "list",   "ref": "deliverables",     "bookmark": true },
    { "id": "incidents",        "kind": "list",   "ref": "incidents",        "bookmark": true },
    { "id": "onboarding",       "kind": "workflow", "link": "open_onboarding_workflow" }
  ]
}
```

## Trade-offs

- **[Trade-off]** Removing `navigation` from manifest → pinned index order must be derived (steps order + titles) or configured elsewhere. **Accepted** — eliminates quadruple declaration of same objects.
- **[Trade-off]** Keeping flat `TesEventContext` fields vs `slots` record. **Deferred** — convention-based bridge in provisioner for non-breaking migration.
- **[Trade-off]** List tab API probe removed when `bookmark: true` → faster provision, matches Slack reality. **Accepted**.
- **[Risk]** Existing embedded content / tests assume old manifest shape → update resolver, schema, embed script, composition tests in same change.

## Out of scope

- Bookmark folder nesting (`parent_id`) until Slack documents folder creation
- `TesEventContext.slots`-only migration
- Wiring `gates[]` from manifest
- Additional channel types beyond `tes-event`
