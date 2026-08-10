import { join } from "std/path/join.ts";
import { fromFileUrl } from "std/path/from_file_url.ts";
import { dirname } from "std/path/dirname.ts";
import { normalize } from "std/path/normalize.ts";

/** Root directory for declarative Slack UI content files. */
export const CONTENT_ROOT = join(
  dirname(fromFileUrl(import.meta.url)),
  "../../content",
);

/** Root directory for static Slack app assets (icons, canvas banners). */
export const ASSETS_ROOT = join(
  dirname(fromFileUrl(import.meta.url)),
  "../../assets",
);

/** Resolves an image path authored relative to a canvas markdown file. */
export function resolveCanvasAssetPath(
  assetRef: string,
  canvasRelativePath: string,
): string {
  const canvasDir = dirname(join(CONTENT_ROOT, canvasRelativePath));
  return normalize(join(canvasDir, decodeURIComponent(assetRef)));
}

export function readContentText(relativePath: string): string {
  return Deno.readTextFileSync(join(CONTENT_ROOT, relativePath));
}

export function readContentJson(relativePath: string): unknown {
  return JSON.parse(readContentText(relativePath));
}

