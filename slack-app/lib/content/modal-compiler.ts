import {
  validateModalBlocks,
  validateModalDynamicOverlay,
  validateModalRoot,
} from "./capability-validator.ts";
import { resolveModalSelectOptionsRef } from "./domain-ref-resolver.ts";
import { readContentJson } from "./paths.ts";

export interface ModalDefinition {
  callback_id: string;
  title: Record<string, unknown>;
  submit: Record<string, unknown>;
  blocks: Array<Record<string, unknown>>;
  contract: { block_ids: string[] };
  dynamic?: Record<string, Record<string, string>>;
}

export interface OnboardingModalParams {
  channelId: string;
  dashboardCanvasContent: string;
  accountName?: string;
}

const MODAL_FILES: Record<string, string> = {
  "create-tes-event": "modals/create-tes-event.json",
  onboarding: "modals/onboarding.json",
};

let cachedModals: Map<string, ModalDefinition> | null = null;

function validateModalDefinition(data: unknown, source: string): ModalDefinition {
  if (!data || typeof data !== "object") {
    throw new Error(`${source} must be an object`);
  }
  const row = data as Record<string, unknown>;
  validateModalRoot(row, source);
  const callback_id = requireString(row, "callback_id", source);
  const title = requireObject(row, "title", source);
  const submit = requireObject(row, "submit", source);
  const blocks = requireBlocks(row, source);
  const contract = requireContract(row, source);
  const dynamic = row.dynamic;

  if (dynamic !== undefined && (typeof dynamic !== "object" || Array.isArray(dynamic))) {
    throw new Error(`${source} dynamic must be an object when present`);
  }

  assertBlockIdContract(blocks, contract.block_ids, source);
  validateModalBlocks(blocks, source);
  validateModalDynamicOverlay(
    dynamic as Record<string, Record<string, string>> | undefined,
    source,
  );

  return {
    callback_id,
    title,
    submit,
    blocks,
    contract,
    dynamic: dynamic as Record<string, Record<string, string>> | undefined,
  };
}

function requireString(
  row: Record<string, unknown>,
  key: string,
  source: string,
): string {
  const value = row[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${source} must contain a non-empty ${key}`);
  }
  return value.trim();
}

function requireObject(
  row: Record<string, unknown>,
  key: string,
  source: string,
): Record<string, unknown> {
  const value = row[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${source} must contain ${key} object`);
  }
  return value as Record<string, unknown>;
}

function requireBlocks(
  row: Record<string, unknown>,
  source: string,
): Array<Record<string, unknown>> {
  const blocks = row.blocks;
  if (!Array.isArray(blocks) || blocks.length === 0) {
    throw new Error(`${source} must contain a non-empty blocks array`);
  }
  return blocks as Array<Record<string, unknown>>;
}

function requireContract(
  row: Record<string, unknown>,
  source: string,
): { block_ids: string[] } {
  const contract = row.contract;
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
    throw new Error(`${source} must contain contract object`);
  }
  const block_ids = (contract as Record<string, unknown>).block_ids;
  if (!Array.isArray(block_ids) || block_ids.length === 0) {
    throw new Error(`${source} contract.block_ids must be a non-empty array`);
  }
  for (const [index, id] of block_ids.entries()) {
    if (typeof id !== "string" || id.trim() === "") {
      throw new Error(`${source} contract.block_ids[${index}] must be a non-empty string`);
    }
  }
  return { block_ids: block_ids as string[] };
}

function assertBlockIdContract(
  blocks: Array<Record<string, unknown>>,
  contractIds: string[],
  source: string,
): void {
  const blockIds = blocks.map((block, index) => {
    const block_id = block.block_id;
    if (typeof block_id !== "string" || block_id.trim() === "") {
      throw new Error(`${source} blocks[${index}] must have block_id`);
    }
    return block_id;
  });

  if (blockIds.length !== contractIds.length) {
    throw new Error(
      `${source} contract.block_ids length must match blocks length`,
    );
  }

  for (let i = 0; i < contractIds.length; i++) {
    if (blockIds[i] !== contractIds[i]) {
      throw new Error(
        `${source} contract.block_ids[${i}] must match blocks[${i}].block_id`,
      );
    }
  }
}

function loadModal(name: string): ModalDefinition {
  if (!cachedModals) {
    cachedModals = new Map();
  }
  const cached = cachedModals.get(name);
  if (cached) return cached;

  const relativePath = MODAL_FILES[name];
  if (!relativePath) {
    throw new Error(`Unknown modal: ${name}`);
  }

  const data = readContentJson(relativePath);
  const modal = validateModalDefinition(data, relativePath);
  cachedModals.set(name, modal);
  return modal;
}

/** Resets cached modal definitions — for tests only. */
export function resetModalCacheForTests(): void {
  cachedModals = null;
}

/** Parses and validates modal JSON from raw string — for tests. */
export function parseModalJson(raw: string, source = "modal"): ModalDefinition {
  return validateModalDefinition(JSON.parse(raw), source);
}

/** Returns declared block IDs for a modal content file. */
export function getModalBlockIds(modalName: string): readonly string[] {
  return [...loadModal(modalName).contract.block_ids];
}

/** Builds the Create TES Event modal view from declarative JSON. */
export function buildCreateTesEventModalView(): Record<string, unknown> {
  const modal = loadModal("create-tes-event");
  return {
    type: "modal",
    callback_id: modal.callback_id,
    title: modal.title,
    submit: modal.submit,
    blocks: cloneBlocks(modal.blocks),
  };
}

/** Builds the onboarding modal view with dynamic domain overlay. */
export function buildOnboardingModalView(
  params: OnboardingModalParams,
): Record<string, unknown> {
  const modal = loadModal("onboarding");
  const blocks = cloneBlocks(modal.blocks);

  applyDynamicOverlay(blocks, modal.dynamic, params);

  return {
    type: "modal",
    callback_id: modal.callback_id,
    private_metadata: JSON.stringify({
      channel_id: params.channelId,
      dashboard_canvas_content: params.dashboardCanvasContent,
    }),
    title: modal.title,
    submit: modal.submit,
    blocks,
  };
}

function cloneBlocks(
  blocks: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  return structuredClone(blocks);
}

function applyDynamicOverlay(
  blocks: Array<Record<string, unknown>>,
  dynamic: Record<string, Record<string, string>> | undefined,
  params: OnboardingModalParams,
): void {
  if (!dynamic) return;

  for (const [blockId, config] of Object.entries(dynamic)) {
    const block = blocks.find((b) => b.block_id === blockId);
    if (!block) {
      throw new Error(`dynamic overlay references missing block_id: ${blockId}`);
    }
    const element = block.element as Record<string, unknown> | undefined;
    if (!element) continue;

    if (config.prefill === "accountName" && params.accountName) {
      element.initial_value = params.accountName;
    }

    if (config.options_ref) {
      element.options = resolveModalSelectOptionsRef(config.options_ref);
    }
  }
}

/** Block IDs for the Create TES Event modal (backward-compatible export). */
export const CREATE_TES_EVENT_MODAL_BLOCKS = getModalBlockIds("create-tes-event");

/** Block IDs for the onboarding modal (backward-compatible export). */
export const ONBOARDING_MODAL_BLOCKS = getModalBlockIds("onboarding");

