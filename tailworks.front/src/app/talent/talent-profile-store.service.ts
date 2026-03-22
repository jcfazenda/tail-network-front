import { Injectable, inject } from '@angular/core';
import { BrowserStorageService } from '../core/storage/browser-storage.service';
import { TalentProfileSyncApiService } from './talent-profile-sync-api.service';
import { MatchLabCandidate } from '../core/matching-lab/matching-lab.models';

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
    repoId?: string;
    name: string;
    knowledge: number;
    description: string;
    certificate?: {
      name: string;
      type: string;
      size: number;
      updatedAt: string;
    };
  }>;
};

export type SeededTalentProfile = {
  email: string;
  basicDraft: SeededCandidateBasicDraft;
  formationCopy?: {
    graduation: string;
    specialization: string;
    startMonth?: string;
    startYear?: string;
    endMonth?: string;
    endYear?: string;
    graduated?: boolean;
    educationStatus?: string;
  };
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
  private readonly syncApi = inject(TalentProfileSyncApiService);

  listProfiles(): SeededTalentProfile[] {
    return this.browserStorage.readJson<SeededTalentProfile[]>(TalentProfileStoreService.storageKey) ?? [];
  }

  async syncFromRemote(): Promise<SeededTalentProfile[]> {
    const remote = await this.syncApi.readAll();
    if (!remote?.length) {
      return this.listProfiles();
    }

    const merged = this.mergeProfiles(this.listProfiles(), remote);
    this.browserStorage.writeJson(TalentProfileStoreService.storageKey, merged);
    return merged;
  }

  async upsertProfiles(profiles: SeededTalentProfile[]): Promise<number> {
    const existing = this.listProfiles();
    const next = this.mergeProfiles(existing, profiles);
    this.browserStorage.writeJson(TalentProfileStoreService.storageKey, next);
    void this.syncApi.writeAll(next);
    return next.length;
  }

  async restoreProfileToCurrentWorkspace(email: string): Promise<boolean> {
    await this.syncFromRemote();
    const profile = this.listProfiles().find((item) => item.email.toLocaleLowerCase('pt-BR') === email.toLocaleLowerCase('pt-BR'));
    if (!profile) {
      return false;
    }

    this.browserStorage.writeJson(TalentProfileStoreService.basicDraftStorageKey, profile.basicDraft);
    if (profile.formationCopy) {
      this.browserStorage.writeJson('tailworks:candidate-experience-formation-copy:v1', profile.formationCopy);
    }
    this.browserStorage.writeJson(TalentProfileStoreService.stacksDraftStorageKey, profile.stacksDraft);
    this.browserStorage.writeJson(TalentProfileStoreService.experiencesDraftStorageKey, profile.experiencesDraft);
    this.browserStorage.writeJson(TalentProfileStoreService.ecosystemVisibilityStorageKey, true);
    this.browserStorage.writeJson(TalentProfileStoreService.candidacyAvailabilityStorageKey, true);
    return true;
  }

  async syncCurrentWorkspace(email: string): Promise<boolean> {
    if (!email.trim()) {
      return false;
    }

    const basicDraft = this.browserStorage.readJson<SeededCandidateBasicDraft>(TalentProfileStoreService.basicDraftStorageKey);
    const formationCopy = this.browserStorage.readJson<SeededTalentProfile['formationCopy']>('tailworks:candidate-experience-formation-copy:v1');
    const experiencesDraft = this.browserStorage.readJson<SeededExperienceDraft[]>(TalentProfileStoreService.experiencesDraftStorageKey);
    const storedStacksDraft = this.browserStorage.readJson<SeededStacksDraft>(TalentProfileStoreService.stacksDraftStorageKey);

    if (!basicDraft || !experiencesDraft) {
      return false;
    }

    const stacksDraft = this.deriveStacksDraftFromExperiences(experiencesDraft, storedStacksDraft);
    this.browserStorage.writeJson(TalentProfileStoreService.stacksDraftStorageKey, stacksDraft);

    await this.upsertProfiles([{
      email,
      basicDraft,
      formationCopy: formationCopy ?? undefined,
      stacksDraft,
      experiencesDraft,
    }]);
    return true;
  }

  listMatchCandidates(): MatchLabCandidate[] {
    return this.listProfiles().map((profile, index) => ({
      id: `seeded-${index + 1}`,
      name: profile.basicDraft.profile?.name?.trim() || `Talento ${index + 1}`,
      location: profile.basicDraft.profile?.location?.trim() || 'Brasil',
      seniority: this.resolveSeniority(profile.experiencesDraft),
      summary: this.buildCandidateSummary(profile),
      stacks: this.toMatchStacks(profile),
      experiences: profile.experiencesDraft.map((experience) => ({
        id: experience.id,
        company: experience.company,
        role: experience.role,
        start: `${experience.startYear}-${this.monthNumber(experience.startMonth)}-01`,
        end: experience.currentlyWorkingHere ? undefined : `${experience.endYear}-${this.monthNumber(experience.endMonth)}-01`,
        stackIds: experience.appliedStacks.flatMap((stack) =>
          stack.repoId?.trim()
            ? [this.toLabStackId(stack.repoId)]
            : this.toLabStackIdsFromName(stack.name),
        ),
        summary: experience.responsibilities,
      })),
    }));
  }

  findProfileByName(name: string): SeededTalentProfile | null {
    const normalizedName = name.trim().toLocaleLowerCase('pt-BR');
    return this.listProfiles().find((profile) =>
      profile.basicDraft.profile?.name?.trim().toLocaleLowerCase('pt-BR') === normalizedName,
    ) ?? null;
  }

  private buildCandidateSummary(profile: SeededTalentProfile): string {
    const latestExperience = profile.experiencesDraft[0];
    if (!latestExperience) {
      return 'Talento disponível no radar.';
    }

    return [latestExperience.role?.trim(), latestExperience.company?.trim()]
      .filter(Boolean)
      .join(' • ') || 'Talento disponível no radar.';
  }

  private toMatchStacks(profile: SeededTalentProfile): MatchLabCandidate['stacks'] {
    const byStackId = new Map<string, MatchLabCandidate['stacks'][number]>();

    for (const stack of [...(profile.stacksDraft.primary ?? []), ...(profile.stacksDraft.extra ?? [])]) {
      const stackId = this.toLabStackId(stack.id);
      const existing = byStackId.get(stackId);
      if (!existing || stack.knowledge > existing.percent) {
        byStackId.set(stackId, {
          stackId,
          stackName: stack.name,
          percent: stack.knowledge,
          band: 'support',
        });
      }
    }

    return Array.from(byStackId.values()).sort((left, right) => right.percent - left.percent);
  }

  private deriveStacksDraftFromExperiences(
    experiencesDraft: SeededExperienceDraft[],
    fallback: SeededStacksDraft | null,
  ): SeededStacksDraft {
    const grouped = new Map<string, {
      totalWeight: number;
      weightedScore: number;
      certificateBoost: number;
      sample: SeededExperienceDraft['appliedStacks'][number];
    }>();

    for (const experience of experiencesDraft) {
      const weight = this.getExperienceWeight(experience);
      for (const stack of experience.appliedStacks ?? []) {
        const repoId = stack.repoId?.trim() || this.toRepoId(stack.name);
        const current = grouped.get(repoId) ?? {
          totalWeight: 0,
          weightedScore: 0,
          certificateBoost: 0,
          sample: stack,
        };
        const knowledge = Math.max(0, Math.min(100, Math.round(Number(stack.knowledge ?? 0))));
        current.totalWeight += weight;
        current.weightedScore += knowledge * weight;
        if (stack.certificate?.name?.trim()) {
          current.certificateBoost = Math.max(current.certificateBoost, 4);
        }
        current.sample = stack;
        grouped.set(repoId, current);
      }
    }

    if (!grouped.size) {
      return fallback ?? { primary: [], extra: [] };
    }

    const aggregated = Array.from(grouped.entries())
      .map(([repoId, value]) =>
        this.toSeededStackChip(
          repoId,
          value.sample.name,
          Math.min(100, Math.round((value.weightedScore / Math.max(value.totalWeight, 1)) + value.certificateBoost)),
        ),
      )
      .sort((left, right) => right.knowledge - left.knowledge);

    return {
      primary: aggregated.slice(0, 6),
      extra: aggregated.slice(6, 14),
    };
  }

  clear(): void {
    this.browserStorage.removeItem(TalentProfileStoreService.storageKey);
    this.browserStorage.removeItem(TalentProfileStoreService.basicDraftStorageKey);
    this.browserStorage.removeItem(TalentProfileStoreService.stacksDraftStorageKey);
    this.browserStorage.removeItem(TalentProfileStoreService.experiencesDraftStorageKey);
    this.browserStorage.removeItem(TalentProfileStoreService.ecosystemVisibilityStorageKey);
    this.browserStorage.removeItem(TalentProfileStoreService.candidacyAvailabilityStorageKey);
    void this.syncApi.writeAll([]);
  }

  private mergeProfiles(existing: SeededTalentProfile[], incoming: SeededTalentProfile[]): SeededTalentProfile[] {
    const byEmail = new Map(existing.map((profile) => [profile.email.toLocaleLowerCase('pt-BR'), profile]));

    for (const profile of incoming) {
      byEmail.set(profile.email.toLocaleLowerCase('pt-BR'), profile);
    }

    return Array.from(byEmail.values());
  }

  private resolveSeniority(experiences: SeededExperienceDraft[]): MatchLabCandidate['seniority'] {
    const levels = experiences.map((experience) => experience.positionLevel);
    if (levels.includes('Tech Lead')) {
      return 'Especialista';
    }
    if (levels.includes('Sênior')) {
      return 'Senior';
    }
    if (levels.includes('Pleno')) {
      return 'Pleno';
    }
    return 'Junior';
  }

  private monthNumber(label: string): string {
    const map: Record<string, string> = {
      Jan: '01', Fev: '02', Mar: '03', Abr: '04', Mai: '05', Jun: '06',
      Jul: '07', Ago: '08', Set: '09', Out: '10', Nov: '11', Dez: '12', Atual: '03',
    };
    return map[label] ?? '01';
  }

  private toLabStackId(repoId: string): string {
    const normalized = repoId.replace(/^repo:/, '');
    const map: Record<string, string> = {
      dotnet: 'dotnet',
      csharp: 'dotnet',
      'aspnet-core': 'dotnet',
      'entity-framework': 'dotnet',
      'rest-api': 'dotnet',
      microservices: 'dotnet',
      rabbitmq: 'dotnet',
      kafka: 'java',
      angular: 'angular',
      react: 'react',
      vue: 'react',
      nextjs: 'react',
      typescript: 'typescript',
      javascript: 'typescript',
      html: 'typescript',
      css: 'typescript',
      flutter: 'flutter',
      'react-native': 'react-native',
      kotlin: 'react-native',
      swift: 'react-native',
      android: 'react-native',
      ios: 'react-native',
      aws: 'aws',
      cloudwatch: 'aws',
      serverless: 'aws',
      azure: 'azure',
      gcp: 'gcp',
      docker: 'docker',
      terraform: 'docker',
      'github-actions': 'docker',
      'gitlab-ci': 'docker',
      linux: 'docker',
      nginx: 'docker',
      kubernetes: 'kubernetes',
      security: 'security',
      ux: 'ux',
      figma: 'figma',
      'sql-server': 'data',
      postgresql: 'data',
      mysql: 'data',
      mongodb: 'data',
      redis: 'data',
      elasticsearch: 'data',
      python: 'python',
      java: 'java',
      nodejs: 'node',
      'qa-automation': 'qa',
      'python-ml': 'ml',
    };
    return map[normalized] ?? normalized;
  }

  private toLabStackIdsFromName(stackName: string): string[] {
    const normalized = stackName.toLocaleLowerCase('pt-BR');
    const ids = new Set<string>();

    if (normalized.includes('.net') || normalized.includes('c#') || normalized.includes('asp.net') || normalized.includes('entity framework') || normalized.includes('rest')) ids.add('dotnet');
    if (normalized.includes('java') || normalized.includes('spring') || normalized.includes('kafka')) ids.add('java');
    if (normalized.includes('node')) ids.add('node');
    if (normalized.includes('angular')) ids.add('angular');
    if (normalized.includes('react native')) ids.add('react-native');
    if (normalized.includes('react') || normalized.includes('next.js') || normalized.includes('nextjs') || normalized.includes('vue')) ids.add('react');
    if (normalized.includes('typescript') || normalized.includes('javascript') || normalized.includes('html') || normalized.includes('css')) ids.add('typescript');
    if (normalized.includes('flutter') || normalized.includes('android') || normalized.includes('ios') || normalized.includes('swift') || normalized.includes('kotlin')) ids.add('flutter');
    if (normalized.includes('python')) ids.add('python');
    if (normalized.includes('machine learning') || normalized.includes('ia') || normalized.includes('ml')) ids.add('ml');
    if (normalized.includes('sql') || normalized.includes('postgres') || normalized.includes('mysql') || normalized.includes('mongo') || normalized.includes('redis') || normalized.includes('elastic')) ids.add('data');
    if (normalized.includes('aws') || normalized.includes('cloudwatch') || normalized.includes('serverless')) ids.add('aws');
    if (normalized.includes('azure')) ids.add('azure');
    if (normalized.includes('google cloud') || normalized.includes('gcp')) ids.add('gcp');
    if (normalized.includes('docker') || normalized.includes('terraform') || normalized.includes('linux') || normalized.includes('nginx') || normalized.includes('github actions') || normalized.includes('gitlab')) ids.add('docker');
    if (normalized.includes('kubernetes')) ids.add('kubernetes');
    if (normalized.includes('segurança') || normalized.includes('security')) ids.add('security');
    if (normalized.includes('ux') || normalized.includes('ui')) ids.add('ux');
    if (normalized.includes('figma')) ids.add('figma');
    if (normalized.includes('qa')) ids.add('qa');

    if (!ids.size) {
      ids.add(this.toLabStackId(this.toRepoId(stackName)));
    }

    return Array.from(ids);
  }

  private toSeededStackChip(repoId: string, stackName: string, knowledge: number): SeededStackChip {
    const normalized = repoId.replace(/^repo:/, '');
    return {
      id: repoId,
      name: this.normalizeSeededStackName(repoId, stackName),
      short: this.normalizeSeededStackName(repoId, stackName).slice(0, 14),
      tone: this.resolveTone(normalized),
      category: this.resolveCategory(normalized),
      knowledge,
      description: `Média calculada automaticamente a partir das experiências do candidato.`,
    };
  }

  private normalizeSeededStackName(repoId: string, fallbackName: string): string {
    const map: Record<string, string> = {
      'repo:dotnet': '.NET / C#',
      'repo:csharp': '.NET / C#',
      'repo:aspnet-core': '.NET / C#',
      'repo:entity-framework': '.NET / C#',
      'repo:rest-api': '.NET / C#',
      'repo:sql-server': 'SQL',
      'repo:postgresql': 'SQL',
      'repo:mysql': 'SQL',
      'repo:mongodb': 'SQL',
      'repo:redis': 'SQL',
      'repo:elasticsearch': 'SQL',
    };
    return map[repoId] ?? fallbackName.trim();
  }

  private resolveTone(stackId: string): SeededStackChip['tone'] {
    if (['aws', 'azure', 'gcp'].includes(stackId)) {
      return 'azure';
    }
    if (['angular', 'react', 'typescript'].includes(stackId)) {
      return 'orange';
    }
    if (['dotnet', 'java', 'nodejs', 'python', 'sql-server', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch'].includes(stackId)) {
      return 'gold';
    }
    return 'neutral';
  }

  private getExperienceWeight(experience: SeededExperienceDraft): number {
    const months = this.getExperienceMonths(experience);
    const actuation = Math.max(10, Math.min(100, Number(experience.actuation ?? 70)));
    return months * (actuation / 100);
  }

  private getExperienceMonths(experience: SeededExperienceDraft): number {
    const start = this.toComparableMonth(experience.startYear, experience.startMonth);
    const end = experience.currentlyWorkingHere
      ? this.toComparableMonth('2026', 'Mar')
      : this.toComparableMonth(experience.endYear, experience.endMonth);

    if (!start || !end) {
      return 1;
    }

    return Math.max(1, end - start + 1);
  }

  private toComparableMonth(year?: string, month?: string): number {
    const monthMap: Record<string, number> = {
      Jan: 1, Fev: 2, Mar: 3, Abr: 4, Mai: 5, Jun: 6,
      Jul: 7, Ago: 8, Set: 9, Out: 10, Nov: 11, Dez: 12,
    };
    const parsedYear = Number(year ?? '');
    const parsedMonth = month ? monthMap[month] : 0;
    if (!Number.isFinite(parsedYear) || !parsedMonth) {
      return 0;
    }
    return (parsedYear * 12) + parsedMonth;
  }

  private resolveCategory(stackId: string): SeededStackChip['category'] {
    if (['dotnet', 'java', 'nodejs'].includes(stackId)) {
      return 'backend';
    }
    if (['angular', 'react', 'typescript'].includes(stackId)) {
      return 'frontend';
    }
    if (['sql-server', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch'].includes(stackId)) {
      return 'database';
    }
    if (['aws', 'azure', 'gcp'].includes(stackId)) {
      return 'cloud';
    }
    if (['docker', 'kubernetes', 'terraform', 'github-actions', 'gitlab-ci', 'linux', 'nginx'].includes(stackId)) {
      return 'devops';
    }
    if (['flutter', 'react-native', 'android', 'ios', 'swift', 'kotlin'].includes(stackId)) {
      return 'mobile';
    }
    if (['python', 'python-ml'].includes(stackId)) {
      return 'data';
    }
    return 'other';
  }

  private toRepoId(stackName: string): string {
    const normalized = stackName.toLocaleLowerCase('pt-BR');
    if (normalized.includes('.net')) return 'repo:dotnet';
    if (normalized.includes('angular')) return 'repo:angular';
    if (normalized.includes('react native')) return 'repo:react-native';
    if (normalized.includes('react')) return 'repo:react';
    if (normalized.includes('typescript')) return 'repo:typescript';
    if (normalized.includes('flutter')) return 'repo:flutter';
    if (normalized.includes('aws')) return 'repo:aws';
    if (normalized.includes('azure')) return 'repo:azure';
    if (normalized.includes('google cloud') || normalized.includes('gcp')) return 'repo:gcp';
    if (normalized.includes('docker')) return 'repo:docker';
    if (normalized.includes('kubernetes')) return 'repo:kubernetes';
    if (normalized.includes('segurança')) return 'repo:security';
    if (normalized.includes('figma')) return 'repo:figma';
    if (normalized.includes('sql')) return 'repo:sql-server';
    if (normalized.includes('python')) return 'repo:python';
    if (normalized.includes('java')) return 'repo:java';
    if (normalized.includes('node')) return 'repo:nodejs';
    if (normalized.includes('qa')) return 'repo:qa-automation';
    return `repo:${normalized.replace(/\s+/g, '-')}`;
  }
}
