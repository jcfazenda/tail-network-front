import { Injectable, inject } from '@angular/core';
import { BrowserStorageService } from '../core/storage/browser-storage.service';

export type SeededCandidateBasicDraft = {
  profile?: {
    name?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
    state?: string;
    city?: string;
    location?: string;
    portfolio?: string;
    formation?: string;
  };
  photoPreviewUrl?: string;
  photoFileName?: string;
};

export type SeededStackChip = {
  id: string;
  name: string;
  short: string;
  tone: 'gold' | 'slate' | 'azure' | 'orange' | 'neutral';
  category: 'frontend' | 'backend' | 'database' | 'devops' | 'cloud' | 'mobile' | 'data' | 'other';
  knowledge: number;
  description: string;
};

export type SeededStacksDraft = {
  primary: SeededStackChip[];
  extra: SeededStackChip[];
};

export type SeededExperienceDraft = {
  id: string;
  company: string;
  role: string;
  workModel: 'Presencial' | 'Híbrido' | 'Remoto';
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  currentlyWorkingHere: boolean;
  responsibilities: string;
  positionLevel: 'Júnior' | 'Pleno' | 'Sênior' | 'Tech Lead';
  companySize: 'Startup' | 'Média' | 'Grande';
  companySegment: string;
  sector: string;
  actuation: number;
  appliedStacks: Array<{
    name: string;
    knowledge: number;
    description: string;
  }>;
};

export type SeededTalentProfile = {
  email: string;
  basicDraft: SeededCandidateBasicDraft;
  stacksDraft: SeededStacksDraft;
  experiencesDraft: SeededExperienceDraft[];
};

@Injectable({ providedIn: 'root' })
export class TalentProfileStoreService {
  private static readonly storageKey = 'tailworks:seeded-talent-profiles:v1';
  private static readonly basicDraftStorageKey = 'tailworks:candidate-basic-draft:v1';
  private static readonly stacksDraftStorageKey = 'tailworks:candidate-stacks-draft:v5';
  private static readonly experiencesDraftStorageKey = 'tailworks:candidate-experiences-draft:v1';
  private static readonly ecosystemVisibilityStorageKey = 'tailworks:candidate-experience-ecosystem-visibility:v1';
  private static readonly candidacyAvailabilityStorageKey = 'tailworks:candidate-experience-candidacy-availability:v1';

  private readonly browserStorage = inject(BrowserStorageService);

  listProfiles(): SeededTalentProfile[] {
    return this.browserStorage.readJson<SeededTalentProfile[]>(TalentProfileStoreService.storageKey) ?? [];
  }

  upsertProfiles(profiles: SeededTalentProfile[]): number {
    const existing = this.listProfiles();
    const byEmail = new Map(existing.map((profile) => [profile.email.toLocaleLowerCase('pt-BR'), profile]));

    for (const profile of profiles) {
      byEmail.set(profile.email.toLocaleLowerCase('pt-BR'), profile);
    }

    const next = Array.from(byEmail.values());
    this.browserStorage.writeJson(TalentProfileStoreService.storageKey, next);
    return next.length;
  }

  restoreProfileToCurrentWorkspace(email: string): boolean {
    const profile = this.listProfiles().find((item) => item.email.toLocaleLowerCase('pt-BR') === email.toLocaleLowerCase('pt-BR'));
    if (!profile) {
      return false;
    }

    this.browserStorage.writeJson(TalentProfileStoreService.basicDraftStorageKey, profile.basicDraft);
    this.browserStorage.writeJson(TalentProfileStoreService.stacksDraftStorageKey, profile.stacksDraft);
    this.browserStorage.writeJson(TalentProfileStoreService.experiencesDraftStorageKey, profile.experiencesDraft);
    this.browserStorage.writeJson(TalentProfileStoreService.ecosystemVisibilityStorageKey, true);
    this.browserStorage.writeJson(TalentProfileStoreService.candidacyAvailabilityStorageKey, true);
    return true;
  }

  clear(): void {
    this.browserStorage.removeItem(TalentProfileStoreService.storageKey);
    this.browserStorage.removeItem(TalentProfileStoreService.basicDraftStorageKey);
    this.browserStorage.removeItem(TalentProfileStoreService.stacksDraftStorageKey);
    this.browserStorage.removeItem(TalentProfileStoreService.experiencesDraftStorageKey);
    this.browserStorage.removeItem(TalentProfileStoreService.ecosystemVisibilityStorageKey);
    this.browserStorage.removeItem(TalentProfileStoreService.candidacyAvailabilityStorageKey);
  }
}
