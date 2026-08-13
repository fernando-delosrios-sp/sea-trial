import { readFileSync } from "node:fs";
import { join } from "node:path";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import type { FilePayload, ParsedDocument } from "@sea-trial/shared";
import {
  NO_EXTRACTABLE_TEXT_ERROR,
  parseDocument,
  parseText,
} from "../src/parsers/index.js";

const fixturesDir = join(import.meta.dirname, "fixtures");

function loadFixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(fixturesDir, name)));
}

async function emptyDocx(): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p><w:r/></w:p></w:body>
</w:document>`);
  zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>
</Relationships>`);
  return new Uint8Array(await zip.generateAsync({ type: "uint8array" }));
}

function emptyXlsx(): Uint8Array {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([[]]), "Sheet1");
  return new Uint8Array(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}

describe("shared types import", () => {
  it("exports FilePayload and ParsedDocument shapes", () => {
    const file: FilePayload = {
      filename: "test.txt",
      mimeType: "text/plain",
      contentBase64: btoa("hello"),
    };
    const parsed: ParsedDocument = {
      filename: "test.txt",
      mimeType: "text/plain",
      text: "hello",
      supported: true,
    };
    expect(file.contentBase64).toBeTruthy();
    expect(parsed.supported).toBe(true);
  });
});

describe("parseDocument — TXT", () => {
  it("parses plain text files", async () => {
    const result = await parseDocument({
      filename: "sample.txt",
      mimeType: "text/plain",
      content: loadFixture("sample.txt"),
    });

    expect(result.supported).toBe(true);
    expect(result.mimeType).toBe("text/plain");
    expect(result.text).toContain("Configure SSO");
  });

  it("rejects whitespace-only text files", async () => {
    const result = await parseDocument({
      filename: "blank.txt",
      mimeType: "text/plain",
      content: new TextEncoder().encode("   \n\t  "),
    });

    expect(result.supported).toBe(false);
    expect(result.error).toBe(NO_EXTRACTABLE_TEXT_ERROR);
  });
});

describe("parseDocument — DOCX", () => {
  it("extracts text from DOCX using mammoth", async () => {
    const result = await parseDocument({
      filename: "sample.docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      content: loadFixture("sample.docx"),
    });

    expect(result.supported).toBe(true);
    expect(result.text).toContain("IdentityNow");
  });

  it("rejects empty DOCX without throwing", async () => {
    const result = await parseDocument({
      filename: "empty.docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      content: await emptyDocx(),
    });

    expect(result.supported).toBe(false);
    expect(result.error).toBe(NO_EXTRACTABLE_TEXT_ERROR);
  });
});

describe("parseDocument — XLSX", () => {
  it("extracts cell text from XLSX", async () => {
    const result = await parseDocument({
      filename: "sample.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      content: loadFixture("sample.xlsx"),
    });

    expect(result.supported).toBe(true);
    expect(result.text).toContain("Configure SSO");
  });

  it("rejects empty XLSX without throwing", async () => {
    const result = await parseDocument({
      filename: "empty.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      content: emptyXlsx(),
    });

    expect(result.supported).toBe(false);
    expect(result.error).toBe(NO_EXTRACTABLE_TEXT_ERROR);
  });
});

describe("parseDocument — PDF", () => {
  it("extracts text from text-based PDF", async () => {
    const result = await parseDocument({
      filename: "sample-text.pdf",
      mimeType: "application/pdf",
      content: loadFixture("sample-text.pdf"),
    });

    expect(result.supported).toBe(true);
    expect(result.text).toContain("Configure SSO");
  });

  it("rejects image-only PDF without throwing", async () => {
    const result = await parseDocument({
      filename: "sample-image.pdf",
      mimeType: "application/pdf",
      content: loadFixture("sample-image.pdf"),
    });

    expect(result.supported).toBe(false);
    expect(result.error).toContain("no extractable text");
  });
});

describe("parseDocument — unsupported", () => {
  it("rejects unsupported formats gracefully", async () => {
    const result = await parseDocument({
      filename: "image.png",
      mimeType: "image/png",
      content: new Uint8Array([0x89, 0x50]),
    });

    expect(result.supported).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("does not throw on unsupported format", async () => {
    await expect(
      parseDocument({
        filename: "archive.zip",
        mimeType: "application/zip",
        content: new Uint8Array([0x50, 0x4b]),
      }),
    ).resolves.toMatchObject({ supported: false });
  });
});

describe("parseText", () => {
  it("decodes UTF-8 content", () => {
    const content = new TextEncoder().encode("Hello TES");
    expect(parseText(content)).toBe("Hello TES");
  });
});

