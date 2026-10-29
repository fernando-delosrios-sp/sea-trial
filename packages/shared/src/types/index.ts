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
  /** Pinned Materials & Requirements Drop message timestamp where document uploads trigger the Requirements Agent. */
  materialsDropMessageTs?: string;
}

export interface DeliverableRow {
  taskId: string;
  requirement_ref?: string;
  assigneeId?: string;
  assigneeDisplay?: string;
  status: DeliverableStatus | string;
  situation: string;
  category: string;
  requirements: string;
  dueDate?: string;
  deliverableUrl?: string;
  openQuestions?: string;
}

export interface DeliverableProposal {
  taskId: string;
  requirement_ref?: string;
  category: string;
  requirements: string;
  sourceDocRef: string;
  similarityNotes?: string;
  suggestedStatus: DeliverableStatus;
  openQuestions?: string[];
  provenanceTag?: string;
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

/** Visual payload representing a rendered page or detected diagram/figure. */
export interface DocumentImagePayload {
  pageNumber?: number;
  dataBase64?: string;
  buffer?: Uint8Array;
  mimeType: string;
  description?: string;
}

/** Result of format extraction in agent-service parsers. */
export interface ParsedDocument {
  filename: string;
  mimeType: string;
  text: string;
  images?: DocumentImagePayload[];
  supported: boolean;
  error?: string;
}

export type RequirementsProposalGateAction = "accept" | "edit" | "reject";

export interface RequirementsProposal {
  summary: string;
  diffMarkdown?: string;
  sourceFiles: string[];
  candidateDeliverables: DeliverableProposal[];
  proposedCanvasMarkdown: string;
  supersededRequirementRefs?: string[];
}

export interface ProcessRequirementsRequest {
  context: TesEventContext;
  requirementsCanvasMarkdown: string;
  existingDeliverables: DeliverableProposal[];
  documents: DocumentInput[];
  threadHistory?: string;
  feedback?: string;
  priorProposal?: RequirementsProposal;
}

export interface ProcessRequirementsResponse {
  canvasMarkdown: string;
  proposals: DeliverableProposal[];
  proposal?: RequirementsProposal;
  agentMessage: string;
  needsClarification: boolean;
  clarificationQuestions?: string[];
}

export interface DeliveryConsolidationRequest {
  context: TesEventContext;
  row: DeliverableRow;
  canvasMarkdown?: string;
}

export interface DeliveryConsolidationResponse {
  canvasMarkdown: string;
  draftVersion: number;
}

export interface DeliveryProofBlock {
  customerSummary: string;
  visualProofUrl?: string;
  components?: string[];
  externalTechnologies?: string[];
  artefactsAndConfig?: string;
}

export interface VerificationRequest {
  context: TesEventContext;
  deliverable: DeliverableRow;
  requirementRef?: string;
  proofInputs: {
    visualProofUrl?: string;
    notes?: string;
    configuration?: string;
    components?: string[];
    externalTechnologies?: string[];
  };
  requirementsCanvasMarkdown?: string;
}

export interface VerificationResponse {
  proofBlockMarkdown: string;
  proof: DeliveryProofBlock;
  updatedRequirementsCanvasMarkdown?: string;
  status?: string;
}

