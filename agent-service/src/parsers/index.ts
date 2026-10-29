import type { DocumentImagePayload, ParsedDocument } from "@sea-trial/shared";
import { parseDocx } from "./docx.js";
import { parseImage } from "./image.js";
import { IMAGE_ONLY_ERROR, PDF_EXTRACTION_FAILED_ERROR, parsePdf } from "./pdf.js";
import { parseText } from "./text.js";
import { parseXlsx } from "./xlsx.js";

const SUPPORTED_EXTENSIONS = new Set([
  ".pdf",
  ".docx",
  ".xlsx",
  ".txt",
  ".md",
  ".png",
  ".jpg",
  ".jpeg",
]);

export const NO_EXTRACTABLE_TEXT_ERROR =
  "Document contains no extractable text";

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

export interface ParseDocumentInput {
  filename: string;
  mimeType: string;
  content: Uint8Array;
}

/**
 * Parses an uploaded document and returns extracted text and/or visual image payloads.
 */
export async function parseDocument(
  input: ParseDocumentInput,
): Promise<ParsedDocument> {
  const ext = getExtension(input.filename);
  const base = {
    filename: input.filename,
    mimeType: input.mimeType,
  };

  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    return {
      ...base,
      text: "",
      supported: false,
      error: `Unsupported format: ${ext || input.mimeType}`,
    };
  }

  try {
    let text = "";
    let images: DocumentImagePayload[] | undefined;

    switch (ext) {
      case ".pdf": {
        const pdfResult = await parsePdf(input.content);
        text = pdfResult.text;
        images = pdfResult.images;
        if (!text && (!images || images.length === 0)) {
          return {
            ...base,
            text: "",
            supported: false,
            error: PDF_EXTRACTION_FAILED_ERROR,
          };
        }
        break;
      }
      case ".png":
      case ".jpg":
      case ".jpeg": {
        const imageResult = parseImage(input.content, input.filename, input.mimeType);
        text = imageResult.text;
        images = imageResult.images;
        break;
      }
      case ".docx":
        text = await parseDocx(input.content);
        break;
      case ".xlsx":
        text = parseXlsx(input.content);
        break;
      case ".txt":
      case ".md":
        text = parseText(input.content);
        break;
      default:
        return {
          ...base,
          text: "",
          supported: false,
          error: `Unsupported format: ${ext}`,
        };
    }

    const trimmed = text.trim();
    if (!trimmed && (!images || images.length === 0)) {
      return {
        ...base,
        text: "",
        supported: false,
        error: NO_EXTRACTABLE_TEXT_ERROR,
      };
    }

    return {
      ...base,
      text: trimmed || (images && images.length > 0 ? `[Visual document: ${input.filename}]` : ""),
      images: images && images.length > 0 ? images : undefined,
      supported: true,
    };
  } catch (error) {
    return {
      ...base,
      text: "",
      supported: false,
      error: error instanceof Error ? error.message : "Parse failed",
    };
  }
}

export { parseText } from "./text.js";
export { IMAGE_ONLY_ERROR, PDF_EXTRACTION_FAILED_ERROR } from "./pdf.js";

