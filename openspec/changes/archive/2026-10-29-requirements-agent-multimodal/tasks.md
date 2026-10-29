## 1. Shared Types & Contracts (packages/shared)

- [x] 1.1 Update `ParsedDocument` in `packages/shared` to support visual payloads (page image buffers/base64 strings, detected figures).
- [x] 1.2 Extend `ProcessRequirementsRequest` and `ProcessRequirementsResponse` to include requirements proposal diffs and source provenance metadata.
- [x] 1.3 Add types for `RequirementsProposal` and `RequirementsProposalGateAction` (`accept`, `edit`, `reject`).

## 2. Multimodal Document Parsing (agent-service)

- [x] 2.1 Add PDF page-to-image rendering support using Node-compatible rendering (`pdf-img-convert` or equivalent) in `agent-service/src/parsers/pdf.ts`.
- [x] 2.2 Add image format parser for PNG and JPEG files in `agent-service/src/parsers/image.ts`.
- [x] 2.3 Update `parseDocument` router in `agent-service/src/parsers/index.ts` to return image buffers alongside extracted text.
- [x] 2.4 Add unit tests in `agent-service/tests/parsers.test.ts` verifying page rendering for image-only and diagram-containing PDFs.

## 3. LangGraph Requirements Agent Pipeline (agent-service)

- [x] 3.1 Update `parseDocuments` graph node to pass image buffers and raw text into state.
- [x] 3.2 Update `analyzeRequirements` graph node to invoke multimodal vision LLM with image buffers and format requirements with source provenance tags (`[filename.ext]`).
- [x] 3.3 Implement document revision reconciliation logic in `analyzeRequirements` to identify and supersede existing canvas requirements matching revised document names.
- [x] 3.4 Update `formatOutput` node to output both updated canvas markdown and the staged requirements proposal summary.
- [x] 3.5 Add unit tests in `agent-service/tests/semantic-analyzer.test.ts` verifying multimodal prompt assembly, source tagging, and revision superseding.

## 4. Staged Review Gate & Slack Interactions (slack-app)

- [x] 4.1 Update Requirements Agent invocation handler in `slack-app/functions/invoke_agent/mod.ts` to post a proposal summary to the invocation thread instead of immediately overwriting the canvas.
- [x] 4.2 Build Block Kit message template for the Requirements Proposal Gate with an `[Accept & Update Canvas]` action button and refinement guidance.
- [x] 4.3 Implement action handler for `[Accept & Update Canvas]` that invokes `canvases.edit` to apply proposed markdown to the Requirements Canvas and updates the thread message.
- [x] 4.4 Update thread reply listener to allow multi-turn refinement (`@Sea Trial requirements [instructions]`) by re-invoking `agent-service` with feedback.
- [x] 4.5 Add tests in `slack-app/tests/agent_invoke_test.ts` verifying the staged approval gate flow and canvas update execution.

## 5. Verification

- [x] 5.1 Confirm canonical test commands: `npm test` in `agent-service/` and `deno task test` in `slack-app/`.
- [x] 5.2 Verify all delta spec scenarios pass automated tests across parser, agent-service, and slack-app.

## 6. Documentation

- [x] 6.1 Update `agent-service/README.md` with multimodal vision configuration requirements and supported document formats.
- [x] 6.2 Update `openspec/specs/requirements-agent/spec.md` with multimodal pipeline and staged proposal gate behavior upon change archive.
- [x] 6.3 Update `openspec/specs/ubiquitous-language/spec.md` with definitions for Multimodal Document Pipeline, Source Provenance Tag, and Requirements Proposal Gate upon change archive.

## 7. Changelog

- [x] 7.1 Create changelog entry for `requirements-agent-multimodal` using changelog-generator.
- [x] 7.2 Confirm changelog entry covers multimodal vision parsing, staged review gate, and source provenance tagging.

