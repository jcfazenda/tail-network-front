import { RecruiterIdentity } from '../vagas/data/vagas.models';

export type RecruiterViewScope = 'own' | 'following' | 'company';

export interface RecruiterRecord extends RecruiterIdentity {
  email: string;
  avatarUrl?: string;
  active: boolean;
  managedCompanies: string[];
  areas: string[];
  viewScope: RecruiterViewScope;
  canCreateJobs: boolean;
  canEditJobs: boolean;
  canAdvanceCandidates: boolean;
  canManageSubordinates: boolean;
  canViewTalentRadar: boolean;
  canExportData: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecruiterDraft {
  id?: string;
  name: string;
  email: string;
  role: string;
  company: string;
  isMaster: boolean;
  active: boolean;
  avatarUrl?: string;
  managedCompanies: string[];
  areas: string[];
  viewScope: RecruiterViewScope;
  canCreateJobs: boolean;
  canEditJobs: boolean;
  canAdvanceCandidates: boolean;
  canManageSubordinates: boolean;
  canViewTalentRadar: boolean;
  canExportData: boolean;
  notes?: string;
}
