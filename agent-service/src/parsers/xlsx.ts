import * as XLSX from "xlsx";

/**
 * Extracts cell values from an XLSX buffer as plain text.
 */
export function parseXlsx(content: Uint8Array): string {
  const workbook = XLSX.read(Buffer.from(content), { type: "buffer" });
  const lines: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      defval: "",
    });

    for (const row of rows) {
      const cells = (row as string[]).filter((cell) => String(cell).trim());
      if (cells.length) {
        lines.push(cells.join(" | "));
      }
    }
  }

  return lines.join("\n");
}
