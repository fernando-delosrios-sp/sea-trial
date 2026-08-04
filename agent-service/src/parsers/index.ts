import type { ParsedDocument } from "@tes-event-process/shared";
import { parseDocx } from "./docx.js";
import { IMAGE_ONLY_ERROR, parsePdf } from "./pdf.js";
import { parseText } from "./text.js";
import { parseXlsx } from "./xlsx.js";

const SUPPORTED_EXTENSIONS = new Set([".pdf", ".docx", ".xlsx", ".txt", ".md"]);

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
 * Parses an uploaded document and returns extracted text or an unsupported result.
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
    let text: string;

    switch (ext) {
      case ".pdf":
        text = await parsePdf(input.content);
        if (!text) {
          return {
            ...base,
            text: "",
            supported: false,
            error: IMAGE_ONLY_ERROR,
          };
        }
        break;
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

    return {
      ...base,
      text: text.trim(),
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
