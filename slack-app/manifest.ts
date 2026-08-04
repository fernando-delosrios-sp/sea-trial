import { Manifest } from "@slack/deno-slack-sdk/mod.ts";
import ProvisionChannelFunction from "./functions/provision_channel/mod.ts";
import SeedChannelObjectsFunction from "./functions/seed_channel_objects/mod.ts";
import OpenOnboardingFunction from "./functions/open_onboarding/mod.ts";
import SubmitOnboardingFunction from "./functions/submit_onboarding/mod.ts";
import InvokeAgentFunction from "./functions/invoke_agent/mod.ts";
import AcceptProposalsFunction from "./functions/accept_proposals/mod.ts";
import HandleThreadReplyFunction from "./functions/handle_thread_reply/mod.ts";
import CreateTesEventWorkflow from "./workflows/create_tes_event.ts";

export default Manifest({
  name: "tes-event-process",
  description: "TES Slack event delivery platform",
  functions: [
    ProvisionChannelFunction,
    SeedChannelObjectsFunction,
    OpenOnboardingFunction,
    SubmitOnboardingFunction,
    InvokeAgentFunction,
    AcceptProposalsFunction,
    HandleThreadReplyFunction,
  ],
  workflows: [CreateTesEventWorkflow],
  outgoingDomains: ["localhost", "onrender.com"],
  botScopes: [
    "commands",
    "chat:write",
    "channels:manage",
    "channels:read",
    "files:read",
    "users:read",
    "canvases:read",
    "canvases:write",
    "lists:read",
    "lists:write",
  ],
});
