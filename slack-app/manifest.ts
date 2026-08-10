import { Manifest } from "@slack/deno-slack-sdk/mod.ts";
import { loadSync } from "std/dotenv/mod.ts";
import ProvisionChannelFunction from "./functions/provision_channel/mod.ts";
import SeedChannelObjectsFunction from "./functions/seed_channel_objects/mod.ts";
import OpenOnboardingFunction from "./functions/open_onboarding/mod.ts";
import OpenCreateTesEventFunction from "./functions/open_create_tes_event/mod.ts";
import InvokeAgentFunction from "./functions/invoke_agent/mod.ts";
import AcceptProposalsFunction from "./functions/accept_proposals/mod.ts";
import HandleThreadReplyFunction from "./functions/handle_thread_reply/mod.ts";
import CreateTesEventWorkflow from "./workflows/create_tes_event.ts";
import { buildOutgoingDomains } from "./lib/outgoing-domains.ts";

loadSync({ export: true, allowEmptyValues: true });

export default Manifest({
  name: "Sea Trial",
  displayName: "Sea Trial",
  description: "TES before you sail.",
  longDescription:
    "Sea Trial provisions TES event channels, guides AE and SE onboarding, and shake-tests requirements with the Requirements Agent before the customer-facing voyage. Keeps canvases, deliverables, and review gates on course.",
  icon: "assets/icon.png",
  functions: [
    ProvisionChannelFunction,
    SeedChannelObjectsFunction,
    OpenOnboardingFunction,
    OpenCreateTesEventFunction,
    InvokeAgentFunction,
    AcceptProposalsFunction,
    HandleThreadReplyFunction,
  ],
  workflows: [CreateTesEventWorkflow],
  outgoingDomains: buildOutgoingDomains(
    Deno.env.get("AGENT_SERVICE_URL"),
    Deno.env.get("OTEL_EXPORTER_OTLP_ENDPOINT"),
  ),
  botScopes: [
    "commands",
    "chat:write",
    "channels:manage",
    "channels:read",
    "files:read",
    "files:write",
    "users:read",
    "canvases:read",
    "canvases:write",
    "lists:read",
    "lists:write",
  ],
});

