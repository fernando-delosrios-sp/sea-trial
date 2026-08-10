import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyCanvasAssetUrls,
  assertCanvasAssetRefsResolved,
  DASHBOARD_CANVAS_PATH,
  findCanvasImageRefs,
} from "../lib/content/canvas-assets.ts";
import {
  ASSETS_ROOT,
  resolveCanvasAssetPath,
} from "../lib/content/paths.ts";

Deno.test("findCanvasImageRefs ignores http(s) URLs", () => {
  const refs = findCanvasImageRefs(
    "![local](../../assets/foo.png)\n![remote](https://example.com/foo.png)",
  );

  assertEquals(refs, ["../../assets/foo.png"]);
});

Deno.test("applyCanvasAssetUrls replaces only mapped local refs", () => {
  const markdown = applyCanvasAssetUrls(
    "![Sales Engineer](../../assets/Sales Engineer banner.png)",
    {
      "../../assets/Sales Engineer banner.png":
        "https://example.slack.com/files/U1/F1/banner.png",
    },
  );

  assertStringIncludes(
    markdown,
    "![Sales Engineer](https://example.slack.com/files/U1/F1/banner.png)",
  );
});

Deno.test("resolveCanvasAssetPath resolves repo-relative banner paths", () => {
  const resolved = resolveCanvasAssetPath(
    "../../assets/Sales Engineer banner.png",
    DASHBOARD_CANVAS_PATH,
  );

  assertEquals(
    resolved.endsWith(`${ASSETS_ROOT}/Sales Engineer banner.png`),
    true,
  );
});

Deno.test("resolveCanvasAssetPath decodes URL-encoded asset refs", () => {
  const resolved = resolveCanvasAssetPath(
    "../../assets/Sales%20Engineer%20banner.png",
    DASHBOARD_CANVAS_PATH,
  );

  assertEquals(
    resolved.endsWith(`${ASSETS_ROOT}/Sales Engineer banner.png`),
    true,
  );
});

Deno.test("assertCanvasAssetRefsResolved throws when uploads were attempted but refs remain", () => {
  let threw = false;
  try {
    assertCanvasAssetRefsResolved(
      "![Sales Engineer](../../assets/Sales%20Engineer%20banner.png)",
      true,
    );
  } catch (error) {
    threw = true;
    assertStringIncludes(
      String(error),
      "unresolved local image refs",
    );
  }
  assertEquals(threw, true);
});
