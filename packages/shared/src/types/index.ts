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
  customerName: string;
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

export interface DocumentInput {
  filename: string;
  mimeType: string;
  content: Uint8Array;
}

export interface ParsedDocument {
  filename: string;
  supported: boolean;
  text?: string;
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

