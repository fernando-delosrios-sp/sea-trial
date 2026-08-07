# Brainstorm: channel-composition-engine

## Context

With domain JSON and declarative UI content in place, channel structure remains implicit in `seed_channel_objects/mod.ts`: hardcoded object set, manual create order, flat `TesEventContext` ID fields, gates wired ad hoc. Exploration defined a composition manifest with four planes (resources, chrome, automation, organization), extensible kind registry, slot-based linking, and dynamic resources (delivery canvases). Slack channel templates rejected.

## Decision chain

**Q1: Single manifest or multiple?**
→ One `content/channels/tes-event.json` for MVP; future channel types as additional manifests.

**Q2: How to extend for folders, featured workflows, bookmarks?**
→ Open kind registry (`content/kinds/*.json`); `api_availability` gates handlers (declare now, provision when API confirmed). Not hardcoded enum in composition schema.

**Q3: Slack channel templates as intermediate?**
→ No. JSON composition + API provisioner is source of truth.

**Q4: Context shape?**
→ Bridge: keep flat `TesEventContext` fields via `runtime.context_slot_map`; document path to `slots: Record<string, string>`.

**Q5: Provisioning order?**
→ Topological sort on `depends_on` (dashboard after other resources for metadata embedding).

**Q6: Scope vs declarative-slack-content?**
→ Change 2 moves content to files; this change wires *which* content pieces compose a channel and replaces seed orchestration with `channel-provisioner.ts`.

## Four planes

| Plane | Examples | Lifecycle |
|---|---|---|
| `resources[]` | canvases, lists | Seeded at channel create; IDs in context |
| `chrome[]` | pinned message, bookmarks, channel-tab toggles | Seeded/configured at create |
| `automation[]` | app triggers, featured workflows | Linked at create or conditional |
| `organization[]` | folders | Declare; skip if API unavailable |
| `dynamic_resources[]` | delivery canvas | Created by `accept_proposals` |

## Gates in composition

`gates[]` links onboarding gate, agent gate, deliverables write gate to slots/modals/roles — declarative lifecycle, enforced by existing handlers reading composition config.

## Out of scope (this change)

- List behavior Phase 2/3 (poll, Events API)
- Additional channel types beyond `tes-event`
- `TesEventContext` slots-only migration (bridge only)
- Salesforce record tabs

## Dependency

Requires `declarative-slack-content` merged (content refs must exist).
