/**
 * Plain text pass-through parser.
 */
export function parseText(content: Uint8Array): string {
  return new TextDecoder().decode(content);
}
