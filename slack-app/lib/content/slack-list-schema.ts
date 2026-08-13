/** Slack Lists select choice colors — https://docs.slack.dev/reference/methods/slackLists.create */
const SLACK_SELECT_COLORS = new Set([
  "indigo",
  "blue",
  "cyan",
  "pink",
  "yellow",
  "green",
  "gray",
  "red",
  "purple",
  "orange",
  "brown",
]);

const DEFAULT_SELECT_COLOR = "gray";

/** Converts a human label to Slack's snake_case select value convention. */
export function toSlackListSelectValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Maps a Slack select value back to a known domain label when possible. */
export function fromSlackListSelectValue(
  slackValue: string,
  knownLabels: readonly string[],
): string {
  if (knownLabels.includes(slackValue)) return slackValue;
  const match = knownLabels.find((label) => toSlackListSelectValue(label) === slackValue);
  return match ?? slackValue;
}

const DELIVERABLE_STATUS_COLORS: Record<string, string> = {
  "Not started": "gray",
  "Not needed": "brown",
  "Not doable": "red",
  "In progress": "yellow",
  "Blocked": "red",
  "Validation required": "orange",
  "Accepted": "green",
  "Needs clarification": "purple",
};

const INCIDENT_STATUS_COLORS: Record<string, string> = {
  Open: "red",
  "In progress": "yellow",
  Resolved: "green",
};

export interface SlackListSchemaColumn {
  key: string;
  name: string;
  type: string;
  is_primary_column?: boolean;
  options?: {
    format?: string;
    choices?: Array<{ value: string; label: string; color?: string }>;
    [key: string]: unknown;
  };
}

function resolveSelectColor(value: string, explicit?: string): string {
  if (explicit && SLACK_SELECT_COLORS.has(explicit)) {
    return explicit;
  }
  return DELIVERABLE_STATUS_COLORS[value] ??
    INCIDENT_STATUS_COLORS[value] ??
    DEFAULT_SELECT_COLOR;
}

/** Ensures select columns match Slack Lists API expectations before create. */
export function finalizeSlackListSchema(
  schema: SlackListSchemaColumn[],
): SlackListSchemaColumn[] {
  return schema.map((column) => {
    if (column.type !== "select" && column.type !== "multi_select") {
      return column;
    }

    const options = column.options;
    if (!options?.choices?.length) {
      return column;
    }

    const format = column.type === "multi_select" ? "multi_select" : "single_select";
    return {
      ...column,
      options: {
        ...options,
        format: options.format ?? format,
        choices: options.choices.map((choice) => ({
          value: toSlackListSelectValue(choice.value),
          label: choice.label,
          color: resolveSelectColor(choice.value, choice.color),
        })),
      },
    };
  });
}
