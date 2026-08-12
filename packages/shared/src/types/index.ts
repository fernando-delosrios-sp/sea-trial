export type DeliverableStatus =
  | "Not started"
  | "Not needed"
  | "Not doable"
  | "In progress"
  | "Blocked"
  | "Validation required"
  | "Accepted"
  | "Needs clarification";

export interface OnboardingForm {
  accountName: string;
  mainProspectGoal: string;
  dealHistory: string;
  projectType: string;
  stakeholders: string;
  competitors: string;
  sailpointSuite: string;
  deadline: string;
  notes: string;
}

export interface TesEventContext {
  channelId: string;
  projectName: string;
  onboardingComplete: boolean;
  onboarding?: OnboardingForm;
  derivedComponents: string[];
  dashboardCanvasId: string;
  requirementsCanvasId: string;
  deliverablesListId: string;
  incidentsListId: string;
  infrastructureCanvasId: string;
  /** Customer-facing Situation Report canvas provisioned per TES event channel. Absent on channels created before this feature. */
  situationReportCanvasId?: string;
  /** Account name captured at creation time; pre-fills and can be overwritten during onboarding. */
  accountName?: string;
  salesforceOpportunityUrl?: string;
  memberUserIds?: string[];
  contextNotes?: string;
  /** Channel composition type (e.g. tes-event) when seeded via composition manifest. */
  channelType?: string;
  /** Version of the composition manifest used at channel create. */
  compositionVersion?: string;
}

export interface DeliverableProposal {
  taskId: string;
  category: string;
  requirements: string;
  sourceDocRef: string;
  similarityNotes?: string;
  suggestedStatus: DeliverableStatus;
  openQuestions?: string[];
}

/** Raw file bytes for HTTP transport (base64-encoded in JSON). */
export interface FilePayload {
  filename: string;
  mimeType: string;
  contentBase64: string;
}

/** Internal representation after decoding transport payload. */
export interface DocumentInput {
  filename: string;
  mimeType: string;
  content: Uint8Array;
}

/** Result of format extraction in agent-service parsers. */
export interface ParsedDocument {
  filename: string;
  mimeType: string;
  text: string;
  supported: boolean;
  error?: string;
}

export interface ProcessRequirementsRequest {
  context: TesEventContext;
  requirementsCanvasMarkdown: string;
  existingDeliverables: DeliverableProposal[];
  documents: DocumentInput[];
  threadHistory?: string;
}

export interface ProcessRequirementsResponse {
  canvasMarkdown: string;
  proposals: DeliverableProposal[];
  agentMessage: string;
  needsClarification: boolean;
  clarificationQuestions?: string[];
}

export interface DeliveryConsolidationRequest {
  context: TesEventContext;
  row: {
    taskId: string;
    assigneeId?: string;
    assigneeDisplay?: string;
    status: DeliverableStatus | string;
    situation: string;
    category: string;
    requirements: string;
    openQuestions?: string;
  };
  canvasMarkdown?: string;
}

export interface DeliveryConsolidationResponse {
  canvasMarkdown: string;
  draftVersion: number;
}

