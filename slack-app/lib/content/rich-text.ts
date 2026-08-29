/**
 * Flattens `rich_text_input` view state into plain text.
 * Each rich text section, list item, and embedded newline becomes one line,
 * so a bulleted list in the modal round-trips as one entry per line.
 */

/** Converts a `rich_text_value` payload into trimmed, non-empty lines. */
export function richTextValueToLines(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const elements = (value as { elements?: unknown }).elements;
  if (!Array.isArray(elements)) return [];
  return elements.flatMap(blockToLines);
}

/** Converts a `rich_text_value` payload into a newline-joined string. */
export function richTextValueToText(value: unknown): string {
  return richTextValueToLines(value).join("\n");
}

/** Builds a Slack `rich_text` payload from newline-separated plain text. */
export function textToRichTextValue(text: string): Record<string, unknown> {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length <= 1) {
    return {
      type: "rich_text",
      elements: [
        {
          type: "rich_text_section",
          elements: lines.length === 0
            ? []
            : [{ type: "text", text: lines[0] }],
        },
      ],
    };
  }

  return {
    type: "rich_text",
    elements: [
      {
        type: "rich_text_list",
        style: "bullet",
        elements: lines.map((line) => ({
          type: "rich_text_section",
          elements: [{ type: "text", text: line }],
        })),
      },
    ],
  };
}

function blockToLines(block: unknown): string[] {
  if (!block || typeof block !== "object") return [];
  const row = block as { type?: unknown; elements?: unknown };
  if (!Array.isArray(row.elements)) return [];

  if (row.type === "rich_text_list") {
    return row.elements.flatMap(blockToLines);
  }

  return splitLines(row.elements.map(inlineToText).join(""));
}

function inlineToText(element: unknown): string {
  if (!element || typeof element !== "object") return "";
  const row = element as Record<string, unknown>;
  const text = typeof row.text === "string" ? row.text : "";

  switch (row.type) {
    case "link": {
      const url = typeof row.url === "string" ? row.url : "";
      return text.trim() !== "" ? text : url;
    }
    case "user":
      return typeof row.user_id === "string" ? `<@${row.user_id}>` : "";
    case "usergroup":
      return typeof row.usergroup_id === "string"
        ? `<!subteam^${row.usergroup_id}>`
        : "";
    case "channel":
      return typeof row.channel_id === "string" ? `<#${row.channel_id}>` : "";
    case "emoji":
      return typeof row.name === "string" ? `:${row.name}:` : "";
    case "broadcast":
      return typeof row.range === "string" ? `@${row.range}` : "";
    default:
      return text;
  }
}

function splitLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
