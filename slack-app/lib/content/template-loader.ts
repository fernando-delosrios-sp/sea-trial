import type { TemplateDelegate } from "handlebars";
import { validateCanvasTemplateSource } from "./capability-validator.ts";
import { readContentText } from "./paths.ts";
import { TEMPLATES_BY_PATH } from "./embedded-templates.generated.ts";

/** Loads a precompiled canvas template after validating forbidden patterns in source. */
export function loadValidatedCanvasTemplate(relativePath: string): TemplateDelegate {
  validateCanvasTemplateSource(readContentText(relativePath), relativePath);
  const template = TEMPLATES_BY_PATH[relativePath];
  if (!template) {
    throw new Error(`Unknown canvas template "${relativePath}"`);
  }
  return template;
}
