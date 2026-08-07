import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { CREATE_TES_EVENT_MODAL_BLOCKS } from "../lib/create-tes-event-modal.ts";

Deno.test("Open create TES event modal — has all required field block IDs", () => {
  assertEquals(CREATE_TES_EVENT_MODAL_BLOCKS.length, 5);
  assertEquals(CREATE_TES_EVENT_MODAL_BLOCKS.includes("project_name"), true);
  assertEquals(CREATE_TES_EVENT_MODAL_BLOCKS.includes("account"), true);
  assertEquals(CREATE_TES_EVENT_MODAL_BLOCKS.includes("salesforce_url"), true);
  assertEquals(CREATE_TES_EVENT_MODAL_BLOCKS.includes("members"), true);
  assertEquals(CREATE_TES_EVENT_MODAL_BLOCKS.includes("context_notes"), true);
});
