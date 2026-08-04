import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { deriveComponents, getSupportedSuites } from "../lib/suite-components.ts";

Deno.test("deriveComponents returns Identity Security Cloud modules", () => {
  const components = deriveComponents("Identity Security Cloud");
  assertEquals(components.includes("IdentityNow"), true);
  assertEquals(components.includes("Access Management"), true);
  assertEquals(components.length > 0, true);
});

Deno.test("deriveComponents returns empty for unknown suite", () => {
  assertEquals(deriveComponents("Unknown Suite"), []);
});

Deno.test("getSupportedSuites includes Identity Security Cloud", () => {
  assertEquals(getSupportedSuites().includes("Identity Security Cloud"), true);
});
