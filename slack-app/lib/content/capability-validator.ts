import {
  loadCanvasCatalog,
  loadExtensionsCatalog,
  loadListCatalog,
  loadMessageCatalog,
  loadModalCatalog,
  getRegisteredDomainRef,
} from "./capability-catalog.ts";

const TES_LIST_COLUMN_PROPS = new Set(["key", "name", "type", "options", "options_ref"]);

function assertForbiddenProperties(
  obj: Record<string, unknown>,
  forbidden: string[] | undefined,
  context: string,
): void {
  if (!forbidden?.length) return;
  for (const key of forbidden) {
    if (key in obj) {
      throw new Error(`${context} must not contain property "${key}"`);
    }
  }
}

function validateElementProperties(
  element: Record<string, unknown>,
  source: string,
): void {
  const elementType = element.type;
  if (typeof elementType !== "string") {
    throw new Error(`${source} element must have type string`);
  }

  const catalog = loadModalCatalog();
  const capability = catalog.input_elements[elementType];
  if (!capability) {
    throw new Error(`${source} unknown element.type "${elementType}"`);
  }

  assertForbiddenProperties(element, capability.forbidden_properties, source);
}

/** Validates modal file root keys and TES extensions against the catalog. */
export function validateModalRoot(
  row: Record<string, unknown>,
  source: string,
): void {
  const extensions = loadExtensionsCatalog();
  const allowed = new Set([
    "callback_id",
    "title",
    "submit",
    "blocks",
    "$schema",
    ...extensions.modal.allowed_root_properties,
  ]);

  for (const key of Object.keys(row)) {
    if (!allowed.has(key)) {
      throw new Error(`${source} unknown root property "${key}"`);
    }
  }
}

/** Validates modal JSON blocks against the capability catalog. */
export function validateModalBlocks(
  blocks: Array<Record<string, unknown>>,
  source: string,
): void {
  for (const [index, block] of blocks.entries()) {
    const blockSource = `${source} blocks[${index}]`;
    const blockType = block.type;
    if (blockType !== "input") {
      throw new Error(`${blockSource} must be type "input" for form modals`);
    }
    const element = block.element;
    if (!element || typeof element !== "object" || Array.isArray(element)) {
      throw new Error(`${blockSource} must contain element object`);
    }
    validateElementProperties(element as Record<string, unknown>, blockSource);
  }
}

function parseListOptions(
  column: Record<string, unknown>,
  source: string,
): Record<string, unknown> | undefined {
  const options = column.options;
  if (options === undefined) return undefined;

  if (Array.isArray(options)) {
    throw new Error(
      `${source} options must use Slack shape { format, choices[] }, not a root array`,
    );
  }

  if (typeof options !== "object" || options === null) {
    throw new Error(`${source} options must be an object`);
  }

  const optionsObj = options as Record<string, unknown>;
  if (!Array.isArray(optionsObj.choices)) {
    throw new Error(`${source} options.choices must be an array`);
  }

  return optionsObj;
}

/** Validates list column definitions against the capability catalog. */
export function validateListColumns(
  columns: unknown[],
  source: string,
): void {
  const catalog = loadListCatalog();
  const extensions = loadExtensionsCatalog();

  for (const [index, col] of columns.entries()) {
    if (!col || typeof col !== "object") {
      throw new Error(`${source} columns[${index}] must be an object`);
    }
    const column = col as Record<string, unknown>;
    const colSource = `${source} columns[${index}]`;
    const type = column.type;
    if (typeof type !== "string") {
      throw new Error(`${colSource} must have type string`);
    }

    const capability = catalog.column_types[type];
    if (!capability) {
      throw new Error(`${colSource} unknown column.type "${type}"`);
    }

    for (const key of Object.keys(column)) {
      if (!TES_LIST_COLUMN_PROPS.has(key) && key !== "options") {
        const allowed = extensions.list.allowed_column_properties.includes(key);
        if (!allowed) {
          throw new Error(`${colSource} unknown property "${key}"`);
        }
      }
    }

    assertForbiddenProperties(column, capability.forbidden_properties, colSource);

    const optionsRef = column.options_ref;
    const hasRef = typeof optionsRef === "string" && optionsRef.length > 0;
    const hasInlineOptions = column.options !== undefined;

    if (hasRef && hasInlineOptions) {
      throw new Error(`${colSource} must not have both options_ref and inline options`);
    }

    if (hasRef) {
      if (!getRegisteredDomainRef(optionsRef as string)) {
        throw new Error(`${colSource} unknown options_ref "${optionsRef}"`);
      }
    }

    if (capability.requires_options_or_ref) {
      if (!hasRef && !hasInlineOptions) {
        throw new Error(
          `${colSource} type "${type}" requires options or options_ref`,
        );
      }
    }

    if (hasInlineOptions) {
      if (Array.isArray(column.options)) {
        throw new Error(
          `${colSource} options must use Slack shape object, not a root array`,
        );
      }
      if (capability.requires_options_or_ref) {
        parseListOptions(column, colSource);
      } else if (typeof column.options !== "object" || column.options === null) {
        throw new Error(`${colSource} options must be an object`);
      }
    }
  }
}

/** Validates rendered message Block Kit blocks. */
export function validateMessageBlocks(
  blocks: unknown[],
  source: string,
): void {
  const catalog = loadMessageCatalog();

  if (!Array.isArray(blocks)) {
    throw new Error(`${source} blocks must be an array`);
  }

  for (const [index, block] of blocks.entries()) {
    if (!block || typeof block !== "object") {
      throw new Error(`${source} blocks[${index}] must be an object`);
    }
    const blockType = (block as Record<string, unknown>).type;
    if (typeof blockType !== "string") {
      throw new Error(`${source} blocks[${index}] must have type string`);
    }
    if (!catalog.block_types[blockType]) {
      throw new Error(`${source} unknown block.type "${blockType}"`);
    }
  }
}

/** Validates canvas template source text. */
export function validateCanvasTemplateSource(
  sourceText: string,
  source: string,
): void {
  const catalog = loadCanvasCatalog();
  for (const pattern of catalog.forbidden_patterns) {
    if (sourceText.includes(pattern)) {
      throw new Error(
        `${source} must not contain forbidden pattern "${pattern}" in author templates`,
      );
    }
  }
}

/** Validates modal dynamic overlay refs against domain registry. */
export function validateModalDynamicOverlay(
  dynamic: Record<string, Record<string, string>> | undefined,
  source: string,
): void {
  if (!dynamic) return;

  for (const [blockId, config] of Object.entries(dynamic)) {
    const ref = config.options_ref;
    if (ref && !getRegisteredDomainRef(ref)) {
      throw new Error(
        `${source} dynamic.${blockId}.options_ref unknown ref "${ref}"`,
      );
    }
  }
}
