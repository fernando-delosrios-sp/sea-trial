## 1. Composition content

- [x] 1.1 Add `content/channels/tes-event.json` with resources, chrome, gates, modals, navigation, slots
- [x] 1.2 Add `content/kinds/*.v1.json` kind registry (canvas, list, message, modal)
- [x] 1.3 Add `schemas/content/composition.schema.json`

## 2. Resolver and registry

- [x] 2.1 Add `composition-resolver.ts` — load, validate, topological sort, slot map
- [x] 2.2 Add `kind-registry.ts` — load kinds, `api_availability` gate
- [x] 2.3 Add `composition_test.ts` — schema, order, slot bridge, navigation

## 3. Provisioner and refactor

- [x] 3.1 Add `channel-provisioner.ts` — orchestrate creates, metadata, pin message
- [x] 3.2 Refactor `seed_channel_objects/mod.ts` to thin executor
- [x] 3.3 Update `message-renderer.ts` for navigation entries from composition
- [x] 3.4 Add optional `channelType` / `compositionVersion` to `TesEventContext`

## 4. Spec scenario coverage

- [x] 4.1 Delta spec: channel-composition — manifest, kind registry, provisioning order
- [x] 4.2 Delta spec: event-channel — composition-driven seeding, slot map round-trip

## 5. Documentation and archive

- [x] 5.1 Update README — document composition manifest and provisioner
- [x] 5.2 Add CHANGELOG entry for channel-composition-engine
- [x] 5.3 Mark all tasks complete; write verify.md PASS
- [ ] 5.4 Squash merge to main; run `openspec archive channel-composition-engine -y`
