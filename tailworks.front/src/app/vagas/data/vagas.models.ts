export type JobStatus = 'ativas' | 'rascunhos' | 'encerradas';
export type WorkModel = 'Presencial' | 'Hibrido' | 'Remoto';
export type ContractType = 'CLT' | 'PJ' | 'Freelancer';
export type CandidateStage =
  | 'radar'
  | 'aguardando'
  | 'processo'
  | 'tecnica'
  | 'documentacao'
  | 'candidatura'
  | 'cancelado';

export interface TechStackItem {
  name: string;
  match: number;
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
  salaryRange?: string;
  showSalaryRangeInCard?: boolean;
  hybridOnsiteDaysDescription?: string;
  benefits: string[];
  techStack: TechStackItem[];
  differentials: string[];
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
