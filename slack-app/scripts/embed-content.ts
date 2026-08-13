/**
 * Generates bundled content modules for Slack hosted runtime.
 * Run before deploy: deno task embed-content
 */
import Handlebars from "handlebars";
import { encodeBase64 } from "std/encoding/base64.ts";
import { join } from "std/path/join.ts";

const ROOT = new URL("../", import.meta.url).pathname;
const OUT_CONTENT = join(ROOT, "lib/content/embedded-content.generated.ts");
const OUT_ASSETS = join(ROOT, "lib/content/embedded-assets.generated.ts");
const OUT_TEMPLATES = join(ROOT, "lib/content/embedded-templates.generated.ts");

const JSON_FILES = [
  "content/modals/create-tes-event.json",
  "content/modals/onboarding.json",
  "content/channels/tes-event.json",
  "content/lists/deliverables.json",
  "content/lists/incidents.json",
  "content/kinds/canvas.v1.json",
  "content/kinds/list.v1.json",
  "content/kinds/message.v1.json",
  "content/kinds/modal.v1.json",
  "content/domain/sailpoint-suites.json",
  "content/domain/deliverable-statuses.json",
  "content/domain/customer-deliverable-statuses.json",
  "schemas/content/capabilities/modal.v1.json",
  "schemas/content/capabilities/list.v1.json",
  "schemas/content/capabilities/message.v1.json",
  "schemas/content/capabilities/canvas.v1.json",
  "schemas/content/capabilities/extensions.v1.json",
  "schemas/content/capabilities/domain-refs.v1.json",
] as const;

const TEXT_FILES = [
  "content/canvases/dashboard.md",
  "content/canvases/dashboard.hbs.md",
  "content/canvases/requirements.hbs.md",
  "content/canvases/infrastructure.hbs.md",
  "content/canvases/situation-report.hbs.md",
  "content/canvases/delivery.hbs.md",
  "content/messages/pinned-index.hbs.json",
] as const;

const ASSET_FILES = [
  "assets/Account Executive banner.png",
  "assets/Sales Engineer banner.png",
  "assets/Tech Specialist banner.png",
] as const;

const TEMPLATE_FILES = [
  { file: "content/canvases/dashboard.hbs.md", export: "dashboardHbsMd" },
  { file: "content/canvases/requirements.hbs.md", export: "requirementsHbsMd" },
  { file: "content/canvases/infrastructure.hbs.md", export: "infrastructureHbsMd" },
  { file: "content/canvases/situation-report.hbs.md", export: "situationReportHbsMd" },
  { file: "content/canvases/delivery.hbs.md", export: "deliveryHbsMd" },
  { file: "content/messages/pinned-index.hbs.json", export: "pinnedIndexHbsJson" },
] as const;

function toContentKey(relativePath: string): string {
  if (relativePath.startsWith("schemas/content/capabilities/")) {
    return relativePath.replace("schemas/content/", "schemas/");
  }
  if (relativePath.startsWith("content/")) {
    return relativePath.slice("content/".length);
  }
  return relativePath;
}

function serializeJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function serializeText(value: string): string {
  return JSON.stringify(value);
}

interface CanvasCatalog {
  forbidden_patterns: string[];
}

/** Bootstrap-safe canvas validation — reads catalog from disk before embed output exists. */
function validateCanvasTemplateSource(sourceText: string, source: string): void {
  const catalogPath = join(ROOT, "schemas/content/capabilities/canvas.v1.json");
  const catalog = JSON.parse(Deno.readTextFileSync(catalogPath)) as CanvasCatalog;
  for (const pattern of catalog.forbidden_patterns) {
    if (sourceText.includes(pattern)) {
      throw new Error(
        `${source} must not contain forbidden pattern "${pattern}" in author templates`,
      );
    }
  }
}

const jsonEntries: string[] = [];
for (const file of JSON_FILES) {
  const absolute = join(ROOT, file);
  const parsed = JSON.parse(await Deno.readTextFile(absolute));
  jsonEntries.push(
    `  ${JSON.stringify(toContentKey(file))}: ${serializeJson(parsed)},`,
  );
}

