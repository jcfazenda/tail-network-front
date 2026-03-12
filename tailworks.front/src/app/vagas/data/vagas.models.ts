export type JobStatus = 'ativas' | 'rascunhos' | 'pausadas' | 'encerradas';
export type WorkModel = 'Presencial' | 'Hibrido' | 'Remoto';
export type ContractType = 'CLT' | 'PJ' | 'Freelancer';
export type TalentJobDecision = 'applied' | 'hidden';
export type CandidateStage =
  | 'radar'
  | 'aguardando'
  | 'processo'
  | 'tecnica'
  | 'documentacao'
  | 'candidatura'
  | 'aceito'
  | 'proxima'
  | 'contratado'
  | 'cancelado';

export interface TechStackItem {
  name: string;
  match: number;
}

export interface JobBenefitItem {
  title: string;
  sideLabel?: string;
  description?: string;
}

export type ResponsibilityPageId = 'front' | 'back';

export interface JobResponsibilitySection {
  id: string;
  pageId: ResponsibilityPageId;
  title: string;
  items: string[];
}

export interface VagaPanelDraft {
  title: string;
  company: string;
  location: string;
  workModel: WorkModel;
  seniority: string;
  summary: string;
}

export interface MockJobDraft extends VagaPanelDraft {
  contractType: ContractType;
  statusReason?: string;
  salaryRange?: string;
  showSalaryRangeInCard?: boolean;
  allowCandidateSalarySuggestion?: boolean;
  hybridOnsiteDaysDescription?: string;
  benefits: JobBenefitItem[];
  hiringDocuments: string[];
  techStack: TechStackItem[];
  differentials: string[];
  responsibilitySections: JobResponsibilitySection[];
}

export interface MockJobCandidate {
  name: string;
  role: string;
  match: number;
  minutesAgo: number;
  status: 'online' | 'offline';
  avatar: string;
  stage?: CandidateStage;
  availabilityLabel?: string;
  radarOnly?: boolean;
}

export interface MockJobRecord extends MockJobDraft {
  id: string;
  priority: string;
  match: number;
  talents: number;
  radarCount: number;
  ageLabel: string;
  postedLabel: string;
  avatars: string[];
  extraCount: number;
  status: JobStatus;
  talentDecision?: TalentJobDecision;
  talentSubmittedDocuments?: string[];
  talentDocumentsConsentAccepted?: boolean;
  candidates: MockJobCandidate[];
  createdAt: string;
  updatedAt: string;
}

export interface SaveMockJobCommand {
  draft: MockJobDraft;
  status: JobStatus;
  previewAderencia: number;
  previewAvatars: string[];
  previewAvatarExtraCount: number;
}
