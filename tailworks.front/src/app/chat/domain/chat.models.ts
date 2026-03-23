export interface ChatCandidate {
  id?: string;
  name: string;
  role: string;
  location?: string;
  match: number;
  minutesAgo: number;
  status: 'online' | 'offline';
  avatar: string;
  stack?: string;
  lastMessage?: string;
  time?: string;
  stage?: string;
  availabilityLabel?: string;
  radarOnly?: boolean;
  source?: 'seed' | 'system';
  stageOwner?: 'system' | 'talent' | 'recruiter';
  recruiterManagedJourney?: boolean;
  recruiterStageCommittedAt?: string;
  decision?: 'applied' | 'hidden';
  submittedDocuments?: string[];
  documentsConsentAccepted?: boolean;
}

export interface ChatTechStackItem {
  name: string;
  match: number;
}

export interface ChatJob {
  id: string;
  title: string;
  company: string;
  location: string;
  workModel?: string;
  techStack: ChatTechStackItem[];
  candidates: ChatCandidate[];
  hiringDocuments?: string[];
  talentSubmittedDocuments?: string[];
  talentDocumentsConsentAccepted?: boolean;
}
