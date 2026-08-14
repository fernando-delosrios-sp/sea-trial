# Brainstorm: workflow-channel-surfacing

## Context

After simplifying the channel manifest to `steps[]`, workflow steps use `kind: workflow` + `link` but provisioner still calls `workflows.triggers.create` per channel. Users see duplicate "Complete Onboarding" entries in `/` search (one per TES channel). Onboarding appears under **Bookmarked workflows** in the Workflows tab (desired) but is not declared via manifest flags. **Featured workflows** (composer replacement button) is a separate Slack surface from bookmarked workflows.

Actors: TES (provisions), AE/SE (run onboarding from Workflows tab or pinned index).

## Decision chain

**Q1: Featured vs bookmarked for workflows?**
→ Different APIs and UX. `featured: true` → `workflows.featured.add`. `bookmark: true` on workflow steps → associate trigger with channel Workflows tab bookmarked list (not header `bookmarks.add` used for lists).

**Q2: List `bookmark` vs workflow `bookmark`?**
→ Same JSON key, different meaning per kind. Schema enforces via `if/then` on `kind`. Lists → header Bookmarks bar. Workflows → Workflows tab bookmarked section.

**Q3: Per-channel trigger vs shared trigger?**
→ Shared deploy-time link trigger with dynamic `TriggerContextData.Shortcut.channel_id`. Per channel provision: `permissions.add(channel_ids: [channel])` and optional `workflows.featured.add`. Eliminates duplicate `/` entries and avoids baking channel IDs into trigger inputs.

**Q4: Channel-only visibility?**
→ `workflows.triggers.permissions.set` with `permission_type: named_entities`, then `permissions.add` with only the provisioned channel ID. Run access limited to channel members; not workspace `everyone`.

**Q5: Onboarding dashboard link input?**
→ Shared trigger passes dynamic `channel_id`; `dashboard_canvas_id` resolved at invoke from pinned index button value or canvas read (existing open_onboarding paths). Do not bake dashboard ID into deploy trigger when using shared model.

**Q6: Deploy-time trigger source?**
→ Enable `complete-onboarding` in `triggers.config.yaml` as global link trigger OR store trigger ID from deploy in env (`SLACK_ONBOARDING_TRIGGER_ID`). Provisioner references known trigger by ID/link map.

**Q7: Manifest change for tes-event?**
→ Add `"bookmark": true` to onboarding workflow step. No `featured` for onboarding MVP.

## Agreed manifest fragment

```json
{
  "id": "onboarding",
  "kind": "workflow",
  "link": "open_onboarding_workflow",
  "bookmark": true
}
```

## Trade-offs

- **[Trade-off]** Spike may confirm bookmarked-workflow API is permissions-only (no `workflows.bookmarked.*` public method). **Accepted** — document finding in design.
- **[Risk]** `workflows.featured.add` may require user token or admin workflow permission on tenant. **Mitigation:** spike on dev workspace; feature flag optional.
- **[Risk]** Existing channels have orphan per-channel triggers. **Migration:** document manual cleanup or leave stale triggers (non-blocking).

## Out of scope

- Retroactive removal of legacy per-channel onboarding triggers
- Featured onboarding workflow (composer button)
- Additional workflow kinds beyond onboarding link map
