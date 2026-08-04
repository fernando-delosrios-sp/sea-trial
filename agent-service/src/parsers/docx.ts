import mammoth from "mammoth";

/**
 * Extracts plain text from a DOCX buffer using mammoth.
 */
export async function parseDocx(content: Uint8Array): Promise<string> {
  const result = await mammoth.extractRawText({
    buffer: Buffer.from(content),
  });
  return result.value;
}
