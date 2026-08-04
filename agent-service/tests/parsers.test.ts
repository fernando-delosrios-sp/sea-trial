import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { FilePayload, ParsedDocument } from "@tes-event-process/shared";
import { parseDocument, parseText } from "../src/parsers/index.js";

const fixturesDir = join(import.meta.dirname, "fixtures");

function loadFixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(fixturesDir, name)));
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