const textEntries: string[] = [];
for (const file of TEXT_FILES) {
  const absolute = join(ROOT, file);
  const text = await Deno.readTextFile(absolute);
  textEntries.push(
    `  ${JSON.stringify(toContentKey(file))}: ${serializeText(text)},`,
  );
}

const assetEntries: string[] = [];
for (const file of ASSET_FILES) {
  const absolute = join(ROOT, file);
  const bytes = await Deno.readFile(absolute);
  assetEntries.push(
    `  ${JSON.stringify(file)}: decodeBase64(${JSON.stringify(encodeBase64(bytes))}),`,
  );
}

Handlebars.registerHelper("json", (value: unknown) => {
  return new Handlebars.SafeString(JSON.stringify(value));
});

const templateExports: string[] = [];
const templateMapEntries: string[] = [];
for (const { file, export: exportName } of TEMPLATE_FILES) {
  const absolute = join(ROOT, file);
  const source = await Deno.readTextFile(absolute);
  if (file.endsWith(".hbs.md")) {
    validateCanvasTemplateSource(source, toContentKey(file));
  }
  const precompiled = Handlebars.precompile(source, {
    strict: false,
    noEscape: true,
  });
  templateExports.push(
    `const ${exportName} = Handlebars.template(${precompiled});`,
  );
  templateMapEntries.push(
    `  ${JSON.stringify(toContentKey(file))}: ${exportName},`,
  );
}

const contentSource = `// Generated by scripts/embed-content.ts — do not edit manually.

const JSON_BY_PATH: Record<string, unknown> = {
${jsonEntries.join("\n")}
};

const TEXT_BY_PATH: Record<string, string> = {
${textEntries.join("\n")}
};

/** Returns bundled JSON content for a path under slack-app/content or schemas. */
export function readEmbeddedContentJson(relativePath: string): unknown {
  const data = JSON_BY_PATH[relativePath];
  if (data === undefined) {
    throw new Error(\`Unknown embedded JSON content: \${relativePath}\`);
  }
  return structuredClone(data);
}

/** Returns bundled text content for a path under slack-app/content. */
export function readEmbeddedContentText(relativePath: string): string {
  const data = TEXT_BY_PATH[relativePath];
  if (data === undefined) {
    throw new Error(\`Unknown embedded text content: \${relativePath}\`);
  }
  return data;
}
`;

const assetsSource = `// Generated by scripts/embed-content.ts — do not edit manually.

import { decodeBase64 } from "std/encoding/base64.ts";

const ASSET_BYTES_BY_PATH: Record<string, Uint8Array> = {
${assetEntries.join("\n")}
};

/** Returns bundled PNG bytes for a path under slack-app/assets. */
export function readEmbeddedAssetBytes(relativePath: string): Uint8Array {
  const decodedPath = decodeURIComponent(relativePath);
  const bytes = ASSET_BYTES_BY_PATH[relativePath] ??
    ASSET_BYTES_BY_PATH[decodedPath];
  if (!bytes) {
    throw new Error(\`Unknown embedded asset: \${relativePath}\`);
  }
  return bytes;
}
`;

await Deno.writeTextFile(OUT_CONTENT, contentSource);
await Deno.writeTextFile(OUT_ASSETS, assetsSource);
await Deno.writeTextFile(
  OUT_TEMPLATES,
  `// Generated by scripts/embed-content.ts — do not edit manually.
// @ts-nocheck

import Handlebars from "handlebars";
import type { TemplateDelegate } from "handlebars";

Handlebars.registerHelper("json", (value: unknown) => {
  return new Handlebars.SafeString(JSON.stringify(value));
});

${templateExports.join("\n\n")}

/** Precompiled Handlebars templates keyed by content-relative path. */
export const TEMPLATES_BY_PATH: Record<string, TemplateDelegate> = {
${templateMapEntries.join("\n")}
};
`,
);
console.log(`Wrote ${OUT_CONTENT}`);
console.log(`Wrote ${OUT_ASSETS}`);
console.log(`Wrote ${OUT_TEMPLATES}`);
