import type { DocumentImagePayload } from "@sea-trial/shared";

export interface ImageParseResult {
  text: string;
  images: DocumentImagePayload[];
}

export const CORRUPT_IMAGE_ERROR = "Image file is corrupt or invalid";

export function isPng(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
}

export function isJpeg(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  );
}

/**
 * Parses PNG and JPEG image files into visual payloads.
 */
export function parseImage(
  content: Uint8Array,
  filename: string,
  mimeType: string,
): ImageParseResult {
  if (content.length === 0) {
    throw new Error(CORRUPT_IMAGE_ERROR);
  }

  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  if (ext === ".png" && !isPng(content)) {
    throw new Error(CORRUPT_IMAGE_ERROR);
  }
  if ((ext === ".jpg" || ext === ".jpeg") && !isJpeg(content)) {
    throw new Error(CORRUPT_IMAGE_ERROR);
  }

  const base64 = Buffer.from(content).toString("base64");
  const normalizedMime =
    mimeType === "image/jpg" || ext === ".jpg" ? "image/jpeg" : mimeType;

  return {
    text: `[Image: ${filename}]`,
    images: [
      {
        dataBase64: base64,
        buffer: content,
        mimeType: normalizedMime || "image/png",
        description: `Visual image file ${filename}`,
      },
    ],
  };
}

