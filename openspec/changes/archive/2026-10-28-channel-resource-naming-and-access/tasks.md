## 1. Canvas Channel Access Helper

- [x] 1.1 Add `canvases.access.set` to `SlackCanvasClient` interface in `slack-app/lib/canvas.ts`
- [x] 1.2 Implement `setCanvasChannelAccess(client, canvasId, channelId, accessLevel)` helper in `slack-app/lib/canvas.ts`
- [x] 1.3 Add unit tests in `slack-app/tests/canvas_test.ts` for `setCanvasChannelAccess` success and error handling

## 2. Resource Title Suffixing & Provisioning Integration

- [x] 2.1 Update `provisionCanvasStep` in `slack-app/lib/content/channel-provisioner.ts` to title canvases as `${title} [${channelName}]` and call `setCanvasChannelAccess` with write permission
- [x] 2.2 Update list name compilation/creation in `slack-app/lib/content/channel-provisioner.ts` and `slack-app/lib/lists.ts` to title lists as `${title} [${channelName}]` while keeping bookmark titles clean (`step.title`)
- [x] 2.3 Pass channel name through `ProvisionInputs` / `TesEventContext` into provisioning steps
- [x] 2.4 Update `slack-app/tests/composition_test.ts` to verify suffixed canvas/list titles and canvas channel access call
- [x] 2.5 Update `slack-app/tests/lists_test.ts` to verify suffixed list creation and clean bookmark titles

## 3. Verification

- [x] 3.1 Run canonical test command: `deno task test` in `slack-app/`
- [x] 3.2 Ensure all delta spec scenarios pass

## 4. Documentation

- [x] 4.1 Update `README.md` and channel provisioning docs to describe the `[<channel-name>]` title suffix convention and automatic channel-level access inheritance

## 5. Changelog

- [x] 5.1 Create changelog entry using `changelog-generator`
- [x] 5.2 Confirm changelog covers resource naming suffix and canvas channel access inheritance
