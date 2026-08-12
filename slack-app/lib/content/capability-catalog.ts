import { readEmbeddedContentJson } from "./embedded-content.generated.ts";

export interface ElementCapability {
  forbidden_properties?: string[];
}

export interface ColumnCapability {
  forbidden_properties?: string[];
  requires_options_or_ref?: boolean;
}

export interface ModalCatalog {
  surface: "modal";
  version: string;
  input_elements: Record<string, ElementCapability>;
}

export interface ListCatalog {
  surface: "list";
  version: string;
  column_types: Record<string, ColumnCapability>;
}

export interface MessageCatalog {
  surface: "message";
  version: string;
  block_types: Record<string, Record<string, never>>;
}

export interface CanvasCatalog {
  surface: "canvas";
  version: string;
  file_suffix: string;
  forbidden_patterns: string[];
}

export interface ExtensionsCatalog {
  surface: "extensions";
  version: string;
  modal: { allowed_root_properties: string[] };
  list: {
    allowed_root_properties: string[];
    allowed_column_properties: string[];
  };
}

export interface DomainRefEntry {
  source: string;
  resolver: string;
  select_format?: string;
}

export interface DomainRefsCatalog {
  surface: "domain-refs";
  version: string;
  refs: Record<string, DomainRefEntry>;
}

let cachedModal: ModalCatalog | null = null;
let cachedList: ListCatalog | null = null;
let cachedMessage: MessageCatalog | null = null;
let cachedCanvas: CanvasCatalog | null = null;
let cachedExtensions: ExtensionsCatalog | null = null;
let cachedDomainRefs: DomainRefsCatalog | null = null;

function readCatalog<T>(filename: string): T {
  return readEmbeddedContentJson(`schemas/capabilities/${filename}`) as T;
}

export function loadModalCatalog(): ModalCatalog {
  if (!cachedModal) {
    cachedModal = readCatalog<ModalCatalog>("modal.v1.json");
  }
  return cachedModal;
}

export function loadListCatalog(): ListCatalog {
  if (!cachedList) {
    cachedList = readCatalog<ListCatalog>("list.v1.json");
  }
  return cachedList;
}

export function loadMessageCatalog(): MessageCatalog {
  if (!cachedMessage) {
    cachedMessage = readCatalog<MessageCatalog>("message.v1.json");
  }
  return cachedMessage;
}

export function loadCanvasCatalog(): CanvasCatalog {
  if (!cachedCanvas) {
    cachedCanvas = readCatalog<CanvasCatalog>("canvas.v1.json");
  }
  return cachedCanvas;
}

export function loadExtensionsCatalog(): ExtensionsCatalog {
  if (!cachedExtensions) {
    cachedExtensions = readCatalog<ExtensionsCatalog>("extensions.v1.json");
  }
  return cachedExtensions;
}

export function loadDomainRefsCatalog(): DomainRefsCatalog {
  if (!cachedDomainRefs) {
    cachedDomainRefs = readCatalog<DomainRefsCatalog>("domain-refs.v1.json");
  }
  return cachedDomainRefs;
}

/** Expected full Slack-documented modal input element types. */
export const EXPECTED_MODAL_INPUT_ELEMENTS = [
  "plain_text_input",
  "rich_text_input",
  "static_select",
  "external_select",
  "multi_static_select",
  "users_select",
  "multi_users_select",
  "conversations_select",
  "channels_select",
  "radio_buttons",
  "checkboxes",
  "datepicker",
  "datetimepicker",
  "timepicker",
  "number_input",
  "email_text_input",
  "url_text_input",
  "file_input",
] as const;

/** Expected full Slack-documented list column types. */
export const EXPECTED_LIST_COLUMN_TYPES = [
  "text",
  "rich_text",
  "select",
  "multi_select",
  "user",
  "assignee",
  "date",
  "due_date",
  "link",
  "checkbox",
  "number",
  "email",
  "phone",
  "channel",
  "attachment",
  "message",
  "canvas",
  "rating",
  "vote",
  "completed",
] as const;

/** Expected full Slack-documented message block types. */
export const EXPECTED_MESSAGE_BLOCK_TYPES = [
  "section",
  "divider",
  "image",
  "actions",
  "context",
  "input",
  "file",
  "header",
  "video",
  "rich_text",
] as const;

export function getRegisteredDomainRef(ref: string): string | undefined {
  return loadDomainRefsCatalog().refs[ref]?.source;
}

export function getRegisteredDomainRefEntry(ref: string): DomainRefEntry | undefined {
  return loadDomainRefsCatalog().refs[ref];
}

export function listRegisteredDomainRefs(): string[] {
  return Object.keys(loadDomainRefsCatalog().refs);
}

/** Resets cached catalogs — for tests only. */
export function resetCapabilityCatalogCacheForTests(): void {
  cachedModal = null;
  cachedList = null;
  cachedMessage = null;
  cachedCanvas = null;
  cachedExtensions = null;
  cachedDomainRefs = null;
}
