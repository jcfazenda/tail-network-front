export type JobStatus = 'ativas' | 'rascunhos' | 'pausadas' | 'encerradas';
export type WorkModel = 'Presencial' | 'Hibrido' | 'Remoto';
export type ContractType = 'CLT' | 'PJ' | 'Freelancer';
export type TalentJobDecision = 'applied' | 'hidden';
export interface RecruiterIdentity {
  id: string;
  name: string;
  role: string;
  company: string;
  isMaster: boolean;
}

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

export interface ExperienceStackCertificate {
  name: string;
  type: string;
  size: number;
  updatedAt: string;
}

export interface ExperienceStackItem {
  repoId?: string;
  name: string;
  knowledge: number;
  description: string;
  certificate?: ExperienceStackCertificate;
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
  companyLogoUrl?: string;
  homeAnnouncementImageUrl?: string;
  recruiterVideoUrl?: string;
  location: string;
  workModel: WorkModel;
  seniority: string;
  summary: string;
}

export interface MockJobDraft extends VagaPanelDraft {
  contractType: ContractType;
  statusReason?: string;
  salaryRange?: string;
  radarAdherenceThreshold?: number;
  showSalaryRangeInCard?: boolean;
  allowCandidateSalarySuggestion?: boolean;
  hybridOnsiteDaysDescription?: string;
  benefits: JobBenefitItem[];
  hiringDocuments: string[];
  techStack: TechStackItem[];
  experienceStacks?: ExperienceStackItem[];
  differentials: string[];
  responsibilitySections: JobResponsibilitySection[];
}

export interface MockJobCandidate {
  id?: string;
  name: string;
  role: string;
  location?: string;
  match: number;
  minutesAgo: number;
  status: 'online' | 'offline';
  avatar: string;
  stage?: CandidateStage;
  availabilityLabel?: string;
  radarOnly?: boolean;
  source?: 'seed' | 'system';
  hasProfileAvatar?: boolean;
  stageOwner?: 'system' | 'talent' | 'recruiter';
  recruiterManagedJourney?: boolean;
  recruiterStageCommittedAt?: string;
  stageTimeline?: Partial<Record<CandidateStage, string>>;
  decision?: TalentJobDecision;
  submittedDocuments?: string[];
  documentsConsentAccepted?: boolean;
  documentReviewStatuses?: Record<string, 'accepted' | 'rejected'>;
}

export interface MockJobRecord extends MockJobDraft {
  id: string;
  code?: string;
  createdByRecruiterId?: string;
  createdByRecruiterName?: string;
  createdByRecruiterRole?: string;
  recruiterWatcherIds?: string[];
  priority: string;
  match: number;
  talents: number;
  radarCount: number;
  ageLabel: string;
  postedLabel: string;
  avatars: string[];
  extraCount: number;
  recruiterBoardStatusId?: 'radar' | 'candidaturas' | 'processo' | 'solicitada' | 'contratados';
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
