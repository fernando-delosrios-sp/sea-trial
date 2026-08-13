import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { validateCanvasTemplateSource } from "../lib/content/capability-validator.ts";
import { loadValidatedCanvasTemplate } from "../lib/content/template-loader.ts";
import { TEMPLATES_BY_PATH } from "../lib/content/embedded-templates.generated.ts";

const CANVAS_TEMPLATE_PATHS = [
  "canvases/dashboard.hbs.md",
  "canvases/requirements.hbs.md",
  "canvases/infrastructure.hbs.md",
  "canvases/situation-report.hbs.md",
  "canvases/delivery.hbs.md",
] as const;

Deno.test("loadValidatedCanvasTemplate validates source before returning precompiled template", () => {
  for (const path of CANVAS_TEMPLATE_PATHS) {
    const template = loadValidatedCanvasTemplate(path);
    assertEquals(typeof template, "function");
    assertEquals(Boolean(TEMPLATES_BY_PATH[path]), true);
  }
});

Deno.test("loadValidatedCanvasTemplate rejects unknown canvas template path", () => {
  assertThrows(
    () => loadValidatedCanvasTemplate("canvases/missing.hbs.md"),
    Error,
    "Unknown embedded text content",
  );
});

Deno.test("canvas templates with forbidden metadata fail validation before use", () => {
  assertThrows(
    () =>
      validateCanvasTemplateSource(
        "# Title\n<!-- tes-event-context -->\n",
        "canvases/evil.hbs.md",
      ),
    Error,
    "forbidden pattern",
  );
});
