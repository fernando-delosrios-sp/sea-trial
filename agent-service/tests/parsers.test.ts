import { describe, expect, it } from "vitest";
import { parseDocument, parseText } from "../src/parsers/index.js";

describe("parseDocument", () => {
  it("parses plain text files", async () => {
    const content = new TextEncoder().encode(
      "Deliverable: Configure SSO integration\nDeliverable: Build certification campaign",
    );

    const result = await parseDocument({
      filename: "requirements.txt",
      mimeType: "text/plain",
      content,
    });

    expect(result.supported).toBe(true);
    expect(result.text).toContain("Configure SSO");
  });

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
