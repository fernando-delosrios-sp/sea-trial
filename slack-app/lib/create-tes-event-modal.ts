/**
 * Block IDs used by the "Create TES Event" modal, in display order. Mirrored
 * in `functions/open_create_tes_event/mod.ts` and asserted against here so
 * tests fail if the modal's fields ever drift.
 */
export const CREATE_TES_EVENT_MODAL_BLOCKS = [
  "project_name",
  "account",
  "salesforce_url",
  "members",
  "context_notes",
] as const;
