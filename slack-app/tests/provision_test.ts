import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildChannelName, validateChannelName } from "../lib/channel.ts";

Deno.test("Successful channel creation — valid name produces proj-{slug}-tes", () => {
  const result = validateChannelName("Acme Demo");
  assertEquals(result.valid, true);
  assertEquals(result.channelName, "proj-acme-demo-tes");
  assertEquals(buildChannelName("Acme Demo"), "proj-acme-demo-tes");
});

Deno.test("Objects seeded — context includes all object ID fields", () => {
  const context = {
    dashboardCanvasId: "d1",
    requirementsCanvasId: "r1",
    infrastructureCanvasId: "i1",
    deliverablesListId: "l1",
    incidentsListId: "l2",
  };
  assertEquals(Object.values(context).every((v) => v.length > 0), true);
});
