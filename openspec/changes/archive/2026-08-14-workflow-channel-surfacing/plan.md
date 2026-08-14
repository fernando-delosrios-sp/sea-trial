# Implementation Plan: workflow-channel-surfacing

**Goal:** Workflow steps support `bookmark`/`featured`; onboarding uses shared deploy trigger with channel-scoped permissions; no per-channel trigger create.

**Canonical test command:** `cd slack-app && deno task test`

---

## Task 1.1–1.3 — Schema and manifest

**Files:** `composition.schema.json`, `composition-resolver.ts`, `tes-event.json`

1. **RED:** Tests reject `bookmark` on canvas; accept on workflow; accept `featured` on workflow
2. Add workflow branch to JSON Schema
3. Extend `CompositionStep` workflow type with optional `bookmark?`, `featured?`
4. Add `bookmark: true` to onboarding step in manifest
5. **GREEN:** composition load tests pass

**Commit:** `feat(composition): workflow bookmark and featured flags`

---

## Task 2.1–2.3 — Deploy trigger registry

**Files:** `triggers.config.yaml`, `complete_onboarding.ts`, new `workflow-trigger-registry.ts`

1. Enable `complete-onboarding` global link trigger at deploy (or document `SLACK_ONBOARDING_TRIGGER_ID`)
2. Map `open_onboarding_workflow` → trigger ID via env or list lookup helper
3. **Commit:** `feat(triggers): deploy shared onboarding link trigger`

---

## Task 3.1–3.4 — Provisioner

**Files:** `onboarding-channel-trigger.ts`, `channel-provisioner.ts`

1. **RED:** Integration test expects zero `triggers.create` when provisioning two channels; two `permissions.add` with distinct channel IDs
2. Replace `provisionOnboardingChannelShortcut` with:
   - `resolveWorkflowTrigger(link)`
   - `permissions.set(named_entities)` if needed
   - `permissions.add(channel_ids: [channelId])`
   - if `step.featured`: `workflows.featured.add`
3. Remove baked `channel_id` / `dashboard_canvas_id` from create payload
4. **GREEN:** tests pass

**Commit:** `refactor(provisioner): shared workflow trigger with channel bookmark`

---

## Task 4.x — Scenario coverage map

| Scenario | Test |
|----------|------|
| Workflow bookmark/featured schema | `composition_test.ts` |
| Workflow bookmark opt-in | provisioner integration |
| Shared trigger no create | `onboarding_channel_trigger_test.ts` |
| Open onboarding from Workflows tab | manual smoke; invoke path covered by existing open_onboarding tests |
| Objects seeded with workflow bookmark | provisioner integration |

---

## Spike (apply step)

- Call `workflows.featured.add` with bot token on dev tenant before implementing `featured: true` path (optional if no step uses featured in tes-event)

**Commit:** `test: workflow channel surfacing coverage`
