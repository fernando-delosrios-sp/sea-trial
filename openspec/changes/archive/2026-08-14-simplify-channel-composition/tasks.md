## 1. Schema and resolver

- [x] 1.1 Replace `composition.schema.json` with `steps[]` model and kind-scoped `tab` / `bookmark` / `link` conditionals
- [x] 1.2 Update `CompositionManifest` types and `composition-resolver.ts` to parse/validate steps
- [x] 1.3 Move id→`TesEventContext` field bridge to internal convention map in resolver (remove manifest `context_slot_map`)
- [x] 1.4 Rewrite `content/channels/tes-event.json` to agreed steps shape

## 2. Provisioner and surfacing

- [x] 2.1 Refactor `channel-provisioner.ts` to iterate `steps` in order (single loop)
- [x] 2.2 Apply `tab: true` for canvas steps via channel tab attach
- [x] 2.3 Apply `bookmark: true` for list steps via `bookmarks.add` (remove list tab API probe path)
- [x] 2.4 Handle `kind: workflow` with `link` for onboarding channel shortcut
- [x] 2.5 Keep post-steps: pinned index message and dashboard finalize with onboarding link

## 3. Pinned index derivation

- [x] 3.1 Update `message-renderer.ts` to build navigation links from steps with `title` in order
- [x] 3.2 Remove dependency on `navigation.entries` from composition manifest

## 4. Embed content and cleanup

- [x] 4.1 Regenerate or update embedded content for new manifest shape (`embed-content.ts`)
- [x] 4.2 Remove dead manifest planes from resolver validation (`gates`, `modals`, `navigation`, `organization`, `dynamic_resources`, `chrome`/`resources` split)

## 5. Tests

- [x] 5.1 Update `composition_test.ts` for steps model, tab/bookmark flags, and schema rejection cases
- [x] 5.2 Update `lists_test.ts` for bookmark-only attach when driven by manifest flag
- [x] 5.3 Update `slack_content_test.ts` pinned index tests for step-derived navigation
- [x] 5.4 Assert provisioner integration test: canvas tabs, list bookmarks, workflow link order unchanged for tes-event

## 6. Documentation

- [x] 6.1 Update README channel composition section for `steps[]`, `tab`, and `bookmark`
- [x] 6.2 Update `docs/smoke-test-checklist.md` list attachment wording (bookmarks, not tabs) if still inconsistent

## 7. Changelog

- [x] 7.1 Create or update changelog entry (apply invokes changelog-generator if available)
- [x] 7.2 Confirm entry covers simplified channel manifest and bookmark-opt-in list surfacing
