/** Re-exports declarative Slack UI content loaders. */
export {
  EXPECTED_LIST_COLUMN_TYPES,
  EXPECTED_MESSAGE_BLOCK_TYPES,
  EXPECTED_MODAL_INPUT_ELEMENTS,
  getRegisteredDomainRef,
  listRegisteredDomainRefs,
  loadCanvasCatalog,
  loadListCatalog,
  loadMessageCatalog,
  loadModalCatalog,
  resetCapabilityCatalogCacheForTests,
} from "./capability-catalog.ts";

export {
  resolveListOptionsRef,
  resolveModalSelectOptionsRef,
} from "./domain-ref-resolver.ts";

export {
  validateCanvasTemplateSource,
  validateListColumns,
  validateMessageBlocks,
  validateModalBlocks,
  validateModalDynamicOverlay,
  validateModalRoot,
} from "./capability-validator.ts";

export {
  buildCreateTesEventModalView,
  buildOnboardingModalView,
  CREATE_TES_EVENT_MODAL_BLOCKS,
  getModalBlockIds,
  ONBOARDING_MODAL_BLOCKS,
  parseModalJson,
  resetModalCacheForTests,
} from "./modal-compiler.ts";
export type { ModalDefinition, OnboardingModalParams } from "./modal-compiler.ts";

export {
  dashboardTemplate,
  infrastructureTemplate,
  renderDashboardCanvas,
  renderInfrastructureCanvas,
  renderRequirementsCanvas,
  renderSituationReportSeedCanvas,
  requirementsTemplate,
  resetCanvasCacheForTests,
} from "./canvas-renderer.ts";

export {
  applyCanvasAssetUrls,
  findCanvasImageRefs,
  renderDashboardCanvasForSlack,
  resolveCanvasAssetUrls,
} from "./canvas-assets.ts";
export type { CanvasAssetUploadClient } from "./canvas-assets.ts";

export {
  getDeliverablesStatusOptions,
  getListColumns,
  getListName,
  getSlackListSchema,
  DELIVERABLES_COLUMNS,
  INCIDENTS_COLUMNS,
  parseListJson,
  resetListCacheForTests,
} from "./list-compiler.ts";
export type {
  ListColumnChoice,
  ListColumnDefinition,
  ListColumnOptions,
  ListDefinition,
  SlackListColumn,
} from "./list-compiler.ts";

export {
  pinnedIndexBlocks,
  pinnedIndexMessage,
  renderPinnedIndexBlocks,
  renderPinnedIndexMessage,
  resetMessageCacheForTests,
} from "./message-renderer.ts";

export {
  deriveComponents,
  getCustomerDeliverableStatusMap,
  getDeliverableStatusChoices,
  getSupportedSuites,
  mapToCustomerStatus,
  parseCustomerDeliverableStatusesJson,
  parseDeliverableStatusesJson,
  parseSailpointSuitesJson,
  resetDomainCacheForTests,
} from "./domain.ts";

export {
  applySlotIds,
  getContextFieldForSlot,
  loadComposition,
  parseCompositionJson,
  resolveProvisioningOrder,
  resetCompositionCacheForTests,
} from "./composition-resolver.ts";
export type {
  CompositionManifest,
  NavigationEntry,
  ProvisionEntry,
} from "./composition-resolver.ts";

export {
  isKindProvisionable,
  loadKindDefinition,
  resetKindCacheForTests,
} from "./kind-registry.ts";
export type { ApiAvailability, KindDefinition } from "./kind-registry.ts";

export {
  provisionChannel,
  serializeProvisionedContext,
} from "./channel-provisioner.ts";
export type { ChannelProvisionClient, ProvisionInputs } from "./channel-provisioner.ts";



