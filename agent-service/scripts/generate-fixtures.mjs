import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "fixtures");

mkdirSync(fixturesDir, { recursive: true });

writeFileSync(
  join(fixturesDir, "sample.txt"),
  "Deliverable: Configure SSO integration\nDeliverable: Build certification campaign\n",
);

const workbook = XLSX.utils.book_new();
const sheet = XLSX.utils.aoa_to_sheet([
  ["Deliverable", "Description"],
  ["Configure SSO", "Set up Okta integration"],
  ["Certification", "Build access review campaign"],
]);
XLSX.utils.book_append_sheet(workbook, sheet, "Requirements");
writeFileSync(
  join(fixturesDir, "sample.xlsx"),
  XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
);

// Minimal valid DOCX (Office Open XML zip with document.xml)
const docxXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Deliverable: Configure IdentityNow provisioning</w:t></w:r></w:p>
    <w:p><w:r><w:t>Deliverable: Implement access certification workflow</w:t></w:r></w:p>
  </w:body>
</w:document>`;

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const wordRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;

import JSZip from "jszip";

async function writeDocx() {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", contentTypes);
  zip.file("_rels/.rels", rels);
  zip.file("word/document.xml", docxXml);
  zip.file("word/_rels/document.xml.rels", wordRels);
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  writeFileSync(join(fixturesDir, "sample.docx"), buffer);
}

// Text-based PDF with extractable text
const textPdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj
4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
5 0 obj<</Length 55>>stream
BT /F1 12 Tf 72 720 Td (Deliverable: Configure SSO for Acme Corp) Tj ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000052 00000 n 
0000000101 00000 n 
0000000220 00000 n 
0000000288 00000 n 
trailer<</Size 6/Root 1 0 R>>
startxref
393
%%EOF`;

writeFileSync(join(fixturesDir, "sample-text.pdf"), textPdf);

// Image-only PDF (no text operators)
const imagePdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R>>endobj
4 0 obj<</Length 21>>stream
q 612 0 0 792 0 0 cm /Im1 Do Q
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000052 00000 n 
0000000101 00000 n 
0000000180 00000 n 
trailer<</Size 5/Root 1 0 R>>
startxref
251
%%EOF`;

writeFileSync(join(fixturesDir, "sample-image.pdf"), imagePdf);

await writeDocx();
console.log("Fixtures written to", fixturesDir);
