/** Re-exports declarative Slack UI content loaders. */
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
  requirementsTemplate,
  resetCanvasCacheForTests,
} from "./canvas-renderer.ts";

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
  ListColumnDefinition,
  ListColumnOption,
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
  getDeliverableStatusChoices,
  getSupportedSuites,
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

