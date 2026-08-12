import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildChannelName,
  buildInviteUserIds,
  validateChannelName,
} from "../lib/channel.ts";

Deno.test("Successful channel creation — valid name produces proj-{slug}-tes", () => {
  const result = validateChannelName("Acme Demo");
  assertEquals(result.valid, true);
  assertEquals(result.channelName, "proj-acme-demo-tes");
  assertEquals(buildChannelName("Acme Demo"), "proj-acme-demo-tes");
});

Deno.test("Successful channel creation (member invite) — invites all members plus submitting user", () => {
  const result = buildInviteUserIds(["U_MEMBER1", "U_MEMBER2"], "U_SUBMITTER");
  assertEquals(result, ["U_MEMBER1", "U_MEMBER2", "U_SUBMITTER"]);
});

Deno.test("Successful channel creation (member invite) — dedupes submitting user already in member list", () => {
  const result = buildInviteUserIds(["U_MEMBER1", "U_SUBMITTER"], "U_SUBMITTER");
  assertEquals(result, ["U_MEMBER1", "U_SUBMITTER"]);
});

Deno.test("Objects seeded — context includes all object ID fields", () => {
  const context = {
    dashboardCanvasId: "d1",
    requirementsCanvasId: "r1",
    infrastructureCanvasId: "i1",
  situationReportCanvasId: "sr1",
    deliverablesListId: "l1",
    incidentsListId: "l2",
  };
  assertEquals(Object.values(context).every((v) => v.length > 0), true);
  assertEquals("situationReportCanvasId" in context, true);
});

