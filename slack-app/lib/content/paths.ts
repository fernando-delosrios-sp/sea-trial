import { join } from "std/path/join.ts";
import { fromFileUrl } from "std/path/from_file_url.ts";
import { dirname } from "std/path/dirname.ts";
import { normalize } from "std/path/normalize.ts";
import {
  readEmbeddedContentJson,
  readEmbeddedContentText,
} from "./embedded-content.generated.ts";

/** Root directory for declarative Slack UI content files (local dev / path resolution). */
export const CONTENT_ROOT = join(
  dirname(fromFileUrl(import.meta.url)),
  "../../content",
);

/** Root directory for static Slack app assets (local dev / path resolution). */
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
  const resolved = normalize(join(canvasDir, decodeURIComponent(assetRef)));
  const assetsPrefix = `${ASSETS_ROOT}/`;
  if (resolved.startsWith(assetsPrefix)) {
    return `assets/${resolved.slice(assetsPrefix.length)}`;
  }
  if (resolved.startsWith("assets/")) {
    return resolved;
  }
  return resolved;
}

export function readContentText(relativePath: string): string {
  return readEmbeddedContentText(relativePath);
}

export function readContentJson(relativePath: string): unknown {
  return readEmbeddedContentJson(relativePath);
}
