import { TechStackItem } from '../../vagas/data/vagas.models';

export type MatchScoreBreakdown = {
  overallScore: number;
  stackScore: number;
  experienceScore: number;
  matchedRepoIds: string[];
  missingRepoIds: string[];
};

export type MatchExperienceSignal = {
  role?: string;
  positionLevel?: string;
  companySegment?: string;
  appliedStacks?: string[];
  appliedRepoIds?: string[];
  months?: number;
  actuation?: number;
};

export type MatchTalentProfile = {
  stackScores: Record<string, number>;
  experiences?: MatchExperienceSignal[];
};

export type MatchJobProfile = {
  requiredRepoIds: string[];
  desiredSeniority?: string;
  responsibilityKeywords?: string[];
  techStack: TechStackItem[];
};
