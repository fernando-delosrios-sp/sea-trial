## Why

Provisioning TES Event Channels creates Slack canvases, lists, and bookmarks with predictable display names (manifest titles, account-scoped list names, delivery canvas titles). When a name already exists in the workspace—often from a prior partial provision or a repeated account name—Slack rejects the create call and channel seeding fails entirely. Operators must manually rename or delete orphaned objects. Automatic suffix disambiguation (`name`, `name-1`, `name-2`, …) lets provisioning succeed without user intervention while preserving stable manifest step IDs and context mapping.

## What Changes

**Unique display names on create**
- From: Each create API call uses the requested name once; collision surfaces as a hard failure
- To: On name collision, retry with `-1`, `-2`, … suffixes until create succeeds or retry cap reached
- Reason: Repeat provisioning and workspace-wide name scope cause avoidable failures
- Impact: Non-breaking for happy path; display titles may differ from manifest when suffixed

**Shared collision helper**
- From: Name logic duplicated inline in canvas and list create paths
- To: Central `allocateUniqueName` helper with shared collision error detection and suffix formatting
- Reason: One policy for all provisioned Slack objects
- Impact: Non-breaking internal refactor

**Delivery canvas titles**
- From: `Delivery: {taskId}` create fails on duplicate task canvas title
- To: Same suffix policy applies before giving up
- Reason: Deliverables flow creates canvases dynamically with the same collision risk
- Impact: Non-breaking; suffixed delivery canvas titles possible

**Channel slug behavior**
- From: `name_taken` reuses existing `#proj-*-tes` channel
- To: Unchanged (out of scope)
- Reason: Channel identity semantics differ from canvas/list display names
- Impact: None

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `event-channel`: Channel object seeding SHALL disambiguate canvas, list, and bookmark display names on workspace collision using numeric suffixes
- `deliverables`: Delivery canvas creation SHALL disambiguate canvas titles on collision using the same suffix policy

## Impact

- `slack-app/lib/unique-resource-name.ts` — new shared suffix allocator
- `slack-app/lib/canvas.ts` — wrap create with unique name allocation
- `slack-app/lib/lists.ts` — list create and bookmark attach use allocated names
- `slack-app/lib/delivery-canvas-orchestrator.ts` — delivery canvas title allocation
- `slack-app/tests/canvas_test.ts`, `lists_test.ts`, provisioner/delivery tests — collision retry scenarios
- `openspec/specs/event-channel/spec.md`, `openspec/specs/deliverables/spec.md` — synced on archive
