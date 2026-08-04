import { PDFParse } from "pdf-parse";

const IMAGE_ONLY_ERROR =
  "PDF contains no extractable text (image-only or scanned document)";

const PAGE_MARKER_PATTERN = /--\s*\d+\s+of\s+\d+\s*--/g;

function hasExtractableText(text: string): boolean {
  const normalized = text
    .replace(PAGE_MARKER_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();
  return /[A-Za-z0-9]{3,}/.test(normalized);
}

/**
 * Extracts text from a text-based PDF buffer.
 * Returns empty string for image-only PDFs (caller checks and rejects).
 */
export async function parsePdf(content: Uint8Array): Promise<string> {
  const parser = new PDFParse({ data: Buffer.from(content) });
  try {
    const result = await parser.getText();
    const text = result.text.trim();
    return hasExtractableText(text) ? text : "";
  } finally {
    await parser.destroy();
  }
}

export { IMAGE_ONLY_ERROR };
