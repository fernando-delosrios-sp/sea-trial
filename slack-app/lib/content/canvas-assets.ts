import { basename } from "std/path/basename.ts";
import type { OnboardingForm, TesEventContext } from "@tes/shared/types/index.ts";
import { renderDashboardCanvas } from "./canvas-renderer.ts";
import { resolveCanvasAssetPath } from "./paths.ts";

export const DASHBOARD_CANVAS_PATH = "canvases/dashboard.md";

const IMAGE_REF_PATTERN = /!\[([^\]]*)\]\(([^)]+)\)/g;

export interface SlackUploadedFile {
  id?: string;
  name?: string;
  permalink?: string;
  url_private?: string;
  user?: string;
}

export interface CanvasAssetUploadClient {
  files: {
    getUploadURLExternal: (params: {
      filename: string;
      length: number;
    }) => Promise<{
      ok?: boolean;
      upload_url?: string;
      file_id?: string;
      error?: string;
    }>;
    completeUploadExternal: (params: {
      files: Array<{ id: string; title: string }>;
      channel_id?: string;
    }) => Promise<{
      ok?: boolean;
      files?: SlackUploadedFile[];
      error?: string;
    }>;
    info: (params: { file: string }) => Promise<{
      ok?: boolean;
      file?: SlackUploadedFile;
      error?: string;
    }>;
  };
}

/** Returns local (non-URL) image refs from canvas markdown. */
export function findCanvasImageRefs(markdown: string): string[] {
  const refs = new Set<string>();

  for (const match of markdown.matchAll(IMAGE_REF_PATTERN)) {
    const ref = match[2]?.trim();
    if (!ref || ref.startsWith("http://") || ref.startsWith("https://")) {
      continue;
    }
    refs.add(ref);
  }

  return [...refs];
}

/** Substitutes local image refs with Slack-hosted URLs. */
export function applyCanvasAssetUrls(
  markdown: string,
  urlByPath: Record<string, string>,
): string {
  return markdown.replace(
    IMAGE_REF_PATTERN,
    (full, alt: string, ref: string) => {
      const trimmed = ref.trim();
      const url = urlByPath[trimmed] ??
        urlByPath[decodeURIComponent(trimmed)];
      return url ? `![${alt}](${url})` : full;
    },
  );
}

/** Throws when local image refs remain after an upload attempt. */
export function assertCanvasAssetRefsResolved(
  markdown: string,
  uploadAttempted: boolean,
): void {
  if (!uploadAttempted) return;

  const unresolved = findCanvasImageRefs(markdown);
  if (unresolved.length > 0) {
    throw new Error(
      `Dashboard canvas still has unresolved local image refs: ${
        unresolved.join(", ")
      }`,
    );
  }
}

function canvasImageUrl(
  file: SlackUploadedFile,
  fileId: string,
  filename: string,
): string {
  if (file.permalink?.includes("/files/")) {
    return file.permalink;
  }

  throw new Error(
    `Uploaded file "${filename}" (${fileId}) is missing a Slack canvas permalink`,
  );
}

async function uploadCanvasAsset(
  client: CanvasAssetUploadClient,
  channelId: string,
  assetRef: string,
  canvasRelativePath: string,
): Promise<string> {
  const absolutePath = resolveCanvasAssetPath(assetRef, canvasRelativePath);
  const bytes = await Deno.readFile(absolutePath);
  const filename = basename(absolutePath);

  const uploadMeta = await client.files.getUploadURLExternal({
    filename,
    length: bytes.length,
  });

  if (!uploadMeta.ok || !uploadMeta.upload_url || !uploadMeta.file_id) {
    throw new Error(
      `Failed to get upload URL for "${filename}": ${uploadMeta.error ?? "unknown error"}`,
    );
  }

  const uploadResponse = await fetch(uploadMeta.upload_url, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
    },
    body: bytes,
  });

  if (!uploadResponse.ok) {
    throw new Error(
      `Failed to upload "${filename}": HTTP ${uploadResponse.status}`,
    );
  }

  const completed = await client.files.completeUploadExternal({
    files: [{ id: uploadMeta.file_id, title: filename }],
    channel_id: channelId,
  });

  if (!completed.ok) {
    throw new Error(
      `Failed to complete upload for "${filename}": ${completed.error ?? "unknown error"}`,
    );
  }

  const uploaded = completed.files?.[0];
  if (uploaded) {
    return canvasImageUrl(uploaded, uploadMeta.file_id, filename);
  }

  const info = await client.files.info({ file: uploadMeta.file_id });
  if (!info.ok || !info.file) {
    throw new Error(
      `Failed to resolve permalink for "${filename}": ${info.error ?? "unknown error"}`,
    );
  }

  return canvasImageUrl(info.file, uploadMeta.file_id, filename);
}

function canUploadCanvasAssets(
  client: CanvasAssetUploadClient | undefined,
): client is CanvasAssetUploadClient {
  return typeof client?.files?.getUploadURLExternal === "function";
}

/** Uploads referenced local assets and returns a ref-to-URL map. */
export async function resolveCanvasAssetUrls(
  client: CanvasAssetUploadClient | undefined,
  channelId: string,
  markdown: string,
  canvasRelativePath = DASHBOARD_CANVAS_PATH,
): Promise<Record<string, string>> {
  const refs = findCanvasImageRefs(markdown);
  if (refs.length === 0) return {};

  if (!canUploadCanvasAssets(client)) {
    throw new Error(
      "Dashboard canvas images require Slack files API access (files:write scope)",
    );
  }

  const urlByPath: Record<string, string> = {};
  for (const ref of refs) {
    urlByPath[ref] = await uploadCanvasAsset(
      client,
      channelId,
      ref,
      canvasRelativePath,
    );
  }
  return urlByPath;
}

/** Renders dashboard markdown with Slack-hosted image URLs when a client is available. */
export async function renderDashboardCanvasForSlack(
  client: CanvasAssetUploadClient | undefined,
  channelId: string,
  context: TesEventContext,
  form?: OnboardingForm,
): Promise<string> {
  const markdown = renderDashboardCanvas(context, form);
  const refs = findCanvasImageRefs(markdown);
  const uploadAttempted = refs.length > 0 && canUploadCanvasAssets(client);
  const assetUrls = await resolveCanvasAssetUrls(
    client,
    channelId,
    markdown,
  );
  const resolved = applyCanvasAssetUrls(markdown, assetUrls);
  assertCanvasAssetRefsResolved(resolved, uploadAttempted);
  return resolved;
}
