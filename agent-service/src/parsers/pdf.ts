import { PDFParse } from "pdf-parse";
import type { DocumentImagePayload } from "@sea-trial/shared";

const IMAGE_ONLY_ERROR =
  "PDF contains no extractable text (image-only or scanned document)";

const PDF_EXTRACTION_FAILED_ERROR =
  "PDF contains no extractable text or renderable pages (extraction failed)";

const PAGE_MARKER_PATTERN = /--\s*\d+\s+of\s+\d+\s*--/g;

function hasExtractableText(text: string): boolean {
  const normalized = text
    .replace(PAGE_MARKER_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();
  return /[A-Za-z0-9]{3,}/.test(normalized);
}

export interface PdfParseResult {
  text: string;
  images: DocumentImagePayload[];
}

/**
 * Extracts text and renders visual pages into image buffers from a PDF buffer.
 */
export async function parsePdf(content: Uint8Array): Promise<PdfParseResult> {
  const parser = new PDFParse({ data: Buffer.from(content) });
  try {
    let text = "";
    try {
      const result = await parser.getText();
      const raw = result.text.trim();
      if (hasExtractableText(raw)) {
        text = raw;
      }
    } catch {
      // Text extraction failed or not available
    }

    const images: DocumentImagePayload[] = [];
    try {
      const screenshotResult = await parser.getScreenshot({
        imageBuffer: true,
        imageDataUrl: true,
      });

      if (screenshotResult?.pages) {
        for (const page of screenshotResult.pages) {
          if (page.data && page.data.length > 0) {
            const dataBase64 = page.dataUrl
              ? page.dataUrl.replace(/^data:image\/png;base64,/, "")
              : Buffer.from(page.data).toString("base64");

            images.push({
              pageNumber: page.pageNumber,
              dataBase64,
              buffer: page.data,
              mimeType: "image/png",
              description: `Page ${page.pageNumber} rendered image`,
            });
          }
        }
      }
    } catch {
      // Screenshot rendering failed
    }

    return { text, images };
  } finally {
    await parser.destroy();
  }
}

export { IMAGE_ONLY_ERROR, PDF_EXTRACTION_FAILED_ERROR };
