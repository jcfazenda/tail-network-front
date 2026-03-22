export type MatchLabWorkModel = 'Remoto' | 'Hibrido' | 'Presencial';
export type MatchLabSeniority = 'Junior' | 'Pleno' | 'Senior' | 'Especialista';
export type MatchLabStackBand = 'primary' | 'secondary' | 'support';

export interface MatchLabStackWeight {
  stackId: string;
  stackName: string;
  percent: number;
  band: MatchLabStackBand;
}

export interface MatchLabJobSeed {
  id: string;
  code: string;
  title: string;
  company: string;
  location: string;
  workModel: MatchLabWorkModel;
  seniority: MatchLabSeniority;
  salaryMin?: number;
  salaryMax?: number;
  summary: string;
  stackWeights: Record<string, number>;
}

export interface MatchLabJob {
  id: string;
  code: string;
  title: string;
  company: string;
  location: string;
  workModel: MatchLabWorkModel;
  seniority: MatchLabSeniority;
  salaryMin?: number;
  salaryMax?: number;
  summary: string;
  stacks: MatchLabStackWeight[];
  topStacks: MatchLabStackWeight[];
  secondaryStacks: MatchLabStackWeight[];
}

export interface MatchLabCandidateExperience {
  id: string;
  company: string;
  role: string;
  start: string;
  end?: string;
  stackIds: string[];
  summary: string;
}

export interface MatchLabCandidateSeed {
  id: string;
  name: string;
  location: string;
  seniority: MatchLabSeniority;
  summary: string;
  stackWeights: Record<string, number>;
  experiences: MatchLabCandidateExperience[];
}

export interface MatchLabCandidate {
  id: string;
  name: string;
  location: string;
  seniority: MatchLabSeniority;
  summary: string;
  stacks: MatchLabStackWeight[];
  experiences: MatchLabCandidateExperience[];
}

export interface MatchLabStackContribution {
  stackId: string;
  stackName: string;
  vacancyPercent: number;
  candidatePercent: number;
  candidateExperienceMonths: number;
  band: MatchLabStackBand;
  stackScore: number;
  experienceScore: number;
  weightedContribution: number;
}

export interface MatchLabScoreDebug {
  primaryScore: number;
  secondaryScore: number;
  experienceScore: number;
  seniorityScore: number;
  coherenceScore: number;
  totalScore: number;
  reasons: string[];
  stackBreakdown: MatchLabStackContribution[];
}

export interface MatchLabRankingEntry {
  jobId: string;
  candidateId: string;
  score: number;
  debug: MatchLabScoreDebug;
  candidate: MatchLabCandidate;
}

export interface MatchLabJobResult {
  job: MatchLabJob;
  ranking: MatchLabRankingEntry[];
}

export interface MatchLabDataset {
  jobs: MatchLabJob[];
  candidates: MatchLabCandidate[];
  results: MatchLabJobResult[];
}
