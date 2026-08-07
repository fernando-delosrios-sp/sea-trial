import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseCreateTesEventSubmission } from "../lib/create-tes-event-submit.ts";
import type { ViewStateValues } from "../lib/create-tes-event-submit.ts";

function buildValues(fields: {
  projectName?: string;
  accountName?: string;
  salesforceUrl?: string;
  memberUserIds?: string[];
  contextNotes?: string;
}): ViewStateValues {
  return {
    project_name: { value: { value: fields.projectName ?? "" } },
    account: { value: { value: fields.accountName ?? "" } },
    salesforce_url: { value: { value: fields.salesforceUrl ?? "" } },
    members: { value: { selected_users: fields.memberUserIds ?? [] } },
    context_notes: { value: { value: fields.contextNotes ?? "" } },
  };
}

Deno.test("Submit valid creation form — parses all fields for workflow inputs", () => {
  const result = parseCreateTesEventSubmission(buildValues({
    projectName: "Acme Demo",
    accountName: "Acme Corp",
    salesforceUrl: "https://acme.my.salesforce.com/006",
    memberUserIds: ["U1", "U2"],
    contextNotes: "Kickoff next week",
  }));

  assertEquals(result.valid, true);
  if (result.valid) {
    assertEquals(result.channelName, "proj-acme-demo-tes");
    assertEquals(result.data.projectName, "Acme Demo");
    assertEquals(result.data.accountName, "Acme Corp");
    assertEquals(
      result.data.salesforceOpportunityUrl,
      "https://acme.my.salesforce.com/006",
    );
    assertEquals(result.data.memberUserIds, ["U1", "U2"]);
    assertEquals(result.data.contextNotes, "Kickoff next week");
  }
});

Deno.test("Reject invalid project name at creation — channel slug validation fails", () => {
  const result = parseCreateTesEventSubmission(buildValues({
    projectName: "   ",
    memberUserIds: ["U1"],
  }));

  assertEquals(result.valid, false);
  if (!result.valid) {
    assertEquals(result.errors.project_name, "Project name is required.");
  }
});

Deno.test("Reject invalid project name at creation — reserved slug fails", () => {
  const result = parseCreateTesEventSubmission(buildValues({
    projectName: "general",
    memberUserIds: ["U1"],
  }));

  assertEquals(result.valid, false);
  if (!result.valid) {
    assertEquals(result.errors.project_name?.includes("reserved"), true);
  }
});

Deno.test("Reject creation form with no members selected", () => {
  const result = parseCreateTesEventSubmission(buildValues({
    projectName: "Acme Demo",
    memberUserIds: [],
  }));

  assertEquals(result.valid, false);
  if (!result.valid) {
    assertEquals(result.errors.members, "Select at least one channel member.");
  }
});

