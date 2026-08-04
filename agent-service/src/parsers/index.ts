import type { ParsedDocument } from "@tes-event-process/shared";

const SUPPORTED_EXTENSIONS = new Set([".pdf", ".docx", ".xlsx", ".txt", ".md"]);

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

/**
 * Parses plain text from a buffer.
 */
export function parseText(content: Uint8Array): string {
  return new TextDecoder().decode(content);
}

/**
 * Parses PDF content. Uses basic text extraction for MVP.
 * @param content - Raw PDF bytes
 */
export async function parsePdf(content: Uint8Array): Promise<string> {
  const text = parseText(content);
  const matches = text.match(/\(([^)]+)\)/g);
  if (matches?.length) {
    return matches.map((m) => m.slice(1, -1)).join(" ");
  }
  return text.replace(/[^\x20-\x7E\n]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Parses DOCX content by extracting text from XML parts.
 */
export async function parseDocx(content: Uint8Array): Promise<string> {
  const text = parseText(content);
  const matches = text.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
  if (matches?.length) {
    return matches
      .map((m) => m.replace(/<[^>]+>/g, ""))
      .join(" ");
  }
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Parses XLSX content by extracting shared strings.
 */
export async function parseXlsx(content: Uint8Array): Promise<string> {
  const text = parseText(content);
  const matches = text.match(/<t[^>]*>([^<]*)<\/t>/g);
  if (matches?.length) {
    return matches
      .map((m) => m.replace(/<[^>]+>/g, ""))
      .join(" ");
  }
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export interface ParseDocumentInput {
  filename: string;
  mimeType: string;
  content: Uint8Array;
}

/**
 * Parses an uploaded document and returns extracted text or an unsupported result.
 * @param input - Filename, MIME type, and raw content
 */
export async function parseDocument(
  input: ParseDocumentInput,
): Promise<ParsedDocument> {
  const ext = getExtension(input.filename);

  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    return {
      filename: input.filename,
      supported: false,
      error: `Unsupported format: ${ext || input.mimeType}`,
    };
  }

  try {
    let text: string;

    switch (ext) {
      case ".pdf":
        text = await parsePdf(input.content);
        break;
      case ".docx":
        text = await parseDocx(input.content);
        break;
      case ".xlsx":
        text = await parseXlsx(input.content);
        break;
      case ".txt":
      case ".md":
        text = parseText(input.content);
        break;
      default:
        return {
          filename: input.filename,
          supported: false,
          error: `Unsupported format: ${ext}`,
        };
    }

    return {
      filename: input.filename,
      supported: true,
      text: text.trim(),
    };
  } catch (error) {
    return {
      filename: input.filename,
      supported: false,
      error: error instanceof Error ? error.message : "Parse failed",
    };
  }
}
