export interface CompanyRecord {
  id: string;
  name: string;
  sector: string;
  location: string;
  description: string;
  followers: string;
  linkedinCount: string;
  logoLabel: string;
  logoUrl?: string;
  website?: string;
  emailDomain?: string;
  monthlyHiringCount: number;
  active: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyDraft {
  id?: string;
  name: string;
  sector: string;
  location: string;
  description: string;
  followers: string;
  linkedinCount: string;
  logoLabel: string;
  logoUrl?: string;
  website?: string;
  emailDomain?: string;
  monthlyHiringCount: number;
  active: boolean;
  notes?: string;
}
