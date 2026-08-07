import { join } from "std/path/join.ts";
import { fromFileUrl } from "std/path/from_file_url.ts";
import { dirname } from "std/path/dirname.ts";

/** Root directory for declarative Slack UI content files. */
export const CONTENT_ROOT = join(
  dirname(fromFileUrl(import.meta.url)),
  "../../content",
);

export function readContentText(relativePath: string): string {
  return Deno.readTextFileSync(join(CONTENT_ROOT, relativePath));
}

export function readContentJson(relativePath: string): unknown {
  return JSON.parse(readContentText(relativePath));
}
